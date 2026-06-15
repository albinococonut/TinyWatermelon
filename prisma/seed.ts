// Comprehensive demo seed for the Watermelon HIPAA app.
// Mirrors the rich demo data from the sales app:
//   - Watermelon Therapy org + billing types + rates
//   - 11 real Watermelon Therapy providers
//   - 41 families / children with monthly auth buckets
//   - Full week of appointments (completed, scheduled, cancelled, open slots)
//   - SMS threads from Smart Family Offers
//   - Demo OWNER user
//
// Idempotent: safe to re-run. Uses upsert throughout.
// Run:  npm run db:seed

import { PrismaClient } from "@prisma/client";
import { DEFAULT_RATES, DISCIPLINES } from "../src/lib/types";

const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tuesdayOfCurrentWeek(): string {
  const d = new Date();
  const dow = d.getDay(); // 0=Sun,1=Mon,...,6=Sat
  // Thu(4)/Fri(5)/Sat(6)/Sun(0): use NEXT week so demo data is always future
  let mondayOffset: number;
  if (dow === 0) mondayOffset = 1;        // Sunday → next Monday
  else if (dow <= 3) mondayOffset = -(dow - 1); // Mon-Wed → this Monday
  else mondayOffset = 8 - dow;            // Thu-Sat → next Monday
  d.setDate(d.getDate() + mondayOffset + 1); // Monday + 1 = Tuesday
  return d.toISOString().slice(0, 10);
}

function addDays(dateStr: string, n: number): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return dt.toISOString().slice(0, 10);
}

function isoAt(dateStr: string, hours: number, minutes = 0): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d, hours, minutes, 0, 0);
}

function dayOfWeek(dateStr: string): number {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d).getDay();
}

// Simple deterministic PRNG
function mulberry32(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("→ Seeding comprehensive HIPAA demo data…");

  const TODAY = tuesdayOfCurrentWeek();
  const weekday = dayOfWeek(TODAY);
  const MONDAY = addDays(TODAY, weekday === 0 ? -6 : 1 - weekday);

  // ── Organization ──────────────────────────────────────────────────────────
  const org = await prisma.organization.upsert({
    where: { slug: "watermelon-therapy" },
    update: { name: "Watermelon Therapy", baseAddress: "4761 Cass Street, San Diego, CA 92109" },
    create: {
      name: "Watermelon Therapy",
      slug: "watermelon-therapy",
      baseAddress: "4761 Cass Street, San Diego, CA 92109",
      smartOffersEnabled: true,
      smartOfferDelayMin: 5,
      lastMinuteTriggerHours: 3,
      maxOfferRecipients: 8,
    },
  });
  console.log(`  Org: ${org.name} (${org.id})`);

  // ── Billing types ─────────────────────────────────────────────────────────
  const billingTypes = [
    { label: "Private Pay",               defaultRatePerHour: 185.0, includesTravel: false, sortOrder: 0, color: "#FF6B9D" }, // watermelon pink
    { label: "Private Pay with Travel",   defaultRatePerHour: 200.0, includesTravel: true,  sortOrder: 1, color: "#FFE135" }, // sunny yellow
    { label: "San Diego Regional Center", defaultRatePerHour: 155.0, includesTravel: false, sortOrder: 2, color: "#00BFFF" }, // sky blue
  ];
  const btMap: Record<string, string> = {};
  for (const bt of billingTypes) {
    const existing = await prisma.billingType.findFirst({ where: { organizationId: org.id, label: bt.label } });
    const rec = existing
      ? await prisma.billingType.update({ where: { id: existing.id }, data: bt })
      : await prisma.billingType.create({ data: { organizationId: org.id, ...bt } });
    btMap[bt.label] = rec.id;
  }
  console.log(`  Billing types: ${billingTypes.length}`);

  // ── Rates ─────────────────────────────────────────────────────────────────
  for (const d of DISCIPLINES) {
    await prisma.rateSetting.upsert({
      where: { organizationId_discipline: { organizationId: org.id, discipline: d } },
      update: { gpPerHour: DEFAULT_RATES[d] },
      create: { organizationId: org.id, discipline: d, gpPerHour: DEFAULT_RATES[d] },
    });
  }

  // ── Service types ─────────────────────────────────────────────────────────
  const DEFAULT_SERVICE_TYPES = [
    { code: "OT",  label: "Occupational Therapy",   sortOrder: 0 },
    { code: "PT",  label: "Physical Therapy",        sortOrder: 1 },
    { code: "SLP", label: "Speech-Language Therapy", sortOrder: 2 },
    { code: "MT",  label: "Music Therapy",           sortOrder: 3 },
    { code: "ABA", label: "ABA Therapy",             sortOrder: 4 },
  ];
  for (const st of DEFAULT_SERVICE_TYPES) {
    await prisma.serviceType.upsert({
      where: { organizationId_code: { organizationId: org.id, code: st.code } },
      update: { label: st.label, sortOrder: st.sortOrder },
      create: { organizationId: org.id, ...st, active: true },
    });
  }
  console.log(`  Service types: ${DEFAULT_SERVICE_TYPES.length}`);

  // ── Owner user ────────────────────────────────────────────────────────────
  const owner = await prisma.user.upsert({
    where: { email: "owner@watermelon-therapy.example.com" },
    update: {},
    create: { email: "owner@watermelon-therapy.example.com", name: "Demo Owner" },
  });
  await prisma.membership.upsert({
    where: { userId_organizationId: { userId: owner.id, organizationId: org.id } },
    update: { role: "ADMIN", acceptedAt: new Date() },
    create: { userId: owner.id, organizationId: org.id, role: "ADMIN", acceptedAt: new Date() },
  });
  console.log(`  Owner: ${owner.email}`);

  // ── Providers ─────────────────────────────────────────────────────────────
  const PROVIDERS = [
    { name: "Maya Chen",            credentials: "MS, OTR/L",    title: "Clinical Coordinator & Occupational Therapist", discipline: "OT",  bilingual: false, avatarHue: 0   },
    { name: "Jordan Blake",         credentials: "MT-BC",         title: "Music Therapist",                               discipline: "MT",  bilingual: false, avatarHue: 53  },
    { name: "Sofia Reyes",          credentials: "M.S. CFY-SLP",  title: "Speech Language Pathologist",                   discipline: "SLP", bilingual: false, avatarHue: 106 },
    { name: "Emma Sullivan",        credentials: "MA, CCC-SLP",   title: "Speech Language Pathologist",                   discipline: "SLP", bilingual: false, avatarHue: 159 },
    { name: "Isabella Torres",      credentials: "MA, CCC-SLP",   title: "Bilingual Speech Language Pathologist",          discipline: "SLP", bilingual: true,  avatarHue: 212 },
    { name: "Olivia Park",          credentials: "MA, CCC-SLP",   title: "Speech Language Pathologist",                   discipline: "SLP", bilingual: false, avatarHue: 265 },
    { name: "Rachel Kim",           credentials: "PT, DPT",       title: "Physical Therapist",                            discipline: "PT",  bilingual: false, avatarHue: 318 },
    { name: "Avery Morgan",         credentials: "MT-BC",         title: "Music Therapist",                               discipline: "MT",  bilingual: false, avatarHue: 11  },
    { name: "Chloe Andersen",       credentials: "MS, OTR/L",     title: "Occupational Therapist",                        discipline: "OT",  bilingual: false, avatarHue: 64  },
    { name: "Natalie Brooks",       credentials: "MS, OTR/L",     title: "Occupational Therapist",                        discipline: "OT",  bilingual: false, avatarHue: 117 },
    { name: "Priya Sharma",         credentials: "OTD, OTR/L",    title: "Occupational Therapist",                        discipline: "OT",  bilingual: false, avatarHue: 170 },
  ];

  const providerIds: string[] = [];
  for (const p of PROVIDERS) {
    const existing = await prisma.provider.findFirst({ where: { organizationId: org.id, name: p.name } });
    const rec = existing
      ? await prisma.provider.update({ where: { id: existing.id }, data: { ...p, organizationId: org.id, bufferMinutes: 15, weeklyTargetHours: 28, startAddress: "4761 Cass Street, San Diego, CA 92109" } })
      : await prisma.provider.create({ data: { ...p, organizationId: org.id, bufferMinutes: 15, weeklyTargetHours: 28, startAddress: "4761 Cass Street, San Diego, CA 92109" } });
    providerIds.push(rec.id);
  }
  console.log(`  Providers: ${providerIds.length}`);

  // ── Provider demo user — Jordan Blake (Music Therapist) ───────────────────
  const jordanProvider = await prisma.provider.findFirst({
    where: { organizationId: org.id, name: "Jordan Blake" },
    select: { id: true },
  });
  if (jordanProvider) {
    const jordanUser = await prisma.user.upsert({
      where: { email: "jordan@watermelon-therapy.example.com" },
      update: {},
      create: { email: "jordan@watermelon-therapy.example.com", name: "Jordan Blake" },
    });
    await prisma.membership.upsert({
      where: { userId_organizationId: { userId: jordanUser.id, organizationId: org.id } },
      update: { role: "PROVIDER", providerId: jordanProvider.id, acceptedAt: new Date() },
      create: { userId: jordanUser.id, organizationId: org.id, role: "PROVIDER", providerId: jordanProvider.id, acceptedAt: new Date() },
    });
    console.log(`  Provider demo user: ${jordanUser.email}`);
  }

  // ── Families & Children ───────────────────────────────────────────────────
  // Approximate lat/lng per San Diego neighborhood (for commute engine)
  const NEIGHBORHOOD_COORDS: Record<string, [number, number]> = {
    "Pacific Beach":  [32.799, -117.234],
    "La Jolla":       [32.847, -117.274],
    "Del Mar":        [32.959, -117.265],
    "Ocean Beach":    [32.743, -117.250],
    "Point Loma":     [32.729, -117.217],
    "Mission Beach":  [32.786, -117.252],
    "North Park":     [32.749, -117.129],
    "Hillcrest":      [32.748, -117.158],
    "Mission Valley": [32.770, -117.155],
    "Carmel Valley":  [32.930, -117.212],
    "Bay Park":       [32.785, -117.195],
    "Encinitas":      [33.037, -117.292],
    "Clairemont":     [32.823, -117.183],
    "Sunset Cliffs":  [32.717, -117.254],
  };

  const FAMILIES: Array<{
    parentName: string; phone: string; email?: string; pref: "school"|"home"|"other";
    homeAddr?: string; homeNeighborhood?: string; homeCity?: string; homeZip?: string;
    travelNotes?: string; billingLabel: string; customRate?: number;
    child: { first: string; last: string; age: number };
    auth: Partial<Record<string, number>>;
  }> = [
    { parentName: "Sofia Alvarez",    phone: "(619) 555-0114", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Mateo",    last: "Alvarez",   age: 4 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "1245 Diamond Street", homeNeighborhood: "Pacific Beach", homeCity: "San Diego", homeZip: "92109" },
    { parentName: "Anna Chen",        phone: "(858) 555-0182", pref: "home",   billingLabel: "Private Pay", customRate: 200, child: { first: "Lily",     last: "Chen",      age: 6 }, auth: { OT: 20 }, homeAddr: "7642 Fay Avenue", homeNeighborhood: "La Jolla", homeCity: "San Diego", homeZip: "92037", travelNotes: "Park on Eads side; gate code at front" },
    { parentName: "Jessica Williams", phone: "(619) 555-0143", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Noah",     last: "Williams",  age: 5 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "956 Opal Street", homeNeighborhood: "Pacific Beach", homeCity: "San Diego", homeZip: "92109" },
    { parentName: "Priya Patel",      phone: "(858) 555-0119", pref: "home",   billingLabel: "Private Pay with Travel", child: { first: "Aria",     last: "Patel",     age: 3 }, auth: { MT: 16, SLP: 16 }, homeAddr: "3645 Del Mar Heights Road", homeNeighborhood: "Carmel Valley", homeCity: "San Diego", homeZip: "92130", travelNotes: "Naps 12–2pm" },
    { parentName: "Daniel Rosenberg", phone: "(619) 555-0166", pref: "home",   billingLabel: "San Diego Regional Center", child: { first: "Eli",      last: "Rosenberg",  age: 7 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "2814 30th Street", homeNeighborhood: "North Park", homeCity: "San Diego", homeZip: "92104" },
    { parentName: "Mariana Garcia",   phone: "(619) 555-0177", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Sienna",   last: "Garcia",    age: 4 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "1502 Catalina Boulevard", homeNeighborhood: "Ocean Beach", homeCity: "San Diego", homeZip: "92107" },
    { parentName: "Rachel Thompson",  phone: "(858) 555-0148", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Owen",     last: "Thompson",  age: 8 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "412 Nautilus Street", homeNeighborhood: "La Jolla", homeCity: "San Diego", homeZip: "92037" },
    { parentName: "Helen Kim",        phone: "(619) 555-0192", pref: "home",   billingLabel: "Private Pay", child: { first: "Maya",     last: "Kim",       age: 5 }, auth: { MT: 8 }, homeAddr: "1832 Bayard Street", homeNeighborhood: "Pacific Beach", homeCity: "San Diego", homeZip: "92109", travelNotes: "Dog in front yard — text on arrival" },
    { parentName: "Megan Murphy",     phone: "(619) 555-0125", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Jack",     last: "Murphy",    age: 6 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "3578 Mission Boulevard", homeNeighborhood: "Mission Beach", homeCity: "San Diego", homeZip: "92109" },
    { parentName: "Kim Nguyen",       phone: "(858) 555-0157", pref: "home",   billingLabel: "Private Pay with Travel", child: { first: "Zoe",      last: "Nguyen",    age: 4 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "5021 Balboa Avenue", homeNeighborhood: "Clairemont", homeCity: "San Diego", homeZip: "92117" },
    { parentName: "Lauren Brooks",    phone: "(619) 555-0138", pref: "home",   billingLabel: "San Diego Regional Center", child: { first: "Theo",     last: "Brooks",    age: 3 }, auth: { SLP: 16, MT: 16 }, homeAddr: "2435 Friars Road", homeNeighborhood: "Mission Valley", homeCity: "San Diego", homeZip: "92108" },
    { parentName: "Carolina Romero",  phone: "(619) 555-0162", pref: "other",  billingLabel: "San Diego Regional Center", child: { first: "Isla",     last: "Romero",    age: 7 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "3812 Fourth Avenue", homeNeighborhood: "Hillcrest", homeCity: "San Diego", homeZip: "92103", travelNotes: "Grandma's house Tues/Thurs at 3271 Sunset Cliffs Blvd" },
    { parentName: "Grace Park",       phone: "(619) 555-0107", pref: "school", billingLabel: "Private Pay", child: { first: "Henry",    last: "Park",      age: 5 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "1245 Diamond Street", homeNeighborhood: "Pacific Beach", homeCity: "San Diego", homeZip: "92109" },
    { parentName: "Hannah Schultz",   phone: "(858) 555-0173", pref: "home",   billingLabel: "Private Pay with Travel", child: { first: "Nora",     last: "Schultz",   age: 6 }, auth: { OT: 16, MT: 16 }, homeAddr: "1437 Camino Del Mar", homeNeighborhood: "Del Mar", homeCity: "Del Mar", homeZip: "92014", travelNotes: "Limited parking — use guest spots" },
    { parentName: "Ana Hernandez",    phone: "(619) 555-0194", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Diego",    last: "Hernandez", age: 4 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "3145 Burgener Boulevard", homeNeighborhood: "Bay Park", homeCity: "San Diego", homeZip: "92110" },
    { parentName: "Jenna Foster",     phone: "(760) 555-0145", pref: "home",   billingLabel: "Private Pay with Travel", child: { first: "Ruby",     last: "Foster",    age: 8 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "212 K Street", homeNeighborhood: "Encinitas", homeCity: "Encinitas", homeZip: "92024", travelNotes: "Long drive — Wednesdays only preferred" },
    // Additional families
    { parentName: "Erin Bennett",     phone: "(619) 555-0211", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Liam",     last: "Bennett",   age: 5 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "1832 Bayard Street", homeNeighborhood: "Pacific Beach", homeCity: "San Diego", homeZip: "92109" },
    { parentName: "Rachel Cohen",     phone: "(858) 555-0223", pref: "school", billingLabel: "Private Pay", child: { first: "Ava",      last: "Cohen",     age: 4 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "412 Nautilus Street", homeNeighborhood: "La Jolla", homeCity: "San Diego", homeZip: "92037" },
    { parentName: "Veronica Diaz",    phone: "(619) 555-0234", pref: "home",   billingLabel: "San Diego Regional Center", child: { first: "Mason",    last: "Diaz",      age: 6 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "1502 Catalina Boulevard", homeNeighborhood: "Ocean Beach", homeCity: "San Diego", homeZip: "92107" },
    { parentName: "Lindsey Edwards",  phone: "(858) 555-0245", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Charlotte", last: "Edwards",   age: 7 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "3645 Del Mar Heights Road", homeNeighborhood: "Carmel Valley", homeCity: "San Diego", homeZip: "92130" },
    { parentName: "Maria Flores",     phone: "(619) 555-0256", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Ethan",    last: "Flores",    age: 3 }, auth: { SLP: 16, MT: 16 }, homeAddr: "956 Opal Street", homeNeighborhood: "Pacific Beach", homeCity: "San Diego", homeZip: "92109" },
    { parentName: "Anjali Gupta",     phone: "(858) 555-0267", pref: "home",   billingLabel: "Private Pay", customRate: 210, child: { first: "Mia",      last: "Gupta",     age: 5 }, auth: { OT: 20 }, homeAddr: "1437 Camino Del Mar", homeNeighborhood: "Del Mar", homeCity: "Del Mar", homeZip: "92014" },
    { parentName: "Sarah Hayes",      phone: "(619) 555-0278", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Lucas",    last: "Hayes",     age: 4 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "2814 30th Street", homeNeighborhood: "North Park", homeCity: "San Diego", homeZip: "92104" },
    { parentName: "Divya Iyer",       phone: "(858) 555-0289", pref: "school", billingLabel: "Private Pay with Travel", child: { first: "Amelia",   last: "Iyer",      age: 6 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "7642 Fay Avenue", homeNeighborhood: "La Jolla", homeCity: "San Diego", homeZip: "92037" },
    { parentName: "Tasha Jackson",    phone: "(619) 555-0290", pref: "home",   billingLabel: "San Diego Regional Center", child: { first: "Logan",    last: "Jackson",   age: 8 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "3812 Fourth Avenue", homeNeighborhood: "Hillcrest", homeCity: "San Diego", homeZip: "92103" },
    { parentName: "Rebecca Klein",    phone: "(858) 555-0301", pref: "home",   billingLabel: "San Diego Regional Center", child: { first: "Harper",   last: "Klein",     age: 4 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "2435 Friars Road", homeNeighborhood: "Mission Valley", homeCity: "San Diego", homeZip: "92108" },
    { parentName: "Mia Lopez",        phone: "(619) 555-0312", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Benjamin", last: "Lopez",     age: 5 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "3145 Burgener Boulevard", homeNeighborhood: "Bay Park", homeCity: "San Diego", homeZip: "92110" },
    { parentName: "Camila Morales",   phone: "(619) 555-0323", pref: "school", billingLabel: "Private Pay", child: { first: "Evelyn",   last: "Morales",   age: 7 }, auth: { MT: 16 }, homeAddr: "3578 Mission Boulevard", homeNeighborhood: "Mission Beach", homeCity: "San Diego", homeZip: "92109" },
    { parentName: "Erin O'Brien",     phone: "(858) 555-0334", pref: "home",   billingLabel: "San Diego Regional Center", child: { first: "Carter",   last: "O'Brien",   age: 3 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "1245 Diamond Street", homeNeighborhood: "Pacific Beach", homeCity: "San Diego", homeZip: "92109" },
    { parentName: "Neha Patel",       phone: "(619) 555-0345", pref: "home",   billingLabel: "Private Pay with Travel", child: { first: "Sophia",   last: "Patel",     age: 6 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "212 K Street", homeNeighborhood: "Encinitas", homeCity: "Encinitas", homeZip: "92024" },
    { parentName: "Daniela Reyes",    phone: "(619) 555-0356", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Wyatt",    last: "Reyes",     age: 5 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "3271 Sunset Cliffs Boulevard", homeNeighborhood: "Point Loma", homeCity: "San Diego", homeZip: "92106" },
    { parentName: "Beth Stein",       phone: "(858) 555-0367", pref: "home",   billingLabel: "San Diego Regional Center", child: { first: "Aurora",   last: "Stein",     age: 4 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "5021 Balboa Avenue", homeNeighborhood: "Clairemont", homeCity: "San Diego", homeZip: "92117" },
    { parentName: "Mei Tan",          phone: "(619) 555-0378", pref: "school", billingLabel: "Private Pay", customRate: 195, child: { first: "Daniel",   last: "Tan",       age: 7 }, auth: { SLP: 20 }, homeAddr: "956 Opal Street", homeNeighborhood: "Pacific Beach", homeCity: "San Diego", homeZip: "92109" },
    { parentName: "Kate Underwood",   phone: "(619) 555-0389", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Hazel",    last: "Underwood", age: 4 }, auth: { OT: 16, MT: 16 }, homeAddr: "3578 Mission Boulevard", homeNeighborhood: "Mission Beach", homeCity: "San Diego", homeZip: "92109" },
    { parentName: "Lucia Vargas",     phone: "(858) 555-0390", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Sebastian", last: "Vargas",    age: 6 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "412 Nautilus Street", homeNeighborhood: "La Jolla", homeCity: "San Diego", homeZip: "92037" },
    { parentName: "Bridget Walsh",    phone: "(619) 555-0401", pref: "home",   billingLabel: "San Diego Regional Center", child: { first: "Penelope",  last: "Walsh",     age: 5 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "3812 Fourth Avenue", homeNeighborhood: "Hillcrest", homeCity: "San Diego", homeZip: "92103" },
    { parentName: "Lin Xu",           phone: "(858) 555-0412", pref: "home",   billingLabel: "San Diego Regional Center", child: { first: "Jaxon",    last: "Xu",        age: 3 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "3645 Del Mar Heights Road", homeNeighborhood: "Carmel Valley", homeCity: "San Diego", homeZip: "92130" },
    { parentName: "Holly Yates",      phone: "(858) 555-0423", pref: "school", billingLabel: "Private Pay with Travel", child: { first: "Stella",    last: "Yates",     age: 7 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "1437 Camino Del Mar", homeNeighborhood: "Del Mar", homeCity: "Del Mar", homeZip: "92014" },
    { parentName: "Whitney Zane",     phone: "(619) 555-0434", pref: "school", billingLabel: "San Diego Regional Center", child: { first: "Oliver",    last: "Zane",      age: 6 }, auth: { SLP: 16, OT: 16, PT: 16 }, homeAddr: "2814 30th Street", homeNeighborhood: "North Park", homeCity: "San Diego", homeZip: "92104" },
    { parentName: "Olivia Bryant",    phone: "(619) 555-0445", pref: "home",   billingLabel: "San Diego Regional Center", child: { first: "Hannah",    last: "Bryant",    age: 4 }, auth: { MT: 16, SLP: 16 }, homeAddr: "1502 Catalina Boulevard", homeNeighborhood: "Ocean Beach", homeCity: "San Diego", homeZip: "92107" },
    { parentName: "Brooke Cassidy",   phone: "(858) 555-0456", pref: "school", billingLabel: "Private Pay", customRate: 225, child: { first: "Caleb",     last: "Cassidy",   age: 5 }, auth: { OT: 20, PT: 16 }, homeAddr: "7642 Fay Avenue", homeNeighborhood: "La Jolla", homeCity: "San Diego", homeZip: "92037" },
  ];

  // Create/update families + children + authorized services
  const childRecords: Array<{ childId: string; discipline: string; familyId: string; idx: number }> = [];

  for (let i = 0; i < FAMILIES.length; i++) {
    const f = FAMILIES[i];
    const btId = btMap[f.billingLabel] ?? null;

    // Upsert family by contact phone — always update coords so drive times work
    const coords = f.homeNeighborhood ? NEIGHBORHOOD_COORDS[f.homeNeighborhood] : null;
    let family = await prisma.family.findFirst({ where: { organizationId: org.id, primaryContactPhone: f.phone } });
    if (!family) {
      family = await prisma.family.create({
        data: {
          organizationId: org.id,
          primaryContactName: f.parentName,
          primaryContactPhone: f.phone,
          homeAddress: f.homeAddr ?? null,
          homeNeighborhood: f.homeNeighborhood ?? null,
          homeCity: f.homeCity ?? null,
          homeZip: f.homeZip ?? null,
          homeLat: coords ? coords[0] : null,
          homeLng: coords ? coords[1] : null,
          preferredLocation: f.pref,
          travelNotes: f.travelNotes ?? null,
          billingTypeId: btId,
          customRatePerHour: f.customRate ?? null,
        },
      });
    } else if (coords && !family.homeLat) {
      // Update coords for families that existed before coords were added
      await prisma.family.update({
        where: { id: family.id },
        data: { homeLat: coords[0], homeLng: coords[1] },
      });
      family = { ...family, homeLat: coords[0], homeLng: coords[1] };
    }

    // Upsert child
    let child = await prisma.child.findFirst({ where: { familyId: family.id, firstName: f.child.first, lastName: f.child.last } });
    if (!child) {
      child = await prisma.child.create({
        data: {
          organizationId: org.id,
          familyId: family.id,
          firstName: f.child.first,
          lastName: f.child.last,
          ageYears: f.child.age,
        },
      });
    }

    // Upsert authorized services
    for (const [disc, hrs] of Object.entries(f.auth)) {
      await prisma.authorizedService.upsert({
        where: { childId_discipline: { childId: child.id, discipline: disc } },
        update: { monthlyHours: hrs as number },
        create: { childId: child.id, discipline: disc, monthlyHours: hrs as number },
      });
      childRecords.push({ childId: child.id, discipline: disc, familyId: family.id, idx: i });
    }

    // Availability windows (Mon-Fri afternoons default)
    const existingAvail = await prisma.parentAvailability.count({ where: { childId: child.id } });
    if (existingAvail === 0) {
      const windows = [1,2,3,4,5].map(dow => ({ childId: child!.id, dayOfWeek: dow, startMinutes: 14*60, endMinutes: 18*60 }));
      if (i % 3 === 0) windows.push({ childId: child.id, dayOfWeek: 6, startMinutes: 9*60, endMinutes: 12*60 });
      if (i % 4 === 0) { windows.push({ childId: child.id, dayOfWeek: 1, startMinutes: 9*60, endMinutes: 12*60 }); windows.push({ childId: child.id, dayOfWeek: 3, startMinutes: 9*60, endMinutes: 12*60 }); }
      await prisma.parentAvailability.createMany({ data: windows });
    }
  }
  console.log(`  Families: ${FAMILIES.length} · Children: ${childRecords.length}`);

  // ── Appointments ──────────────────────────────────────────────────────────
  // Clear all existing appointments + related records so re-seeding is clean
  await prisma.recoveredRevenueEvent.deleteMany({ where: { organizationId: org.id } });
  await prisma.lostRevenueEvent.deleteMany({ where: { organizationId: org.id } });
  await prisma.smartOfferRecipient.deleteMany({ where: { smartOffer: { organizationId: org.id } } });
  await prisma.smartOffer.deleteMany({ where: { organizationId: org.id } });
  await prisma.message.deleteMany({ where: { thread: { organizationId: org.id } } });
  await prisma.smsThread.deleteMany({ where: { organizationId: org.id } });
  await prisma.appointment.deleteMany({ where: { organizationId: org.id } });

  // Generate Mon-Fri for current week + 2 past weeks + 2 future weeks
  const rand = mulberry32(2026_06_01);
  const todayTs = new Date(TODAY + "T12:00:00").getTime();
  const usedHours = new Map<string, number>(); // childId::discipline -> used
  let totalAppts = 0;

  // Delete existing appointments for a fresh seed
  await prisma.appointment.deleteMany({ where: { organizationId: org.id } });

  for (let weekOff = -2; weekOff <= 2; weekOff++) {
    const weekMonday = addDays(MONDAY, weekOff * 7);
    // Clear per-week bucket usage for current week only
    if (weekOff === 0) usedHours.clear();

    for (const [pIdx, providerId] of providerIds.entries()) {
      const provider = PROVIDERS[pIdx];
      const disc = provider.discipline;
      // Pool of children for this discipline
      const pool = childRecords.filter(c => c.discipline === disc);
      if (pool.length === 0) continue;
      let cursor = (pIdx * 3 + weekOff * 7) % pool.length;

      for (let dayOff = 0; dayOff < 5; dayOff++) {
        const date = addDays(weekMonday, dayOff);
        let cur = 9 * 60; // 9am
        const endOfDay = 17 * 60 + 30;
        let sessionsToday = 0;

        while (cur < endOfDay && sessionsToday < 6) {
          const dur = 60;
          const hoursThisSession = dur / 60;
          if (cur + dur > endOfDay) break;

          let chosen = pool[cursor % pool.length];
          if (!chosen) break;
          // Current week: check monthly cap (5h default)
          if (weekOff === 0) {
            let found = false;
            for (let tries = 0; tries < pool.length; tries++) {
              const cand = pool[(cursor + tries) % pool.length];
              if (!cand) continue;
              const key = `${cand.childId}::${disc}`;
              const used = usedHours.get(key) ?? 0;
              const cap = FAMILIES[cand.idx]?.auth[disc] ?? 5;
              if (used + hoursThisSession <= cap + 0.01) {
                chosen = cand; cursor = (cursor + tries + 1) % pool.length; found = true; break;
              }
            }
            if (!found) break;
            const key = `${chosen.childId}::${disc}`;
            usedHours.set(key, (usedHours.get(key) ?? 0) + hoursThisSession);
          } else {
            cursor = (cursor + 1) % pool.length;
          }

          const startsAt = isoAt(date, Math.floor(cur / 60), cur % 60);
          const endsAt = new Date(startsAt.getTime() + dur * 60_000);
          const startTs = startsAt.getTime();
          let status: string;
          if (weekOff < 0) status = "COMPLETED";
          else if (weekOff > 0) status = "SCHEDULED";
          else status = startTs < todayTs ? "COMPLETED" : "SCHEDULED";

          await prisma.appointment.create({
            data: {
              organizationId: org.id,
              providerId,
              childId: chosen.childId,
              discipline: disc,
              startsAt,
              endsAt,
              locationType: FAMILIES[chosen.idx]?.pref ?? "school",
              locationAddress: FAMILIES[chosen.idx]?.homeAddr ?? "4761 Cass Street, San Diego, CA 92109",
              status,
            },
          });
          totalAppts++;

          let advance = dur + 15;
          if (cur >= 11 * 60 && cur < 13 * 60 && sessionsToday === 2) advance += 30;
          cur += advance; sessionsToday++;
        }
      }
    }
  }
  console.log(`  Appointments: ${totalAppts}`);

  // ── Layer cancellations (current week only) ───────────────────────────────
  const futureAppts = await prisma.appointment.findMany({
    where: { organizationId: org.id, status: "SCHEDULED" },
    take: 200,
    orderBy: { startsAt: "asc" },
  });

  // 12 family cancellations → paired open slots (spread across disciplines + days)
  const familyCancels = futureAppts.slice(0, 12);
  const cancelReasons = ["CHILD_SICK","FAMILY_TRAVEL","PARENT_FORGOT","SCHOOL_CONFLICT"];
  for (const a of familyCancels) {
    await prisma.appointment.update({ where: { id: a.id }, data: {
      status: "CANCELLED_FAMILY",
      cancellationReason: cancelReasons[Math.floor(rand()*cancelReasons.length)],
      cancelledBy: "family", cancelledAt: new Date(),
    }});
    // Paired open slot
    await prisma.appointment.create({ data: {
      organizationId: org.id, providerId: a.providerId, discipline: a.discipline,
      startsAt: a.startsAt, endsAt: a.endsAt, status: "OPEN_SLOT",
      locationType: "school", locationAddress: "4761 Cass Street, San Diego, CA 92109",
      notes: "Family cancelled — provider time opened for recovery",
    }});
  }

  // 8 provider cancellations → NO open slot (provider unavailable)
  const providerCancels = futureAppts.slice(12, 20);
  for (const a of providerCancels) {
    await prisma.appointment.update({ where: { id: a.id }, data: {
      status: "CANCELLED_PROVIDER",
      cancellationReason: "PROVIDER_OUT",
      cancelledBy: "provider", cancelledAt: new Date(),
    }});
  }

  // 8 intentional open availability blocks across the week + disciplines
  const openTimes = [9, 10, 11, 13, 14, 15, 16, 9];
  for (let i = 0; i < 8; i++) {
    const pId = providerIds[i % providerIds.length];
    const disc = PROVIDERS[i % PROVIDERS.length].discipline;
    const date = addDays(MONDAY, 1 + (i % 5)); // Mon-Fri spread
    await prisma.appointment.create({ data: {
      organizationId: org.id, providerId: pId, discipline: disc,
      startsAt: isoAt(date, openTimes[i], 0), endsAt: isoAt(date, openTimes[i] + 1, 0),
      status: "OPEN_SLOT",
      locationType: "school", locationAddress: "4761 Cass Street, San Diego, CA 92109",
      notes: "Intentionally open availability — makeup block",
    }});
  }

  // 4 filled makeups
  const recentScheduled = await prisma.appointment.findMany({
    where: { organizationId: org.id, status: "SCHEDULED", startsAt: { lt: new Date(MONDAY + "T00:00:00") } },
    take: 4, orderBy: { startsAt: "asc" },
  });
  for (const a of recentScheduled) {
    await prisma.appointment.update({ where: { id: a.id }, data: { status: "FILLED_MAKEUP" }});
    // Revenue snapshot
    const rate = await prisma.rateSetting.findFirst({ where: { organizationId: org.id, discipline: a.discipline }});
    const hrs = (a.endsAt.getTime() - a.startsAt.getTime()) / 3_600_000;
    await prisma.recoveredRevenueEvent.create({ data: {
      organizationId: org.id, appointmentId: a.id,
      childId: a.childId, amount: hrs * (rate?.gpPerHour ?? 185),
    }});
  }
  console.log(`  Cancellations + open slots + makeups layered`);

  // ── SMS threads ───────────────────────────────────────────────────────────
  await prisma.smsThread.deleteMany({ where: { organizationId: org.id } });
  const openSlots = await prisma.appointment.findMany({
    where: { organizationId: org.id, status: "OPEN_SLOT" },
    include: { provider: { select: { name: true } } },
    take: 3
  });
  // Get a few different families for realistic variety
  const smsFamilies = await prisma.family.findMany({ where: { organizationId: org.id }, take: 4 });
  const [smsFam0, smsFam1, smsFam2, smsFam3] = smsFamilies;

  // ── Offer-based threads (tied to open slots if available) ─────────────────
  if (smsFam0 && openSlots.length > 0) {
    for (let i = 0; i < Math.min(3, openSlots.length); i++) {
      const slot = openSlots[i];
      const providerFirst = (slot.provider?.name ?? "Your provider").split(" ")[0];
      const slotDate = slot.startsAt;
      const slotTime = slotDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
      const weekday = slotDate.toLocaleDateString("en-US", { weekday: "long" });
      const month = slotDate.toLocaleDateString("en-US", { month: "long" });
      const dayNum = slotDate.getDate();
      const ordSuffix = ["th","st","nd","rd"][((dayNum-20)%10<4 && (dayNum-20)%10>0) ? (dayNum-20)%10 : (dayNum%10<4 ? dayNum%10 : 0)] ?? "th";
      const fullDate = `${weekday} ${month} ${dayNum}${ordSuffix}`;
      const shortDate = `${slotDate.getMonth()+1}/${slotDate.getDate()}`;
      const link = `wmln.app/o/${slot.id.slice(0,8)}`;
      const offerMsg = `A make-up appointment is available with ${providerFirst} on ${fullDate} at ${slotTime}.\nTap to claim: ${link}\n\nSent by TinyWatermelon.com`;
      const filledMsg = `${providerFirst}'s appointment on ${shortDate} at ${slotTime} has been filled.\nWe'll text you if another spot opens.\n\nSent by TinyWatermelon.com`;
      const confirmedMsg = `Great news — your appointment with ${providerFirst} on ${fullDate} at ${slotTime} is confirmed. See you then!\n\nSent by TinyWatermelon.com`;
      await prisma.smsThread.create({ data: {
        organizationId: org.id, familyId: smsFam0.id,
        topic: `Smart Family Offer — ${weekday} ${slotTime}`,
        status: i === 0 ? "accepted" : i === 1 ? "awaiting_reply" : "resolved",
        messages: { create: [
          { direction: "OUTBOUND" as const, body: offerMsg, sentAt: new Date(Date.now() - 15*60_000) },
          ...( i === 0 ? [
            { direction: "INBOUND" as const, body: "Yes! We'll take it.", sentAt: new Date(Date.now() - 10*60_000) },
            { direction: "OUTBOUND" as const, body: confirmedMsg, sentAt: new Date(Date.now() - 9*60_000) },
          ] : [] ),
          ...( i === 2 ? [
            { direction: "INBOUND" as const, body: "Can't make it this week — out of town. Thanks though!", sentAt: new Date(Date.now() - 5*60_000) },
            { direction: "OUTBOUND" as const, body: filledMsg, sentAt: new Date(Date.now() - 4*60_000) },
          ] : [] ),
        ]},
      }});
    }
  }

  // ── Always-present unread family inquiry threads ───────────────────────────
  // These guarantee the unread badge shows on every demo load.
  // lastAdminReadAt is null (not set), latest message is INBOUND → shows as unread.
  if (smsFam1) {
    await prisma.smsThread.create({ data: {
      organizationId: org.id, familyId: smsFam1.id,
      topic: "Schedule question",
      status: "awaiting_reply",
      // lastAdminReadAt intentionally NOT set → unread
      messages: { create: [
        { direction: "OUTBOUND" as const, body: "Hi! Just a reminder that your appointment is coming up this week. Let us know if you have any questions!", sentAt: new Date(Date.now() - 2*60*60_000) },
        { direction: "INBOUND" as const, body: "Hi! Quick question — can we do 30 minutes earlier next week? My son has soccer right after.", sentAt: new Date(Date.now() - 18*60_000) },
      ]},
    }});
  }
  if (smsFam2) {
    await prisma.smsThread.create({ data: {
      organizationId: org.id, familyId: smsFam2.id,
      topic: "Cancellation notice",
      status: "awaiting_reply",
      messages: { create: [
        { direction: "INBOUND" as const, body: "We need to cancel Thursday's appointment — my daughter is sick. So sorry for the late notice!", sentAt: new Date(Date.now() - 7*60_000) },
      ]},
    }});
  }
  if (smsFam3) {
    await prisma.smsThread.create({ data: {
      organizationId: org.id, familyId: smsFam3.id,
      topic: "Progress update request",
      status: "awaiting_reply",
      messages: { create: [
        { direction: "OUTBOUND" as const, body: "Great session today! We worked on fine motor skills and made excellent progress.", sentAt: new Date(Date.now() - 3*60*60_000) },
        { direction: "INBOUND" as const, body: "Thank you so much! Are there exercises we can do at home to help reinforce what you're working on?", sentAt: new Date(Date.now() - 3*60_000) },
      ]},
    }});
  }

  console.log(`  SMS threads: ${Math.min(3, openSlots.length)} offer + 3 unread family messages`);

  // ── Lost revenue events ───────────────────────────────────────────────────
  await prisma.lostRevenueEvent.deleteMany({ where: { organizationId: org.id } });
  const lostSpecs = [
    { disc: "OT", hrs: 2, daysAgo: 18, reason: "AUTH_EXPIRED" },
    { disc: "MT", hrs: 1.5, daysAgo: 12, reason: "AUTH_EXPIRED" },
    { disc: "OT", hrs: 1, daysAgo: 24, reason: "NO_MATCH_FOUND" },
    { disc: "PT", hrs: 1.5, daysAgo: 28, reason: "AUTH_EXPIRED" },
  ];
  const firstChild = await prisma.child.findFirst({ where: { organizationId: org.id } });
  for (const ls of lostSpecs) {
    const occurred = new Date(Date.now() - ls.daysAgo * 86_400_000);
    await prisma.lostRevenueEvent.create({ data: {
      organizationId: org.id, childId: firstChild?.id ?? null,
      discipline: ls.disc, hours: ls.hrs, reason: ls.reason as "AUTH_EXPIRED"|"NO_MATCH_FOUND"|"FAMILY_DROPPED",
      occurredAt: occurred,
    }});
  }

  console.log("✓ Demo seed complete.");
  console.log(`  Sign in at: http://localhost:3001/login`);
  console.log(`  Email: owner@watermelon-therapy.example.com`);
  console.log(`  (Check terminal for magic link)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
