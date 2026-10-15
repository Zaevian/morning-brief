import { handle, json, requireAdmin, body, HttpError } from "@/lib/apothecary/http";
import { getSql } from "@/lib/apothecary/db";
import { getPrivate } from "@/lib/apothecary/storage";
import { ingest, IngestFields, MAX_ORIGINAL_BYTES } from "@/lib/apothecary/ingest";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Body: {pathname, filename?, ...IngestFields}. Reads the stored original back from private Blob, extracts EXIF from those
 *  exact bytes, hashes them and creates the media row (new observation unless observation_id is given). */
export const POST = handle(async (req: Request) => {
  requireAdmin(req);
  getSql();
  const b = await body(req) as IngestFields & { pathname?: string; filename?: string };
  if (!b.pathname || !/^apothecary\/originals\/[A-Za-z0-9._-]{1,160}$/.test(b.pathname)) throw new HttpError(400, "pathname from the client upload is required");
  const blob = await getPrivate(b.pathname);
  if (!blob?.stream) throw new HttpError(404, "Uploaded blob not found");
  const buf = Buffer.from(await new Response(blob.stream).arrayBuffer());
  if (buf.length > MAX_ORIGINAL_BYTES) throw new HttpError(413, "Over 50 MB");
  const ct = (blob.blob as { contentType?: string }).contentType ?? "application/octet-stream";
  if (!ct.startsWith("image/")) throw new HttpError(415, "Not an image");
  return json(await ingest(buf, b.filename || b.pathname.split("/").pop()!, ct, b, b.pathname), 201);
});
