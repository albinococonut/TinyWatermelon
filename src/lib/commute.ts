// Commute / drive-time service.
//
// Today: mocked using haversine distance + a San Diego-typical avg speed
// weighted by time of day. Tomorrow: drop in Google Distance Matrix by
// implementing the same interface (no callers change).

// Lightweight Address interface — anything with lat/lng + label fields works.
// Prisma's Provider, Family, and Appointment all have lat/lng we can pass.
export interface Address {
  label: string;
  street?: string;
  city?: string;
  state?: string;
  zip?: string;
  lat: number;
  lng: number;
  neighborhood?: string;
}

export interface DriveEstimate {
  miles: number;
  minutes: number;
  mode: "mock" | "google";
  trafficBand: "light" | "moderate" | "heavy";
}

export const SCHOOL_ADDRESS: Address = {
  label: "Watermelon Therapy School (Base)",
  street: "4761 Cass Street",
  city: "San Diego",
  state: "CA",
  zip: "92109",
  lat: 32.8014,
  lng: -117.2575,
  neighborhood: "Pacific Beach",
};

function haversineMiles(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const sa =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(sa));
}

function trafficMultiplier(date: Date): {
  mult: number;
  band: DriveEstimate["trafficBand"];
} {
  const day = date.getDay();
  const hour = date.getHours();
  const isWeekend = day === 0 || day === 6;
  if (isWeekend) return { mult: 1.05, band: "light" };
  if (hour >= 15 && hour <= 18) return { mult: 1.55, band: "heavy" };
  if (hour >= 7 && hour <= 9) return { mult: 1.4, band: "heavy" };
  if (hour >= 11 && hour <= 14) return { mult: 1.2, band: "moderate" };
  return { mult: 1.0, band: "light" };
}

const BASE_SPEED_MPH = 22;

export function estimateDrive(from: Address, to: Address, when: Date): DriveEstimate {
  const miles = +haversineMiles(from.lat, from.lng, to.lat, to.lng).toFixed(2);
  if (miles < 0.05) return { miles: 0, minutes: 0, mode: "mock", trafficBand: "light" };
  const { mult, band } = trafficMultiplier(when);
  const overheadMin = miles < 3 ? 3 : 2;
  const minutes = Math.max(
    3,
    Math.round((miles / BASE_SPEED_MPH) * 60 * mult + overheadMin),
  );
  return { miles, minutes, mode: "mock", trafficBand: band };
}

export function fromSchool(to: Address, when: Date): DriveEstimate {
  return estimateDrive(SCHOOL_ADDRESS, to, when);
}
