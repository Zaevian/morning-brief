import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { isAdmin } from "@/lib/apothecary/auth";
import { handle, json, HttpError } from "@/lib/apothecary/http";
import { NotConfiguredError } from "@/lib/apothecary/db";
import { MAX_ORIGINAL_BYTES } from "@/lib/apothecary/ingest";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Issues a short-lived client-upload token so the browser PUTs the original straight into the PRIVATE Blob store
 *  (no 4.5 MB function limit, bytes untouched). Requires the admin token as an Authorization header. */
export const POST = handle(async (req: Request) => {
  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new NotConfiguredError("Apothecary photo storage is not configured (BLOB_READ_WRITE_TOKEN missing).");
  const b = (await req.json()) as HandleUploadBody;
  if (b.type === "blob.generate-client-token" && !isAdmin(req)) throw new HttpError(401, "Admin token required.");
  const result = await handleUpload({
    request: req, body: b,
    onBeforeGenerateToken: async (pathname) => {
      if (!/^apothecary\/originals\/[A-Za-z0-9._-]{1,120}$/.test(pathname)) throw new HttpError(400, "pathname must be apothecary/originals/<name>");
      return { allowedContentTypes: ["image/*"], maximumSizeInBytes: MAX_ORIGINAL_BYTES, addRandomSuffix: true, allowOverwrite: false, access: "private" as const };
    },
    // The browser calls /upload/complete itself; this webhook (signed by Vercel) is not relied on, so localhost/preview work too.
    onUploadCompleted: async () => {},
  });
  return json(result);
});
