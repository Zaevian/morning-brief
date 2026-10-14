import { q } from "@/lib/apothecary/db";
import { handle, HttpError } from "@/lib/apothecary/http";
import { isAdmin } from "@/lib/apothecary/auth";
import { getPrivate } from "@/lib/apothecary/storage";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Streams the EXIF-stripped display copy (public if its observation is public or it is a portrait).
 *  ?variant=original streams the untouched original and requires the admin token. */
export const GET = handle(async (req: Request, ctx: { params: Promise<{ id: string }> }) => {
  const { id } = await ctx.params;
  const admin = isAdmin(req);
  const original = new URL(req.url).searchParams.get("variant") === "original";
  if (original && !admin) throw new HttpError(401, "Admin token required for originals.");
  const [m] = await q(`SELECT m.*, o.is_public FROM apo_media m LEFT JOIN apo_observations o ON o.id=m.observation_id WHERE m.id=$1`, [id]);
  if (!m || (!admin && m.role === "observation" && !m.is_public)) throw new HttpError(404, "Not found");
  const blob = await getPrivate(original ? m.original_pathname : (m.web_pathname ?? m.original_pathname));
  if (!blob || !blob.stream) throw new HttpError(404, "Not found");
  return new Response(blob.stream, { headers: {
    "content-type": original ? (m.content_type || "application/octet-stream") : "image/webp",
    "cache-control": original ? "private, no-store" : "public, max-age=86400",
    ...(original ? { "content-disposition": `attachment; filename="${encodeURIComponent(m.original_filename ?? id)}"`, "x-sha256": m.sha256 } : {}) } });
});
