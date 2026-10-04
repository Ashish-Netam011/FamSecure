/**
 * Bundled offline administrative-division reference data for the Plot Registry.
 *
 * Honest scope: this is a REFERENCE list, not an authoritative land-record
 * database. The state list is complete for India; district lists cover
 * Andhra Pradesh, Chhattisgarh and Telangana (demo core states); tahsil →
 * panchayat → village depth exists only for a few demo talukas. Any level
 * with no bundled data falls back to free text in the UI — missing entries
 * never block the user, and values from registered plots are merged into
 * the options at runtime (the registry grows with real data).
 */

export type AdminLevel = 'state' | 'district' | 'tahsil' | 'panchayat' | 'village';

export const ADMIN_LEVELS: AdminLevel[] = ['state', 'district', 'tahsil', 'panchayat', 'village'];

export const ADMIN_LABELS: Record<AdminLevel, string> = {
  state: 'State',
  district: 'District',
  tahsil: 'Tahsil / Mandal',
  panchayat: 'Panchayat',
  village: 'Village / Gaon',
};

export type AdminSelection = Partial<Record<AdminLevel, string>>;

interface Node {
  name: string;
  children?: Node[];
}

const TREE: Node[] = [
  {
    name: 'Andhra Pradesh',
    children: [
      {
        name: 'Bapatla',
        children: [
          {
            name: 'Vemuru',
            children: [
              {
                name: 'Vemuru',
                children: [
                  { name: 'Vemuru' },
                  { name: 'Pedapulivarru' },
                  { name: 'Kotapalli' },
                  { name: 'Takkellapalem' },
                ],
              },
              { name: 'Pedapulivarru' },
            ],
          },
          {
            name: 'Bapatla',
            children: [{ name: 'Bapatla' }],
          },
          { name: 'Chirala' },
          { name: 'Karlapalem' },
          { name: 'Parchur' },
          { name: 'Repalle' },
        ],
      },
      {
        name: 'Guntur',
        children: [
          { name: 'Tenali', children: [{ name: 'Tenali' }] },
          { name: 'Mangalagiri' },
          { name: 'Ponnur' },
          { name: 'Sattenapalli' },
          { name: 'Narasaraopet' },
          { name: 'Guntur' },
        ],
      },
      { name: 'Krishna' },
      { name: 'Kurnool' },
      { name: 'Nandyal' },
      { name: 'Prakasam' },
      { name: 'Sri Potti Sriramulu Nellore' },
      { name: 'Tirupati' },
      { name: 'Chittoor' },
      { name: 'Ananthapuramu' },
      { name: 'Sri Satya Sai' },
      { name: 'YSR Kadapa' },
      { name: 'Annamlai' },
      { name: 'Alluri Sitharama Raju' },
      { name: 'Anakapalli' },
      { name: 'Dr. B.R. Ambedkar Konaseema' },
      { name: 'East Godavari' },
      { name: 'Eluru' },
      { name: 'Kakinada' },
      { name: 'NTR' },
      { name: 'Palnadu' },
      { name: 'Parvathipuram Manyam' },
      { name: 'Srikakulam' },
      { name: 'Visakhapatnam' },
      { name: 'Vizianagaram' },
      { name: 'West Godavari' },
    ],
  },
  {
    name: 'Chhattisgarh',
    children: [
      {
        name: 'Raipur',
        children: [
          { name: 'Raipur', children: [{ name: 'Raipur' }] },
          { name: 'Abhanpur' },
          { name: 'Arang' },
          { name: 'Chhura' },
          { name: 'Nandgaon' },
        ],
      },
      { name: 'Durg' },
      { name: 'Bilaspur' },
      { name: 'Korba' },
      { name: 'Raigarh' },
      { name: 'Jagdalpur (Bastar)' },
      { name: 'Bastar' },
      { name: 'Dhamtari' },
      { name: 'Rajnandgaon' },
      { name: 'Mahasamund' },
      { name: 'Baloda Bazar' },
      { name: 'Bemetara' },
      { name: 'Mungeli' },
      { name: 'Gariaband' },
      { name: 'Janjgir-Champa' },
      { name: 'Sakti' },
      { name: 'Korba' },
      { name: 'Koriya' },
      { name: 'Surajpur' },
      { name: 'Surguja' },
      { name: 'Balrampur' },
      { name: 'Jashpur' },
      { name: 'Gaurella-Pendra-Marwahi' },
      { name: 'Manendragarh-Chirmiri-Bharatpur' },
      { name: 'Khairagarh-Chhuikhadan-Gandai' },
      { name: 'Sarangarh-Bilaigarh' },
      { name: 'Mohla-Manpur-Ambagarh Chowki' },
      { name: 'Narayanpur' },
      { name: 'Kondagaon' },
      { name: 'Kanker' },
      { name: 'Dantewada' },
      { name: 'Bijapur' },
      { name: 'Sukma' },
    ],
  },
  {
    name: 'Telangana',
    children: [
      { name: 'Hyderabad' },
      { name: 'Rangareddy' },
      { name: 'Medchal-Malkajgiri' },
      { name: 'Sangareddy' },
      { name: 'Warangal' },
      { name: 'Karimnagar' },
      { name: 'Khammam' },
      { name: 'Nalgonda' },
      { name: 'Nizamabad' },
      { name: 'Adilabad' },
      { name: 'Mahabubnagar' },
      { name: 'Nizamabad' },
      { name: 'Kamareddy' },
      { name: 'Jagtial' },
      { name: 'Jangaon' },
      { name: 'Jayashankar Bhupalpally' },
      { name: 'Jogulamba Gadwal' },
      { name: 'Komaram Bheem Asifabad' },
      { name: 'Mahabubabad' },
      { name: 'Mancherial' },
      { name: 'Medak' },
      { name: 'Mulugu' },
      { name: 'Nagarkurnool' },
      { name: 'Narayanpet' },
      { name: 'Nirmal' },
      { name: 'Peddapalli' },
      { name: 'Rajanna Sircilla' },
      { name: 'Siddipet' },
      { name: 'Suryapet' },
      { name: 'Vikarabad' },
      { name: 'Wanaparthy' },
      { name: 'Yadadri Bhuvanagiri' },
      { name: 'Bhadradri Kothagudem' },
      { name: 'Hanumakonda' },
    ],
  },
  // Remaining states & UTs: name only — district/tahsil/panchayat/village for
  // these fall back to free text (or values from registered plots).
  { name: 'Arunachal Pradesh' },
  { name: 'Assam' },
  { name: 'Bihar' },
  { name: 'Goa' },
  { name: 'Gujarat' },
  { name: 'Haryana' },
  { name: 'Himachal Pradesh' },
  { name: 'Jharkhand' },
  { name: 'Karnataka' },
  { name: 'Kerala' },
  { name: 'Madhya Pradesh' },
  { name: 'Maharashtra' },
  { name: 'Manipur' },
  { name: 'Meghalaya' },
  { name: 'Mizoram' },
  { name: 'Nagaland' },
  { name: 'Odisha' },
  { name: 'Punjab' },
  { name: 'Rajasthan' },
  { name: 'Sikkim' },
  { name: 'Tamil Nadu' },
  { name: 'Tripura' },
  { name: 'Uttar Pradesh' },
  { name: 'Uttarakhand' },
  { name: 'West Bengal' },
  { name: 'Andaman & Nicobar Islands' },
  { name: 'Chandigarh' },
  { name: 'Dadra & Nagar Haveli and Daman & Diu' },
  { name: 'Delhi' },
  { name: 'Jammu & Kashmir' },
  { name: 'Ladakh' },
  { name: 'Lakshadweep' },
  { name: 'Puducherry' },
];

export const STATES: string[] = TREE.map((n) => n.name).sort((a, b) => a.localeCompare(b));

function findNodes(nodes: Node[], name: string): Node[] | undefined {
  const hit = nodes.find((n) => n.name.toLowerCase() === name.toLowerCase());
  return hit?.children;
}

/**
 * Options for one cascade level given the selections made above it.
 * Returns [] when a parent is unset or has no bundled children — the UI
 * then falls back to free text (unknown is a valid state).
 */
export function divisionOptions(level: AdminLevel, sel: AdminSelection): string[] {
  const idx = ADMIN_LEVELS.indexOf(level);
  if (idx === 0) return STATES;
  let nodes: Node[] | undefined = TREE;
  for (let i = 0; i < idx; i++) {
    const v = sel[ADMIN_LEVELS[i]];
    if (!v) return [];
    nodes = findNodes(nodes, v);
    if (!nodes || nodes.length === 0) return [];
  }
  return (nodes ?? []).map((n) => n.name);
}

/** Is there bundled reference data below the current selection? */
export function hasChildren(level: AdminLevel, sel: AdminSelection): boolean {
  return divisionOptions(level, sel).length > 0;
}

/** Human-readable hierarchy path for display, skipping unset levels. */
export function describeSelection(sel: AdminSelection): string {
  const parts = ADMIN_LEVELS.map((l) => sel[l]).filter(Boolean) as string[];
  return parts.length ? parts.join(' › ') : 'No location selected';
}

export type MatchState = 'matched' | 'unlisted' | 'unchecked';

/**
 * How does a typed value relate to the bundled reference data?
 * 'matched' — found in the reference list (case-insensitive);
 * 'unlisted' — the parent chain IS bundled but this name is not in it;
 * 'unchecked' — no reference data covers this chain, so we simply don't know.
 * Unlisted/unchecked are never errors: real land records contain countless
 * spellings and levels the bundle lacks. This is a hint, not a gate.
 */
export function matchState(level: AdminLevel, sel: AdminSelection): MatchState {
  const value = sel[level]?.trim();
  if (!value) return 'unchecked';
  const idx = ADMIN_LEVELS.indexOf(level);
  if (idx === 0) {
    return findNodes(TREE, value)?.length ? 'matched' : 'unlisted';
  }
  // Are the parents bundled at all? If any link in the parent chain is not
  // resolvable, the reference data simply doesn't cover this path.
  let nodes: Node[] | undefined = TREE;
  for (let i = 0; i < idx; i++) {
    nodes = findNodes(nodes, sel[ADMIN_LEVELS[i]] ?? '');
    if (!nodes || nodes.length === 0) return 'unchecked';
  }
  return findNodes(nodes, value)?.length ? 'matched' : 'unlisted';
}
