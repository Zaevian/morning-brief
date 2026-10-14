import { put, get } from "@vercel/blob";
import { NotConfiguredError } from "./db";

/** All objects live in a PRIVATE Vercel Blob store. Originals under originals/, EXIF-stripped display copies under web/. */
function token() {
  const t = process.env.BLOB_READ_WRITE_TOKEN;
  if (!t) throw new NotConfiguredError("Apothecary photo storage is not configured (BLOB_READ_WRITE_TOKEN missing).");
  return t;
}

export async function putPrivate(pathname: string, data: Buffer, contentType: string) {
  const res = await put(pathname, data, { access: "private", token: token(), contentType, addRandomSuffix: false, allowOverwrite: false });
  return res.pathname;
}

export async function getPrivate(pathname: string) {
  const res = await get(pathname, { access: "private", token: token() });
  if (!res) return null;
  return res;
}
