import { q } from "./db";
import { coarsen, approxTimeBucket } from "./exif";

export type ValueSource = "exif" | "observer" | "none";

/** Recomputes an observation's effective date / time-of-day / coordinates and their sources.
 *  Real EXIF (from the observation's earliest photo that has it) always wins; observer values fill gaps; both stay stored. */
export async function recomputeCapture(obsId: string) {
  const [o] = await q("SELECT observer_date, observer_approx_time, observer_lat, observer_lon, precision_km FROM apo_observations WHERE id=$1", [obsId]);
  if (!o) return;
  const [dt] = await q("SELECT exif_datetime_original FROM apo_media WHERE observation_id=$1 AND exif_datetime_original IS NOT NULL ORDER BY sort_order, created_at LIMIT 1", [obsId]);
  const [gps] = await q("SELECT exif_gps_lat, exif_gps_lon FROM apo_media WHERE observation_id=$1 AND exif_gps_lat IS NOT NULL AND exif_gps_lon IS NOT NULL ORDER BY sort_order, created_at LIMIT 1", [obsId]);
  const exifDt: string | null = dt?.exif_datetime_original ?? null;
  const exifBucket = exifDt ? approxTimeBucket(exifDt) : "unknown";
  const observerDate = o.observer_date ? (o.observer_date instanceof Date ? o.observer_date.toISOString().slice(0, 10) : String(o.observer_date).slice(0, 10)) : null;

  const [date, dateSrc] = exifDt ? [exifDt.slice(0, 10), "exif"] : observerDate ? [observerDate, "observer"] : [null, "none"];
  const [time, timeSrc] = exifBucket !== "unknown" ? [exifBucket, "exif"]
    : o.observer_approx_time && o.observer_approx_time !== "unknown" ? [o.observer_approx_time, "observer"] : ["unknown", "none"];
  const [lat, lon, locSrc] = gps ? [gps.exif_gps_lat, gps.exif_gps_lon, "exif"]
    : o.observer_lat != null && o.observer_lon != null ? [o.observer_lat, o.observer_lon, "observer"] : [null, null, "none"];
  const p = Number(o.precision_km) || 10;
  await q(`UPDATE apo_observations SET observed_date=$2, observed_date_source=$3, approx_time=$4, approx_time_source=$5,
      lat=$6, lon=$7, coarse_lat=$8, coarse_lon=$9, location_source=$10, updated_at=now() WHERE id=$1`,
    [obsId, date, dateSrc, time, timeSrc, lat, lon, coarsen(lat, p), coarsen(lon, p), locSrc]);
}
