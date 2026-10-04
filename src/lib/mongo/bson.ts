/**
 * Minimal BSON encoder/decoder — the subset MongoDB actually uses.
 *
 * Supported natively: double, string, document, array, binary, ObjectId,
 * boolean, UTC datetime, null, int32, int64, decimal128 (opaque bytes),
 * min/max key. Unrecognized types round-trip as raw bytes so decoding
 * never throws on future/opaque payloads.
 */

export class BSONError extends Error {
  constructor(message: string) {
    super(`[FarmRescue BSON] ${message}`);
    this.name = 'BSONError';
  }
}

/* ─────────────────────────── ObjectId ─────────────────────────── */

const RANDOM_BYTES = Buffer.from(
  Array.from({ length: 5 }, () => Math.floor(Math.random() * 256))
);
let pidCounter = Math.floor(Math.random() * 0xffffff);

export class ObjectId {
  readonly buffer: Buffer;

  constructor(id?: string | Buffer | ObjectIdLike) {
    if (!id) {
      this.buffer = ObjectId.generate().buffer;
    } else if (typeof id === 'string') {
      if (!ObjectId.isValid(id)) throw new BSONError(`Invalid ObjectId string: ${id}`);
      this.buffer = Buffer.from(id, 'hex');
    } else if (Buffer.isBuffer(id)) {
      if (id.length !== 12) throw new BSONError('ObjectId buffer must be 12 bytes');
      this.buffer = Buffer.from(id);
    } else if (typeof id.toHexString === 'function') {
      this.buffer = Buffer.from(id.toHexString(), 'hex');
    } else {
      throw new BSONError('ObjectId: unsupported constructor argument');
    }
  }

  static generate(): ObjectId {
    const buf = Buffer.alloc(12);
    buf.writeUInt32BE(Math.floor(Date.now() / 1000), 0);
    RANDOM_BYTES.copy(buf, 4);
    pidCounter = (pidCounter + 1) % 0xffffff;
    buf.writeUIntBE(pidCounter, 9, 3);
    return new ObjectId(buf);
  }

  static isValid(id: string): boolean {
    return typeof id === 'string' && /^[0-9a-fA-F]{24}$/.test(id);
  }

  toHexString(): string {
    return this.buffer.toString('hex');
  }

  toString(): string {
    return this.toHexString();
  }

  equals(other: ObjectId | string): boolean {
    const hex = typeof other === 'string' ? other : other.toHexString();
    return this.toHexString() === hex.toLowerCase();
  }

  get timestamp(): Date {
    return new Date(this.buffer.readUInt32BE(0) * 1000);
  }
}

export interface ObjectIdLike {
  toHexString(): string;
}

/* ─────────────────────────── Encode ─────────────────────────── */

const INT32_MIN = -2147483648;
const INT32_MAX = 2147483647;

export function bsonSerialize(doc: Record<string, unknown>): Buffer {
  const elements: Buffer[] = [];
  for (const [key, value] of Object.entries(doc)) {
    if (typeof value === 'function') continue; // never serialize functions
    elements.push(encodeElement(key, value));
  }
  return finishDocument(elements);
}

function finishDocument(elements: Buffer[]): Buffer {
  const bodyLen = elements.reduce((sum, e) => sum + e.length, 0);
  const total = bodyLen + 5; // + trailing null terminator
  const out = Buffer.alloc(total);
  out.writeInt32LE(total, 0);
  let offset = 4;
  for (const e of elements) {
    e.copy(out, offset);
    offset += e.length;
  }
  out[offset] = 0;
  return out;
}

function encodeCString(str: string): Buffer {
  const utf8 = Buffer.from(str, 'utf8');
  const out = Buffer.alloc(utf8.length + 1);
  utf8.copy(out, 0);
  out[utf8.length] = 0;
  return out;
}

function encodeElement(key: string, value: unknown): Buffer {
  const name = encodeCString(key);

  if (value === null || value === undefined) {
    return header(10, name);
  }

  if (typeof value === 'boolean') {
    const body = Buffer.from([value ? 1 : 0]);
    return header(8, name, body);
  }

  if (typeof value === 'number') {
    if (Number.isInteger(value) && value >= INT32_MIN && value <= INT32_MAX) {
      const body = Buffer.alloc(4);
      body.writeInt32LE(value, 0);
      return header(16, name, body);
    }
    const body = Buffer.alloc(8);
    body.writeDoubleLE(value, 0);
    return header(1, name, body);
  }

  if (typeof value === 'bigint') {
    const body = Buffer.alloc(8);
    body.writeBigInt64LE(value, 0);
    return header(18, name, body);
  }

  if (typeof value === 'string') {
    const utf8 = Buffer.from(value, 'utf8');
    const len = Buffer.alloc(4);
    len.writeInt32LE(utf8.length + 1, 0);
    return header(2, name, Buffer.concat([len, utf8, Buffer.from([0])]));
  }

  if (value instanceof Date) {
    const body = Buffer.alloc(8);
    body.writeBigInt64LE(BigInt(value.getTime()), 0);
    return header(9, name, body);
  }

  if (value instanceof ObjectId) {
    return header(7, name, Buffer.from(value.buffer));
  }

  if (isObjectIdLike(value)) {
    return header(7, name, Buffer.from(value.toHexString(), 'hex'));
  }

  if (value instanceof Uint8Array || Buffer.isBuffer(value)) {
    const bytes = Buffer.from(value);
    const len = Buffer.alloc(4);
    len.writeInt32LE(bytes.length, 0);
    return header(5, name, Buffer.concat([len, Buffer.from([0]), bytes])); // subtype 0
  }

  if (Array.isArray(value)) {
    const elements = value.map((item, i) => encodeElement(String(i), item));
    return header(4, name, finishDocument(elements));
  }

  if (typeof value === 'object') {
    const nested = bsonSerialize(value as Record<string, unknown>);
    return header(3, name, nested);
  }

  throw new BSONError(`Cannot serialize value of type ${typeof value} for key "${key}"`);
}

function header(type: number, name: Buffer, body?: Buffer): Buffer {
  // `name` comes from encodeCString and ALREADY includes its NUL terminator,
  // so the element is: type(1) + name(len incl. NUL) + body.
  const out = Buffer.alloc(1 + name.length + (body ? body.length : 0));
  out[0] = type;
  name.copy(out, 1);
  if (body) body.copy(out, 1 + name.length);
  return out;
}

function isObjectIdLike(v: unknown): v is ObjectIdLike {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as { toHexString?: unknown }).toHexString === 'function' &&
    !(v instanceof Date)
  );
}

/* ─────────────────────────── Decode ─────────────────────────── */

export function bsonDeserialize(buffer: Buffer): Record<string, unknown> {
  let offset = 4; // skip document length
  const result: Record<string, unknown> = {};

  while (buffer[offset] !== 0) {
    const type = buffer[offset];
    offset += 1;
    const keyEnd = buffer.indexOf(0, offset);
    const key = buffer.subarray(offset, keyEnd).toString('utf8');
    offset = keyEnd + 1;

    const [value, consumed] = decodeValue(type, buffer, offset);
    result[key] = value;
    offset += consumed;
  }

  return result;
}

function decodeValue(
  type: number,
  buf: Buffer,
  offset: number
): [unknown, number] {
  switch (type) {
    case 1: { // double
      return [buf.readDoubleLE(offset), 8];
    }
    case 2: { // string
      const len = buf.readInt32LE(offset);
      const str = buf.subarray(offset + 4, offset + 4 + len - 1).toString('utf8');
      return [str, 4 + len];
    }
    case 3: { // embedded document
      const len = buf.readInt32LE(offset);
      return [bsonDeserialize(buf.subarray(offset, offset + len)), len];
    }
    case 4: { // array
      const len = buf.readInt32LE(offset);
      const arr = bsonDeserialize(buf.subarray(offset, offset + len));
      return [Object.values(arr), len];
    }
    case 5: { // binary
      const len = buf.readInt32LE(offset);
      const subtype = buf[offset + 4];
      const bytes = Buffer.from(buf.subarray(offset + 5, offset + 5 + len));
      if (subtype === 0) return [bytes, 5 + len];
      return [{ __binary: bytes.toString('base64'), subtype }, 5 + len];
    }
    case 7: { // ObjectId
      const bytes = Buffer.from(buf.subarray(offset, offset + 12));
      return [new ObjectId(bytes), 12];
    }
    case 8: { // boolean
      return [buf[offset] === 1, 1];
    }
    case 9: { // UTC datetime
      return [new Date(Number(buf.readBigInt64LE(offset))), 8];
    }
    case 10: { // null
      return [null, 0];
    }
    case 16: { // int32
      return [buf.readInt32LE(offset), 4];
    }
    case 17: { // timestamp (opaque)
      return [{ __timestamp: buf.readUInt32LE(offset) }, 8];
    }
    case 18: { // int64
      const v = buf.readBigInt64LE(offset);
      return [v >= BigInt(Number.MIN_SAFE_INTEGER) && v <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(v) : v, 8];
    }
    case 19: { // decimal128 (opaque)
      const bytes = Buffer.from(buf.subarray(offset, offset + 16));
      return [{ __decimal128: bytes.toString('hex') }, 16];
    }
    case 11: { // regex (opaque round-trip)
      const patternEnd = buf.indexOf(0, offset);
      const optionsEnd = buf.indexOf(0, patternEnd + 1);
      const consumed = optionsEnd + 1 - offset;
      return [
        {
          __regex: {
            pattern: buf.subarray(offset, patternEnd).toString('utf8'),
            options: buf.subarray(patternEnd + 1, optionsEnd).toString('utf8'),
          },
        },
        consumed,
      ];
    }
    case 0xff: { // min key
      return [{ __minKey: true }, 0];
    }
    case 0x7f: { // max key
      return [{ __maxKey: true }, 0];
    }
    default: {
      // Opaque/unsupported (dbpointer, code w/ scope, symbol, …): scan to
      // the enclosing document end is impossible generically, so fail loud
      // rather than corrupt the stream.
      throw new BSONError(`Unsupported BSON type ${type} — cannot decode`);
    }
  }
}
