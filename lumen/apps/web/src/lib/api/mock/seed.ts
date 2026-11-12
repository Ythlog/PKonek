import { PASIG_BARANGAYS } from "@/lib/pasig";
import type { ActivityLog, AuditLog, Category, ComplaintStaff, ComplaintStatus, Role, User } from "../types";

/** Demo accounts. Shown on the login screens while mock mode is on. */
export const DEMO_PASSWORD = "Demo1234!";
export const DEMO_ACCOUNTS = [
  { email: "citizen@pkonek.demo", role: "citizen", label: "Citizen" },
  { email: "official@pkonek.demo", role: "official", label: "Barangay official" },
  { email: "admin@pkonek.demo", role: "pasig_admin", label: "Pasig administrator" },
] as const satisfies ReadonlyArray<{ email: string; role: Role; label: string }>;

/** Mock-only: passwords are stored in plain text because this is fake demo data. */
export type MockUser = User & { password: string; contact_number: string | null };

export type MockSupport = {
  id: number;
  complaint_id: number;
  reporter_contact: string | null;
  note: string | null;
  latitude: number;
  longitude: number;
  created_at: string;
};

export type MockDb = {
  version: 1;
  users: MockUser[];
  categories: Category[];
  complaints: ComplaintStaff[];
  supports: MockSupport[];
  activity: ActivityLog[];
  audit: AuditLog[];
};

/** Same codes, names and order as the INSERT in accounts_complaints/schema.sql, so ids line up. */
const CATEGORIES: Array<Omit<Category, "id" | "is_active">> = [
  { code: "roads", name: "Roads and Potholes", description: "Damaged roads, potholes, broken sidewalks" },
  { code: "flooding_drainage", name: "Flooding and Drainage", description: "Clogged drains, flooding, open manholes" },
  { code: "garbage", name: "Garbage and Waste", description: "Uncollected garbage, illegal dumping" },
  { code: "streetlights", name: "Streetlights", description: "Broken or missing streetlights" },
  { code: "illegal_parking", name: "Illegal Parking", description: "Vehicles blocking roads or sidewalks" },
  { code: "noise", name: "Noise", description: "Excessive noise or disturbance" },
  { code: "water_supply", name: "Water Supply", description: "Leaks, no water, broken pipes" },
  { code: "stray_animals", name: "Stray Animals", description: "Stray or dangerous animals" },
  { code: "others", name: "Others", description: "Anything not covered by other categories" },
];

const CAT = Object.fromEntries(CATEGORIES.map((c, i) => [c.code, i + 1])) as Record<string, number>;

type SeedComplaint = {
  cat: string;
  title: string;
  description: string;
  barangay: string;
  /** Offset from the barangay center in meters (east, north). */
  offset: [number, number];
  street: string;
  status: ComplaintStatus;
  hoursAgo: number;
  /** Hours after creation when it was resolved. */
  resolvedAfter?: number;
  reports?: number;
  byCitizen?: boolean;
  reporter?: [string, string];
};

const SEED: SeedComplaint[] = [
  // Demo citizen's reports (Juan dela Cruz, Kapitolyo)
  { cat: "flooding_drainage", title: "Clogged drain floods the corner of East Capitol Dr", description: "The storm drain at the corner of East Capitol Drive and Brixton St is full of plastic and leaves. After 20 minutes of rain the water reaches the sidewalk and pedestrians have to walk on the road.", barangay: "Kapitolyo", offset: [40, 30], street: "East Capitol Dr cor. Brixton St", status: "in_progress", hoursAgo: 46, reports: 7, byCitizen: true },
  { cat: "streetlights", title: "Three streetlights out along United St", description: "Three streetlights in a row are out between Pioneer St and Brixton St. The stretch is completely dark at night and several residents walk home from the jeepney stop there.", barangay: "Kapitolyo", offset: [-120, -60], street: "United St", status: "resolved", hoursAgo: 240, resolvedAfter: 70, reports: 4, byCitizen: true },
  { cat: "garbage", title: "Garbage not collected for a week on Sta. Rosa St", description: "Bags of household garbage have piled up beside the lamp post for six days. The smell is strong and stray cats are tearing the bags open.", barangay: "Kapitolyo", offset: [160, -140], street: "Sta. Rosa St", status: "open", hoursAgo: 20, reports: 2, byCitizen: true },
  { cat: "noise", title: "Videoke past midnight every weekend", description: "A house near the basketball court plays videoke at full volume until 2 AM every Friday and Saturday.", barangay: "Kapitolyo", offset: [-200, 120], street: "Pioneer St", status: "rejected", hoursAgo: 400, reports: 1, byCitizen: true },

  // Hotspot: flooding and drainage along the river side
  { cat: "flooding_drainage", title: "Open manhole near the Bagong Ilog chapel", description: "The manhole cover is missing in front of the chapel. Someone put a chair over it, but it is still dangerous at night and when the street floods.", barangay: "Bagong Ilog", offset: [10, 20], street: "F. Legaspi St", status: "open", hoursAgo: 6, reports: 9, reporter: ["Liza Santos", "0917 555 0142"] },
  { cat: "flooding_drainage", title: "Knee-deep flooding after light rain on Pineda Rd", description: "The road floods knee-deep after even light rain because the canal is silted. Tricycles can no longer pass.", barangay: "Pineda", offset: [-30, 50], street: "Pineda Rd", status: "in_progress", hoursAgo: 70, reports: 12, reporter: ["Rommel Garcia", "rommel.g@example.com"] },
  { cat: "flooding_drainage", title: "Canal overflowing beside the market", description: "The canal beside the public market overflows during high tide and the water carries garbage into the stalls.", barangay: "Malinao", offset: [60, -40], street: "Market Ave", status: "open", hoursAgo: 30, reports: 5 },
  { cat: "flooding_drainage", title: "Flooded underpass on C. Raymundo Ave", description: "The underpass floods to about 1 foot during every heavy rain. Cars stall in the middle.", barangay: "Caniogan", offset: [0, 0], street: "C. Raymundo Ave", status: "resolved", hoursAgo: 500, resolvedAfter: 96, reports: 15 },
  { cat: "flooding_drainage", title: "Drainage grate collapsed on Dr. Sixto Antonio Ave", description: "A drainage grate caved in near the gas station. There is now a hole about 40 cm wide at the edge of the lane.", barangay: "Kapasigan", offset: [-50, 80], street: "Dr. Sixto Antonio Ave", status: "in_progress", hoursAgo: 28, reports: 3 },

  // Roads
  { cat: "roads", title: "Large pothole on Ortigas Ave Extension", description: "A deep pothole has formed in the outer lane near the footbridge. Motorcycles swerve suddenly to avoid it.", barangay: "Rosario", offset: [30, -20], street: "Ortigas Ave Extension", status: "in_progress", hoursAgo: 52, reports: 11, reporter: ["Mark Villanueva", "0918 222 0199"] },
  { cat: "roads", title: "Broken sidewalk tiles in front of the school", description: "Sidewalk tiles are broken and lifted in front of the elementary school gate. Two children have tripped this week.", barangay: "Maybunga", offset: [-40, 30], street: "Eusebio Ave", status: "open", hoursAgo: 12, reports: 6 },
  { cat: "roads", title: "Road cut left unpaved after pipe repair", description: "A water pipe repair left a trench filled only with gravel. It has been like this for three weeks.", barangay: "San Antonio", offset: [70, 10], street: "Exchange Rd", status: "resolved", hoursAgo: 330, resolvedAfter: 140, reports: 2 },
  { cat: "roads", title: "Faded pedestrian crossing near the church", description: "The pedestrian lane paint has completely faded. Drivers no longer slow down for people crossing.", barangay: "Kapasigan", offset: [120, -30], street: "Plaza Rizal", status: "open", hoursAgo: 90, reports: 1 },
  { cat: "roads", title: "Sinkhole forming on Amang Rodriguez Ave", description: "The asphalt is sinking at the edge of the lane near the bridge, and the dip gets deeper every day.", barangay: "Santolan", offset: [-20, -40], street: "Amang Rodriguez Ave", status: "open", hoursAgo: 3, reports: 4 },

  // Garbage
  { cat: "garbage", title: "Illegal dumping beside the creek", description: "People are dumping construction debris and household garbage on the creek bank behind the covered court.", barangay: "Pinagbuhatan", offset: [40, 40], street: "Creekside, Purok 4", status: "open", hoursAgo: 40, reports: 8, reporter: ["Nena Bautista", "0927 444 0110"] },
  { cat: "garbage", title: "Overflowing bins at the transport terminal", description: "The public bins at the terminal have not been emptied for days and garbage is spilling onto the waiting area.", barangay: "Kapasigan", offset: [-90, -60], street: "Pasig Transport Terminal", status: "resolved", hoursAgo: 150, resolvedAfter: 20, reports: 5 },
  { cat: "garbage", title: "Missed collection on Saturday route", description: "The garbage truck skipped our street on the Saturday route for the second week in a row.", barangay: "Manggahan", offset: [30, -10], street: "Kalinangan St", status: "in_progress", hoursAgo: 60, reports: 3 },
  { cat: "garbage", title: "Burning of garbage in a vacant lot", description: "Someone burns plastic garbage in the vacant lot every evening. The smoke enters nearby houses.", barangay: "Santa Lucia", offset: [-60, 20], street: "Vacant lot, Ilang-Ilang St", status: "open", hoursAgo: 15, reports: 2 },

  // Streetlights
  { cat: "streetlights", title: "Flickering streetlight at the jeepney stop", description: "The light above the jeepney stop flickers on and off all night.", barangay: "Ugong", offset: [20, 60], street: "Meralco Ave", status: "resolved", hoursAgo: 210, resolvedAfter: 30, reports: 2 },
  { cat: "streetlights", title: "Dark stretch along the river park", description: "All the lamp posts along the river park walkway have been off for two weeks. Joggers avoid it after sunset.", barangay: "Sumilang", offset: [-30, -50], street: "Pasig River Linear Park", status: "open", hoursAgo: 75, reports: 6 },
  { cat: "streetlights", title: "Leaning lamp post after a truck hit it", description: "A truck hit the lamp post and it is now leaning over the road. The wires look exposed.", barangay: "Dela Paz", offset: [40, 0], street: "Marcos Highway service road", status: "in_progress", hoursAgo: 18, reports: 3 },

  // Illegal parking
  { cat: "illegal_parking", title: "Cars double-parked outside the restaurant row", description: "Customers double-park every evening and block one full lane, causing long traffic jams.", barangay: "Kapitolyo", offset: [300, 250], street: "West Capitol Dr", status: "open", hoursAgo: 9, reports: 5 },
  { cat: "illegal_parking", title: "Trucks parked overnight on the sidewalk", description: "Delivery trucks park on the sidewalk overnight, forcing pedestrians onto the road.", barangay: "Ugong", offset: [-80, -40], street: "Ugong Norte Rd", status: "rejected", hoursAgo: 260, reports: 1 },

  // Water supply
  { cat: "water_supply", title: "Leaking pipe wasting water for days", description: "Clean water has been gushing from a broken pipe beside the road for four days.", barangay: "San Joaquin", offset: [10, -30], street: "M. Concepcion Ave", status: "in_progress", hoursAgo: 36, reports: 7 },
  { cat: "water_supply", title: "No water supply since Monday", description: "Our whole block has had no water from the tap since Monday morning. No advisory was posted.", barangay: "Sagad", offset: [-20, 40], street: "Sagad Proper", status: "resolved", hoursAgo: 120, resolvedAfter: 26, reports: 18 },

  // Stray animals
  { cat: "stray_animals", title: "Aggressive stray dogs near the elementary school", description: "A pack of five stray dogs chases children walking to school in the morning.", barangay: "Palatiw", offset: [0, 30], street: "Palatiw Elementary School", status: "open", hoursAgo: 22, reports: 4 },
  { cat: "stray_animals", title: "Injured stray cat at the barangay hall", description: "An injured cat has been lying near the barangay hall entrance since yesterday.", barangay: "Santa Rosa", offset: [20, 10], street: "Barangay Hall", status: "resolved", hoursAgo: 100, resolvedAfter: 8, reports: 1 },

  // Noise and others
  { cat: "noise", title: "Construction work at night", description: "A construction site runs jackhammers past 11 PM on weeknights.", barangay: "San Antonio", offset: [-60, 90], street: "Garnet Rd", status: "in_progress", hoursAgo: 44, reports: 3 },
  { cat: "others", title: "Fallen tree branch blocking the bike lane", description: "A large branch fell during the storm and blocks the bike lane completely.", barangay: "Oranbo", offset: [30, -20], street: "Shaw Blvd bike lane", status: "resolved", hoursAgo: 80, resolvedAfter: 10, reports: 2 },
  { cat: "others", title: "Vandalized waiting shed", description: "The waiting shed roof was torn off and the bench is broken.", barangay: "Buting", offset: [-30, 0], street: "E. Rodriguez Jr Ave", status: "open", hoursAgo: 130, reports: 1 },
];

const ANON_REPORTERS: Array<[string, string]> = [
  ["Grace Lim", "0919 333 0101"],
  ["Paolo Cruz", "paolo.cruz@example.com"],
  [ "Aileen Torres", "0916 777 0123"],
  ["Ben Ramos", "0905 111 0188"],
];

const METERS_PER_DEG_LAT = 111_320;

function offsetPin(lat: number, lng: number, [east, north]: [number, number]) {
  const dLat = north / METERS_PER_DEG_LAT;
  const dLng = east / (METERS_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180));
  return { latitude: Number((lat + dLat).toFixed(6)), longitude: Number((lng + dLng).toFixed(6)) };
}

function iso(ms: number) {
  return new Date(ms).toISOString().slice(0, 19);
}

export function createSeed(now = Date.now()): MockDb {
  const hour = 3_600_000;
  const year = new Date(now).getFullYear();

  const users: MockUser[] = [
    { id: 1, email: "admin@pkonek.demo", full_name: "Patricia Lopez", role: "pasig_admin", barangay: null, is_active: true, last_login_at: iso(now - 26 * hour), created_at: iso(now - 90 * 24 * hour), password: DEMO_PASSWORD, contact_number: null },
    { id: 2, email: "official@pkonek.demo", full_name: "Ramon Aquino", role: "official", barangay: "Kapitolyo", is_active: true, last_login_at: iso(now - 5 * hour), created_at: iso(now - 80 * 24 * hour), password: DEMO_PASSWORD, contact_number: null },
    { id: 3, email: "ana.reyes@pasig.gov.ph", full_name: "Ana Reyes", role: "official", barangay: "Pinagbuhatan", is_active: true, last_login_at: iso(now - 50 * hour), created_at: iso(now - 60 * 24 * hour), password: DEMO_PASSWORD, contact_number: null },
    { id: 4, email: "carlo.mendoza@pasig.gov.ph", full_name: "Carlo Mendoza", role: "official", barangay: "Santolan", is_active: false, last_login_at: iso(now - 400 * hour), created_at: iso(now - 70 * 24 * hour), password: DEMO_PASSWORD, contact_number: null },
    { id: 5, email: "citizen@pkonek.demo", full_name: "Juan dela Cruz", role: "citizen", barangay: "Kapitolyo", is_active: true, last_login_at: iso(now - 30 * hour), created_at: iso(now - 30 * 24 * hour), password: DEMO_PASSWORD, contact_number: "0917 123 4567" },
  ];
  const citizen = users[4];

  const categories: Category[] = CATEGORIES.map((c, i) => ({ id: i + 1, is_active: true, ...c }));

  const complaints: ComplaintStaff[] = SEED.map((s, i) => {
    const id = i + 1;
    const center = PASIG_BARANGAYS.find((b) => b.name === s.barangay)!;
    const created = now - s.hoursAgo * hour;
    const resolved = s.resolvedAfter !== undefined ? created + s.resolvedAfter * hour : null;
    const updated = resolved ?? (s.status === "open" ? created : created + Math.min(s.hoursAgo, 20) * hour * 0.5);
    const reporter = s.byCitizen ? [citizen.full_name, citizen.email] : (s.reporter ?? ANON_REPORTERS[i % ANON_REPORTERS.length]);
    return {
      id,
      reference_no: `PSG-${year}-${String(id).padStart(6, "0")}`,
      category_id: CAT[s.cat],
      title: s.title,
      description: s.description,
      status: s.status,
      ...offsetPin(center.lat, center.lng, s.offset),
      address_text: `${s.street}, ${s.barangay}, Pasig City`,
      barangay: s.barangay,
      photo_url: null,
      report_count: s.reports ?? 1,
      created_at: iso(created),
      updated_at: iso(updated),
      resolved_at: resolved ? iso(resolved) : null,
      reporter_name: reporter[0],
      reporter_contact: reporter[1],
      created_by_user_id: s.byCitizen ? citizen.id : null,
    };
  });

  const audit: AuditLog[] = [];
  let auditId = 1;
  for (const c of complaints) {
    audit.push({ id: auditId++, actor_user_id: c.created_by_user_id, entity_type: "complaint", entity_id: c.id, action: "create", before_data: null, after_data: { status: "open", title: c.title }, ip_address: null, created_at: c.created_at });
    if (c.status !== "open") {
      audit.push({ id: auditId++, actor_user_id: c.barangay === "Kapitolyo" ? 2 : 1, entity_type: "complaint", entity_id: c.id, action: "status_change", before_data: { status: "open" }, after_data: { status: c.status, resolved_at: c.resolved_at, note: null }, ip_address: null, created_at: c.updated_at });
    }
  }
  audit.sort((a, b) => a.created_at.localeCompare(b.created_at));

  const activity: ActivityLog[] = users
    .filter((u) => u.last_login_at)
    .map((u, i) => ({ id: i + 1, user_id: u.id, email: u.email, action: "login_success", ip_address: "127.0.0.1", user_agent: "Demo browser", details: null, created_at: u.last_login_at! }));

  return { version: 1, users, categories, complaints, supports: [], activity, audit };
}
