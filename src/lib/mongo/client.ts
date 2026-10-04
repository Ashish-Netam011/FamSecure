/**
 * Minimal MongoDB wire-protocol client (OP_MSG) with SCRAM auth.
 *
 * Implements just enough of the MongoDB protocol for reliable Atlas use:
 * - TLS via node:tls (works with mongodb+srv Atlas endpoints)
 * - SRV record discovery + TXT option discovery
 * - Handshake first: hello with client metadata + saslSupportedMechs
 * - SCRAM-SHA-256 AND SCRAM-SHA-1 (mechanism negotiated from the server;
 *   SHA-1 uses MongoDB's legacy md5(user:mongo:pass) pre-hash)
 * - Primary selection: iterates hosts until one reports isWritablePrimary
 * - Automatic reconnect with exponential backoff
 * - Requests fail fast on connection loss; the persistence layer above
 *   queues writes until connectivity returns.
 */

import tls from 'node:tls';
import crypto from 'node:crypto';
import dns from 'node:dns';
import { bsonSerialize, bsonDeserialize } from './bson';

/* ─────────────────────────── Connection URI parsing ─────────────────────────── */

export interface MongoUriParts {
  scheme: 'mongodb' | 'mongodb+srv';
  username: string;
  password: string;
  hosts: string[];
  database: string;
  authSource: string;
  options: Record<string, string>;
}

export function parseMongoUri(uri: string): MongoUriParts {
  const match = uri.match(
    /^(mongodb(?:\+srv):\/\/)([^:@]+):([^@]+)@([^/?]+)(?:\/([^?]*))?(?:\?(.*))?$/,
  );
  if (!match) throw new Error('Invalid MongoDB URI format');
  const [, schemeRaw, username, password, hostStr, database = '', query = ''] = match;
  const scheme = schemeRaw.replace('://', '') as 'mongodb' | 'mongodb+srv';
  const options: Record<string, string> = {};
  for (const kv of query.split('&')) {
    if (!kv) continue;
    const eq = kv.indexOf('=');
    if (eq < 0) continue;
    options[decodeURIComponent(kv.slice(0, eq))] = decodeURIComponent(kv.slice(eq + 1));
  }
  return {
    scheme,
    username: decodeURIComponent(username),
    password: decodeURIComponent(password),
    hosts: hostStr.split(',').map((h) => h.trim()),
    database: decodeURIComponent(database),
    authSource: options.authSource || 'admin',
    options,
  };
}

/* ─────────────────────────── DNS discovery (SRV + TXT) ─────────────────────────── */

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms),
    ),
  ]);
}

function resolveSrvRecords(seedHostname: string): Promise<string[]> {
  // dns.resolve* callbacks can hang indefinitely on flaky resolvers — bound them.
  return withTimeout(
    new Promise<string[]>((resolve, reject) => {
      dns.resolveSrv(`_mongodb._tcp.${seedHostname}`, (err, addresses) => {
        if (err || addresses.length === 0) return reject(err ?? new Error('no SRV records'));
        resolve(addresses.map((a) => `${a.name}:${a.port}`));
      });
    }),
    5000,
    'SRV resolution',
  );
}

function resolveTxtOptions(seedHostname: string): Promise<Record<string, string>> {
  return withTimeout(
    new Promise<Record<string, string>>((resolve) => {
      dns.resolveTxt(seedHostname, (err, records) => {
        if (err || !records?.length) return resolve({});
        const merged: Record<string, string> = {};
        for (const chunk of records[0]) {
          for (const kv of chunk.split('&')) {
            const eq = kv.indexOf('=');
            if (eq > 0) merged[kv.slice(0, eq)] = kv.slice(eq + 1);
          }
        }
        resolve(merged);
      });
    }),
    5000,
    'TXT resolution',
  ).catch(() => ({}) as Record<string, string>);
}

/* ─────────────────────────── SCRAM helpers ─────────────────────────── */

function hmac(algo: 'sha1' | 'sha256', key: Buffer, data: string): Buffer {
  return crypto.createHmac(algo, key).update(data, 'utf8').digest();
}

function pbkdf2Async(
  secret: string,
  salt: Buffer,
  iterations: number,
  keyLen: number,
  digest: 'sha1' | 'sha256',
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    crypto.pbkdf2(secret, salt, iterations, keyLen, digest, (err, derived) =>
      err ? reject(err) : resolve(derived),
    );
  });
}

function saslEscape(username: string): string {
  return username.replace(/=/g, '=3D').replace(/,/g, '=2C');
}

/**
 * SCRAM payloads arrive base64-encoded whether the server ships them as BSON
 * binary (subtype 0) or as a BSON string — normalize to the utf8 SASL text.
 */
function payloadToString(p: unknown): string {
  if (p instanceof Uint8Array) return Buffer.from(p).toString('utf8');
  if (typeof p === 'string') return Buffer.from(p, 'base64').toString('utf8');
  return String(p ?? '');
}

const SCRAM_SPECS = {
  'SCRAM-SHA-1': { hmacAlgo: 'sha1', hashAlgo: 'sha1', keyLen: 20 },
  'SCRAM-SHA-256': { hmacAlgo: 'sha256', hashAlgo: 'sha256', keyLen: 32 },
} as const;

type ScramMechanism = keyof typeof SCRAM_SPECS;

/* ─────────────────────────── Wire framing ─────────────────────────── */

const OP_MSG = 2013;
const OP_COMPRESSED = 2012;
const MAX_MESSAGE_BYTES = 48_000_000;

let nextRequestId = 1;
function allocRequestId(): number {
  const id = nextRequestId;
  nextRequestId = (nextRequestId + 1) % 0x7fffffff;
  return id;
}

function encodeOpMsg(commandDoc: Record<string, unknown>): Buffer {
  const flagBits = Buffer.alloc(4);
  const bodySection = Buffer.concat([Buffer.from([0]), bsonSerialize(commandDoc)]);
  return Buffer.concat([flagBits, bodySection]);
}

/* ─────────────────────────── Connection ─────────────────────────── */

interface PendingRequest {
  resolve: (doc: Record<string, unknown>) => void;
  reject: (err: Error) => void;
  timer: NodeJS.Timeout;
}

export class MongoConnection {
  private socket: tls.TLSSocket | null = null;
  private pending = new Map<number, PendingRequest>();
  private buffer = Buffer.alloc(0);
  private connectPromise: Promise<void> | null = null;
  private closed = false;
  private reconnectDelayMs = 500;
  private hosts: string[];
  /** Fired when the live socket drops (not during intentional close). */
  onDisconnect: (() => void) | null = null;

  constructor(
    private uri: string,
    private parts: MongoUriParts,
    private connectTimeoutMs = 10000,
  ) {
    this.hosts = [...parts.hosts];
  }

  static async create(uri: string, connectTimeoutMs?: number): Promise<MongoConnection> {
    const parts = parseMongoUri(uri);
    const conn = new MongoConnection(uri, parts, connectTimeoutMs);

    // mongodb+srv: seed hostname -> real hosts + default options from TXT
    if (parts.scheme === 'mongodb+srv') {
      const seed = parts.hosts[0];
      try {
        conn.hosts = await resolveSrvRecords(seed);
        const txt = await resolveTxtOptions(seed);
        for (const [k, v] of Object.entries(txt)) {
          if (!(k in parts.options)) parts.options[k] = v;
        }
        if (parts.options.authSource) parts.authSource = parts.options.authSource;
      } catch {
        // SRV resolution failed — fall back to the seed host on default port
        conn.hosts = [`${seed}:27017`];
      }
    }

    await conn.connect();
    return conn;
  }

  async connect(): Promise<void> {
    if (this.connectPromise) return this.connectPromise;
    this.connectPromise = this.doConnect().finally(() => {
      this.connectPromise = null;
    });
    return this.connectPromise;
  }

  private async doConnect(): Promise<void> {
    if (this.closed) throw new Error('Connection closed');

    let lastErr: Error | null = null;
    for (const hostPort of this.hosts) {
      try {
        await this.openSocket(hostPort);
        // Handshake first: real drivers send hello (with client metadata and
        // saslSupportedMechs) as the first command; auth comes second.
        const hello = await this.handshake();
        await this.authenticate(hello.saslSupportedMechs);
        if (hello.isWritablePrimary !== true && hello.ismaster !== true) {
          // Secondary or unavailable — try the next host (Atlas SRV lists all members)
          this.destroySocket();
          lastErr = new Error(`${hostPort} is not writable (secondary?)`);
          continue;
        }
        this.reconnectDelayMs = 500;
        return;
      } catch (err) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        this.destroySocket();
      }
    }
    throw lastErr ?? new Error('All MongoDB hosts unreachable');
  }

  private async handshake(): Promise<Record<string, unknown>> {
    const { username, authSource } = this.parts;
    const doc: Record<string, unknown> = {
      hello: 1,
      client: {
        driver: { name: 'farmrescue-minidriver', version: '1.0.0' },
        os: { type: 'NA', architecture: process.arch },
      },
      $db: 'admin',
    };
    if (username) doc.saslSupportedMechs = `${authSource}.${username}`;
    return this.execute(doc, 8000);
  }

  private openSocket(hostPort: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const colon = hostPort.lastIndexOf(':');
      const host = colon > 0 ? hostPort.slice(0, colon) : hostPort;
      const port = colon > 0 ? Number(hostPort.slice(colon + 1)) : 27017;
      let settled = false;

      const socket = tls.connect({
        host,
        port,
        servername: host,
        rejectUnauthorized: true,
      });

      const timeout = setTimeout(() => {
        if (settled) return;
        settled = true;
        socket.destroy();
        reject(new Error(`Connect timeout (${this.connectTimeoutMs}ms) to ${hostPort}`));
      }, this.connectTimeoutMs);

      socket.once('secureConnect', () => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        this.socket = socket;
        this.buffer = Buffer.alloc(0);
        this.attachSocketHandlers(socket);
        resolve();
      });

      socket.once('error', (err) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);
        reject(err);
      });
    });
  }

  private attachSocketHandlers(socket: tls.TLSSocket): void {
    socket.on('data', (chunk: Buffer) => this.onData(chunk));
    socket.on('error', () => this.failAllPending(new Error('Socket error')));
    socket.on('close', () => {
      if (this.socket === socket) this.socket = null;
      this.failAllPending(new Error('Connection closed'));
      if (!this.closed) this.onDisconnect?.();
      this.scheduleReconnect();
    });
  }

  private scheduleReconnect(): void {
    if (this.closed || this.socket || this.connectPromise) return;
    setTimeout(async () => {
      if (this.closed || this.socket) return;
      try {
        await this.connect();
      } catch {
        this.reconnectDelayMs = Math.min(this.reconnectDelayMs * 2, 15000);
        this.scheduleReconnect();
      }
    }, this.reconnectDelayMs);
  }

  private destroySocket(): void {
    if (this.socket) {
      const s = this.socket;
      this.socket = null;
      s.removeAllListeners();
      s.destroy();
    }
    this.failAllPending(new Error('Connection reset'));
  }

  private failAllPending(err: Error): void {
    this.pending.forEach((p) => {
      clearTimeout(p.timer);
      p.reject(err);
    });
    this.pending.clear();
  }

  private onData(chunk: Buffer): void {
    this.buffer = Buffer.concat([this.buffer, chunk]);
    while (this.buffer.length >= 4) {
      const msgLen = this.buffer.readInt32LE(0);
      if (msgLen < 21 || msgLen > MAX_MESSAGE_BYTES) {
        this.buffer = Buffer.alloc(0);
        this.failAllPending(new Error(`Protocol violation: message length ${msgLen}`));
        return;
      }
      if (this.buffer.length < msgLen) return; // need more bytes

      const frame = this.buffer.subarray(0, msgLen);
      this.buffer = this.buffer.subarray(msgLen);

      const responseTo = frame.readInt32LE(8);
      const opCode = frame.readInt32LE(12);

      const pending = this.pending.get(responseTo);
      if (!pending) continue; // stale reply (timed out earlier) — drop

      clearTimeout(pending.timer);
      this.pending.delete(responseTo);

      try {
        if (opCode === OP_COMPRESSED) {
          throw new Error('Server sent OP_COMPRESSED; no compressor negotiated');
        }
        if (opCode !== OP_MSG) {
          throw new Error(`Unexpected opcode ${opCode}`);
        }
        let off = 16 + 4; // header + flagBits
        if (frame[off] !== 0) throw new Error('Expected OP_MSG kind-0 body section');
        off += 1;
        const docLen = frame.readInt32LE(off);
        const doc = bsonDeserialize(frame.subarray(off, off + docLen));
        pending.resolve(doc);
      } catch (err) {
        pending.reject(err instanceof Error ? err : new Error(String(err)));
      }
    }
  }

  /** Send a command and await its reply. Caller-supplied `$db` wins. */
  async command(
    doc: Record<string, unknown>,
    timeoutMs = 15000,
  ): Promise<Record<string, unknown>> {
    await this.connect();
    return this.execute(doc, timeoutMs);
  }

  /**
   * Write a command on the current socket without touching connection state.
   * Used internally by the handshake/auth, which run *inside* connect() —
   * awaiting connect() again from there would deadlock on its own promise.
   */
  private execute(
    doc: Record<string, unknown>,
    timeoutMs = 15000,
  ): Promise<Record<string, unknown>> {
    const requestId = allocRequestId();
    const db = this.parts.database || 'admin';
    // OP_MSG requires the COMMAND NAME to be the first BSON key. `$db` must
    // never precede it, so copy the command first and only append `$db` when
    // the caller did not supply one (auth commands pin their own authSource).
    const full: Record<string, unknown> = { ...doc };
    if (!('$db' in full)) full.$db = db;

    const body = encodeOpMsg(full);
    const header = Buffer.alloc(16);
    header.writeInt32LE(16 + body.length, 0);
    header.writeInt32LE(requestId, 4);
    header.writeInt32LE(0, 8);
    header.writeInt32LE(OP_MSG, 12);

    return new Promise<Record<string, unknown>>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(requestId);
        reject(new Error(`MongoDB timeout after ${timeoutMs}ms: ${String(Object.keys(doc)[0])}`));
      }, timeoutMs);

      this.pending.set(requestId, { resolve, reject, timer });

      if (!this.socket) {
        clearTimeout(timer);
        this.pending.delete(requestId);
        reject(new Error('Socket not connected'));
        return;
      }
      this.socket.write(Buffer.concat([header, body]), (err) => {
        if (err) {
          clearTimeout(timer);
          this.pending.delete(requestId);
          reject(err);
        }
      });
    });
  }

  /* ─────────────────────────── SCRAM (SHA-1 & SHA-256) ─────────────────────────── */

  private async authenticate(saslSupportedMechs: unknown): Promise<void> {
    const { username, password, authSource } = this.parts;
    if (!username) return;

    // Mechanism negotiation: the server lists what credentials exist for this
    // user. Atlas users created long ago may only have SCRAM-SHA-1 stored.
    const mechs = Array.isArray(saslSupportedMechs) ? (saslSupportedMechs as string[]) : [];
    const mechanism: ScramMechanism = mechs.includes('SCRAM-SHA-256')
      ? 'SCRAM-SHA-256'
      : 'SCRAM-SHA-1';

    const spec = SCRAM_SPECS[mechanism];

    // MongoDB's SCRAM-SHA-1 pre-hashes the password the legacy way.
    const scramPassword =
      mechanism === 'SCRAM-SHA-1'
        ? crypto.createHash('md5').update(`${username}:mongo:${password}`).digest('hex')
        : password;

    const clientNonce = crypto.randomBytes(18).toString('base64');
    const clientFirstBare = `n=${saslEscape(username)},r=${clientNonce}`;

    const start = await this.execute(
      {
        saslStart: 1,
        mechanism,
        payload: Buffer.from(`n,,${clientFirstBare}`, 'utf8'), // BSON binary, raw SASL text
        options: { skipEmptyExchange: true },
        $db: authSource,
      },
      10000,
    );

    if (start.ok !== 1) {
      throw new Error(
        `SCRAM start rejected: ${String(start.errmsg ?? '(no message)')} (code ${String(start.code ?? '?')})`,
      );
    }

    const serverFirst = payloadToString(start.payload);
    const m = serverFirst.match(/^r=([^,]+),s=([^,]+),i=(\d+)$/);
    if (!m) {
      throw new Error(
        `SCRAM: malformed server-first message: "${serverFirst.slice(0, 120)}" (reply keys: ${Object.keys(start).join(',')})`,
      );
    }
    const [, serverNonce, saltB64, iterStr] = m;
    if (!serverNonce.startsWith(clientNonce)) {
      throw new Error('SCRAM: server nonce does not extend client nonce');
    }
    const iterations = parseInt(iterStr, 10);
    if (iterations < 4096) throw new Error('SCRAM: iteration count too low');

    const saltedPassword = await pbkdf2Async(
      scramPassword,
      Buffer.from(saltB64, 'base64'),
      iterations,
      spec.keyLen,
      spec.hmacAlgo,
    );
    const clientFinalNoProof = `c=biws,r=${serverNonce}`;
    const authMessage = `${clientFirstBare},${serverFirst},${clientFinalNoProof}`;

    const clientKey = hmac(spec.hmacAlgo, saltedPassword, 'Client Key');
    const storedKey = crypto.createHash(spec.hashAlgo).update(clientKey).digest();
    const clientSignature = hmac(spec.hmacAlgo, storedKey, authMessage);
    const clientProof = Buffer.alloc(spec.keyLen);
    for (let i = 0; i < spec.keyLen; i++) clientProof[i] = clientKey[i] ^ clientSignature[i];

    const finish = await this.execute(
      {
        saslContinue: 1,
        conversationId: start.conversationId,
        payload: Buffer.from(`${clientFinalNoProof},p=${clientProof.toString('base64')}`, 'utf8'),
        $db: authSource,
      },
      10000,
    );

    if (finish.ok !== 1) {
      throw new Error(`SCRAM: auth rejected — ${JSON.stringify(finish).slice(0, 120)}`);
    }

    // Mutual auth: verify the server signature
    const serverFinal = payloadToString(finish.payload);
    const vMatch = serverFinal.match(/v=([^,]+)/);
    if (vMatch) {
      const serverKey = hmac(spec.hmacAlgo, saltedPassword, 'Server Key');
      const expected = hmac(spec.hmacAlgo, serverKey, authMessage).toString('base64');
      if (vMatch[1] !== expected) {
        throw new Error('SCRAM: server signature mismatch (possible MITM)');
      }
    }

    if (!finish.done) {
      await this.execute(
        { saslContinue: 1, conversationId: finish.conversationId, payload: Buffer.alloc(0), $db: authSource },
        10000,
      ).catch(() => undefined);
    }
  }

  /* ─────────────────────────── Utility ─────────────────────────── */

  get isConnected(): boolean {
    return this.socket !== null && !this.closed;
  }

  close(): void {
    this.closed = true;
    this.destroySocket();
  }
}
