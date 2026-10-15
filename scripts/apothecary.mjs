#!/usr/bin/env node
// Apothecary CLI for Maomao/Zae. Needs APOTHECARY_ADMIN_TOKEN in the environment (never commit it).
//   APOTHECARY_BASE (default https://morning-brief-zaevians-projects.vercel.app)
// Commands:
//   upload <box/file/path> [--date YYYY-MM-DD] [--time dawn|morning|midday|afternoon|evening|night] [--lat 30.44 --lon -84.28]
//          [--location-label "..."] [--precision-km 10] [--private] [--observation OBS-...] [--notes "..."]
//          --date/--time/--lat/--lon are hand-entered (observer) values: stored separately, used only where the photo has no real EXIF.
//          Files > 4 MB go straight to private Blob (client upload) then /upload/complete; smaller ones use multipart /upload.
//   upload-url <https://…/photo.jpg> [--observation OBS-...] [--location-label "..."] [--date …] [--time …] [--lat … --lon …] [--private]   server fetches, stores bytes unchanged (≤50 MB)
//   observe [--date …] [--time …] [--lat … --lon …] [--location-label …] [--notes …]   observation with no photo (all values observer-sourced)
//   species <profile.json>                       upsert a SpeciesProfile (nested uses/references ok)
//   identify <OBS-id> <identification.json>      append an identification revision
//   use <SP-id> <use.json>                       use item {id?, category, use, detail, description, cautions[], evidence_level, source_ids[]}
//   signoff <SP-id> <signoff.json>               rarity {by, decision: cosign|dissent, tier, sources[], note, at?}
//   reference <ref.json>
//   card <OBS-id> | search "<query string, e.g. q=oak&rarity=Rare>" | health
import { readFileSync } from "node:fs";
import { basename } from "node:path";
const base = (process.env.APOTHECARY_BASE ?? "https://morning-brief-zaevians-projects.vercel.app").replace(/\/$/, "");
const token = process.env.APOTHECARY_ADMIN_TOKEN;
const auth = token ? { authorization: `Bearer ${token}` } : {};
const [cmd, a, b, ...rest] = process.argv.slice(2);
const flag = (n) => { const all = [a, b, ...rest]; const i = all.indexOf(n); return i >= 0 ? all[i + 1] ?? true : undefined; };
const readJson = (p) => JSON.parse(readFileSync(p, "utf8"));
async function call(method, path, body) {
  const init = { method, headers: { ...auth } };
  if (body instanceof FormData) init.body = body;
  else if (body !== undefined) { init.body = JSON.stringify(body); init.headers["content-type"] = "application/json"; }
  const res = await fetch(base + path, init);
  const text = await res.text();
  console.log(res.status, text);
  if (!res.ok) process.exit(1);
}
switch (cmd) {
  case "upload": {
    const fields = {};
    const map = { "--date": "observer_date", "--time": "observer_approx_time", "--lat": "observer_lat", "--lon": "observer_lon",
      "--location-label": "location_label", "--precision-km": "precision_km", "--observation": "observation_id", "--notes": "user_notes" };
    for (const [f, k] of Object.entries(map)) if (typeof flag(f) === "string") fields[k] = flag(f);
    if (flag("--private")) fields.is_public = "false";
    const bytes = readFileSync(a);
    if (bytes.length > 4 * 1024 * 1024) {
      const { upload } = await import("@vercel/blob/client");
      const safe = basename(a).replace(/[^A-Za-z0-9._-]/g, "_").slice(-100) || "photo";
      const blob = await upload(`apothecary/originals/${safe}`, new Blob([bytes]), {
        access: "private", handleUploadUrl: `${base}/api/apothecary/upload/token`, headers: auth, multipart: bytes.length > 8 * 1024 * 1024 });
      await call("POST", "/api/apothecary/upload/complete", { pathname: blob.pathname, filename: basename(a), ...fields });
    } else {
      const fd = new FormData();
      fd.set("file", new Blob([bytes]), basename(a));
      for (const [k, v] of Object.entries(fields)) fd.set(k, v);
      await call("POST", "/api/apothecary/upload", fd);
    }
    break;
  }
  case "observe": {
    const body = {};
    for (const [f, k] of Object.entries({ "--date": "observer_date", "--time": "observer_approx_time", "--lat": "observer_lat", "--lon": "observer_lon",
      "--location-label": "location_label", "--precision-km": "precision_km", "--notes": "user_notes" })) if (typeof flag(f) === "string") body[k] = flag(f);
    if (flag("--private")) body.is_public = false;
    await call("POST", "/api/apothecary/observations", body); break;
  }
  case "upload-url": {
    const body = { url: a };
    if (flag("--observation")) body.observationId = flag("--observation");
    if (flag("--location-label")) body.location_label = flag("--location-label");
    if (flag("--precision-km")) body.precision_km = flag("--precision-km");
    for (const [f, k] of Object.entries({ "--date": "observer_date", "--time": "observer_approx_time", "--lat": "observer_lat", "--lon": "observer_lon", "--notes": "user_notes" }))
      if (typeof flag(f) === "string") body[k] = flag(f);
    if (flag("--private")) body.is_public = false;
    await call("POST", "/api/apothecary/upload-from-url", body); break;
  }
  case "species": await call("POST", "/api/apothecary/species", readJson(a)); break;
  case "identify": await call("POST", `/api/apothecary/observations/${a}/identifications`, readJson(b)); break;
  case "use": await call("POST", `/api/apothecary/species/${a}/uses`, readJson(b)); break;
  case "signoff": await call("POST", `/api/apothecary/species/${a}/signoffs`, readJson(b)); break;
  case "reference": await call("POST", "/api/apothecary/references", readJson(a)); break;
  case "card": await call("GET", `/api/apothecary/cards/${a}`); break;
  case "search": await call("GET", `/api/apothecary/search?${a ?? ""}`); break;
  case "health": await call("GET", "/api/apothecary/health"); break;
  default: console.log("see header of scripts/apothecary.mjs for usage"); process.exit(1);
}
