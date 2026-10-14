import exifr from "exifr";
import { createHash } from "node:crypto";

export function sha256(buf: Buffer) { return createHash("sha256").update(buf).digest("hex"); }

function jsonSafe(v: unknown): unknown {
  if (v instanceof Date) return v.toISOString();
  if (v instanceof Uint8Array) return { _bytes: v.length };
  if (Array.isArray(v)) return v.map(jsonSafe);
  if (v && typeof v === "object") return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, jsonSafe(x)]));
  if (typeof v === "number" && !Number.isFinite(v)) return null;
  return v;
}

/** Extracts every tag exifr can read; never infers missing values (absent -> null). */
export async function extractExif(buf: Buffer) {
  let raw: Record<string, unknown> | null = null;
  try {
    raw = (await exifr.parse(buf, { tiff: true, exif: true, gps: true, ifd1: false, interop: true, xmp: true, icc: false, iptc: true, mergeOutput: true, translateValues: true, reviveValues: false })) ?? null;
  } catch { raw = null; }
  const r = raw ?? {};
  const num = (v: unknown) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const str = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);
  const m = typeof r.DateTimeOriginal === "string" ? r.DateTimeOriginal.match(/^(\d{4}):(\d{2}):(\d{2}) (\d{2}):(\d{2}):(\d{2})/) : null;
  const dto = m ? `${m[1]}-${m[2]}-${m[3]}T${m[4]}:${m[5]}:${m[6]}` : null; // camera wall clock, no zone
  return {
    raw: raw ? (jsonSafe(raw) as Record<string, unknown>) : null,
    datetime_original: dto,
    offset_time: str(r.OffsetTimeOriginal) ?? str(r.OffsetTime),
    gps_lat: num(r.latitude), gps_lon: num(r.longitude), gps_alt_m: num(r.GPSAltitude),
    camera_make: str(r.Make), camera_model: str(r.Model), lens: str(r.LensModel),
    width: num(r.ExifImageWidth) ?? num(r.ImageWidth), height: num(r.ExifImageHeight) ?? num(r.ImageHeight),
  };
}

/** Round to a grid roughly precision_km wide (1 deg lat ~ 111 km). */
export function coarsen(v: number | null, precisionKm: number): number | null {
  if (v == null) return null;
  const step = Math.max(precisionKm, 0.1) / 111;
  return Math.round(Math.round(v / step) * step * 1e4) / 1e4;
}

export function approxTimeBucket(wallClock: string | null): string {
  // Uses the camera's local wall-clock hour, which is what "time of day" means for a sighting.
  const m = wallClock?.match(/T(\d{2})/);
  if (!m) return "unknown";
  const h = parseInt(m[1], 10);
  if (h < 5) return "night"; if (h < 7) return "dawn"; if (h < 11) return "morning";
  if (h < 14) return "midday"; if (h < 18) return "afternoon"; if (h < 20) return "dusk"; return "night";
}
