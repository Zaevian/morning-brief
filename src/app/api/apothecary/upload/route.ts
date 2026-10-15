import { handle, json, requireAdmin, HttpError } from "@/lib/apothecary/http";
import { getSql } from "@/lib/apothecary/db";
import { ingest, IngestFields } from "@/lib/apothecary/ingest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;
const MAX = 4.5 * 1024 * 1024; // Vercel Functions request-body limit; larger files use /upload/token + /upload/complete or /upload-from-url

/** multipart/form-data: file + IngestFields (see CONTRACT.md). */
export const POST = handle(async (req: Request) => {
  requireAdmin(req);
  getSql();
  const form = await req.formData();
  const file = form.get("file");
  if (!(file instanceof File)) throw new HttpError(400, "file is required");
  if (file.size > MAX) throw new HttpError(413, "Max 4.5 MB here; use the admin upload page or /upload-from-url for bigger files");
  const fields = Object.fromEntries([...form.entries()].filter(([k, v]) => k !== "file" && typeof v === "string")) as IngestFields;
  return json(await ingest(Buffer.from(await file.arrayBuffer()), file.name, file.type, fields), 201);
});
