"use client";

import { useEffect, useState } from "react";
import { upload } from "@vercel/blob/client";

const KEY = "apothecaryAdminToken";

export function AdminUploadForm() {
  const [token, setToken] = useState("");
  const [log, setLog] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  useEffect(() => { setToken(sessionStorage.getItem(KEY) ?? ""); }, []);
  const say = (s: string) => setLog((l) => [...l, s]);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const files = fd.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!token) return say("Enter the admin token first.");
    sessionStorage.setItem(KEY, token);
    const auth = { authorization: `Bearer ${token}` };
    const fields = Object.fromEntries(["observation_id", "location_label", "precision_km", "user_notes"].map((k) => [k, String(fd.get(k) ?? "")]).filter(([, v]) => v));
    setBusy(true);
    for (const file of files) {
      try {
        say(`Uploading ${file.name} (${(file.size / 1048576).toFixed(1)} MB)…`);
        const safe = file.name.replace(/[^A-Za-z0-9._-]/g, "_").slice(-100) || "photo";
        const blob = await upload(`apothecary/originals/${safe}`, file, {
          access: "private", handleUploadUrl: "/api/apothecary/upload/token", headers: auth, contentType: file.type || undefined, multipart: file.size > 8 * 1048576,
        });
        const res = await fetch("/api/apothecary/upload/complete", {
          method: "POST", headers: { ...auth, "content-type": "application/json" },
          body: JSON.stringify({ pathname: blob.pathname, filename: file.name, is_public: fd.get("is_public") ? "true" : "false", ...fields }),
        });
        say(`${file.name}: ${res.status} ${await res.text()}`);
      } catch (err) {
        say(`${file.name}: failed: ${(err as Error).message}`);
      }
    }
    setBusy(false);
  }

  return (
    <form onSubmit={onSubmit}>
      <p><label>Admin token <input type="password" value={token} onChange={(e) => setToken(e.target.value)} autoComplete="off" /></label>
        {" "}<button type="button" onClick={() => { sessionStorage.removeItem(KEY); setToken(""); }}>Forget</button></p>
      <p><label>Photos <input type="file" name="files" accept="image/*" multiple required /></label></p>
      <p><label>Attach to existing observation (optional) <input name="observation_id" placeholder="OBS-…" /></label></p>
      <p><label>Location label <input name="location_label" /></label></p>
      <p><label>Public precision km <input name="precision_km" type="number" min="0.1" step="0.1" defaultValue="10" /></label></p>
      <p><label><input type="checkbox" name="is_public" defaultChecked /> Show on public collection</label></p>
      <p><label>Notes <input name="user_notes" /></label></p>
      <button type="submit" disabled={busy}>{busy ? "Uploading…" : "Upload originals"}</button>
      <pre style={{ whiteSpace: "pre-wrap" }}>{log.join("\n")}</pre>
    </form>
  );
}
