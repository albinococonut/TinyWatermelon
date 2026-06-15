// Geocoding via Nominatim (OpenStreetMap) — free, no API key required.
// Rate-limited to 1 request/second by Nominatim policy.
// Returns null on failure — callers should handle gracefully.

export interface LatLng { lat: number; lng: number }

export async function geocodeAddress(
  address: string,
  city: string = "",
  zip: string = "",
): Promise<LatLng | null> {
  const parts = [address, city, zip, "USA"].filter(Boolean);
  const q = encodeURIComponent(parts.join(", "));
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1&countrycodes=us`,
      {
        headers: { "User-Agent": "TinyWatermelon-TherapyScheduler/1.0" },
        signal: AbortSignal.timeout(5_000),
      },
    );
    if (!res.ok) return null;
    const data = await res.json() as Array<{ lat: string; lon: string }>;
    if (!data.length) return null;
    return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch {
    return null; // non-fatal — lat/lng simply stays null
  }
}
