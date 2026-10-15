import { handle, json, requireAdmin, body, HttpError } from "@/lib/apothecary/http";
import { getSql } from "@/lib/apothecary/db";
import { ingest, IngestFields, MAX_ORIGINAL_BYTES } from "@/lib/apothecary/ingest";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function assertPublicHttpUrl(raw: string): URL {
  let u: URL;
  try { u = new URL(raw); } catch { throw new HttpError(400, "url is not valid"); }
  if (!["http:", "https:"].includes(u.protocol)) throw new HttpError(400, "url must be http(s)");
  const h = u.hostname.toLowerCase();
  if (h === "localhost" || h.endsWith(".local") || h.endsWith(".internal") || /^(127\.|10\.|192\.168\.|169\.254\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[?::1\]?$|\[?f[cd])/.test(h))
    throw new HttpError(400, "private/loopback hosts are not allowed");
  return u;
}

/** Body: {url, observationId? | observation_id?, ...IngestFields}. Fetches the image and stores the bytes unchanged. */
export const POST = handle(async (req: Request) => {
  requireAdmin(req);
  getSql();
  const b = await body(req) as IngestFields & { url?: string; observationId?: string };
  const u = assertPublicHttpUrl(String(b.url ?? ""));
  const res = await fetch(u, { redirect: "follow", headers: { "user-agent": "morning-brief-apothecary/1" }, signal: AbortSignal.timeout(45000) });
  if (!res.ok || !res.body) throw new HttpError(502, `Fetch failed: HTTP ${res.status}`);
  assertPublicHttpUrl(res.url || u.toString());
  const ct = (res.headers.get("content-type") ?? "").split(";")[0].trim().toLowerCase();
  if (ct && !ct.startsWith("image/") && ct !== "application/octet-stream") throw new HttpError(415, `Not an image (content-type ${ct})`);
  if (Number(res.headers.get("content-length") ?? 0) > MAX_ORIGINAL_BYTES) throw new HttpError(413, "Over 50 MB");
  const chunks: Uint8Array[] = []; let total = 0;
  const reader = res.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.length;
    if (total > MAX_ORIGINAL_BYTES) { await reader.cancel(); throw new HttpError(413, "Over 50 MB"); }
    chunks.push(value);
  }
  const buf = Buffer.concat(chunks);
  const filename = decodeURIComponent(u.pathname.split("/").pop() || "remote-image").slice(0, 120);
  // ingest() rejects anything sharp cannot decode as an image (415), so octet-stream is verified by content.
  return json({ ...(await ingest(buf, filename, ct || "application/octet-stream", { ...b, observation_id: b.observation_id ?? b.observationId })), source_url: u.toString() }, 201);
});
