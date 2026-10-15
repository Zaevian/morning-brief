# Apothecary Collection: shared data contract v1 (schema v0.2)

Owner: Miyuki (backend). UI: Treyni. Identification/research/species records: Maomao.
Lives inside the existing morning-brief Next.js 15 App Router site. Nothing here touches `/`, `/fun`, `content/*.json`, or existing components.

## Storage
| What | Where | Visibility |
|---|---|---|
| Records (species, observations, identifications, uses, references) | Neon Postgres via Vercel Marketplace (`DATABASE_URL`) | via API only |
| Original photos, byte-for-byte | Vercel Blob, **private** store, `apothecary/originals/<MED-id>.<ext>` | admin token only |
| Display copies (auto-rotated, ≤1600px WebP, all metadata stripped) | same private store, `apothecary/web/<MED-id>.webp` | streamed by `/api/apothecary/media/<id>` when the observation is public |
| Raw EXIF JSON, precise GPS | `apo_media.exif_raw`, `exif_gps_*`, `apo_observations.lat/lon` | admin token only |

Required Vercel env (Production + Preview, never in the repo): `DATABASE_URL` (Neon integration), `BLOB_READ_WRITE_TOKEN` (Blob store connect), `APOTHECARY_ADMIN_TOKEN` (random, ≥24 chars).
`GET /api/apothecary/health` reports which are present (booleans only). Missing config → endpoints return `503 {code:"not_configured"}`.

Migrations: `db/migrations/*.sql`, applied by `DATABASE_URL=... node scripts/apothecary-migrate.mjs` (idempotent, tracked in `schema_migrations`).

## Tables (all prefixed `apo_`)
- **apo_species** `SP-<slug>`: names, rank, taxonomy (kingdom…species_epithet), organism_type, visual_group (v0.2 enum: tree|flowering_plant|vine|general_plant|mushroom|lichen|moss|fern|butterfly_moth|beetle|other_insect|spider|other_arachnid|bird|mammal|fish|reptile|amphibian|mollusc|other), distinguishing_characteristics[], distribution/habitat/season, native status, IUCN + regional conservation, rarity (tier, color, region_basis, evidence, assessed_by; `provisional` is derived from apo_rarity_signoffs), edibility (edible, parts, conditions, cautions), toxicity (humans level/details/compounds, animals[], allergens[], dangerous_lookalikes[]), ecological_role, interesting_facts[], chemical_constituents[], portrait (portrait_media_id or portrait_url + source/credit/license), version (auto-bumps on every update), last_reviewed, reviewer.
- **apo_observations** `OBS-YYYYMMDD-XXXXXX`: species_id (denormalized from current identification), current_identification_id, observed_date, approx_time (`dawn|morning|midday|afternoon|evening|night|unknown`, from EXIF camera wall clock), location_label, private lat/lon, public coarse_lat/coarse_lon (grid ≈ precision_km, default 10 km), location_source / observed_date_source / approx_time_source (`exif|observer|none`), observer_date, observer_approx_time, observer_lat/lon (hand-entered, private like GPS), location_public (precise coords allowed publicly), is_public, user_notes. Many observations per species.
- **apo_media** `MED-<uuid>`: observation_id, role (`observation|portrait`), original pathname/filename/content_type/byte_size/sha256 (unique per role → duplicate uploads 409), web pathname, width/height, exif_raw (full tag dump), extracted datetime_original/offset_time/gps/camera make/model/lens, source/credit/license (portraits).
- **apo_identifications** `IDR-<uuid>`: **append-only** (DB trigger blocks UPDATE). observation_id, revision (1..n), supersedes_id, status (`pending|proposed|user_reviewed|verified|revised`), resolved_rank, resolved_species_id, verified_by_human, author, change_note, uncertainties[], diagnostic_features_observed[], score_disclaimer. Corrections = a new revision; the observation's current pointer moves.
- **apo_candidates** (append-only, ≤3 per identification): rank_order 1–3, species_id?, scientific_name, common_name, rank, match_score 0–100 (**independent estimates, never normalized to sum to 100**), confidence_label (`High|Medium|Low`, optional; derived from score if null), rationale, distinguishing_vs_primary (string[]; [] on #1), portrait_url, portrait_source (`verified_reference|generated_illustration|none`), portrait_credit, portrait_license.
- **apo_uses** `USE-<uuid>` (stable ids): species_id, category (`culinary|traditional_medicine|evidence_based_medical|scientific_research|industrial|agriculture|cosmetics|ecological|historical_cultural|other_verified`), title (= v0.2 `use`), detail (short), description (long, optional), cautions[], evidence_level (`established|clinical-limited|preliminary|traditional-only`), sort_order.
- **apo_rarity_signoffs** (append-only): species_id, by, decision (`cosign|dissent`), tier, sources[], note, at. `provisional=false` only when the latest maomao AND treyni sign-offs are both `cosign`.
- **apo_references** `REF-…`: title, url, type (`database|paper|field-guide|agency|other`), authors, year, accessed.
- **apo_reference_links**: (reference_id, target_type `species|use|identification`, target_id, note). One citation can back many things.

## Auth
Writes and private reads: header `Authorization: Bearer $APOTHECARY_ADMIN_TOKEN`. Public reads (no token) never include originals, raw EXIF, precise GPS (unless `location_public`), or non-public observations.

## Endpoints (base `/api/apothecary`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | – | config booleans |
| POST | `/upload` (multipart) | admin | `file` + optional `observation_id`, `role`, `location_label`, `precision_km`, `is_public`, `location_public`, `user_notes`; portraits: `role=portrait`, `species_id`, `source`, `credit`, `license`. Stores original untouched, extracts EXIF (exifr), makes stripped WebP, creates observation + pending revision 1 if no observation_id. Returns `{media_id, observation_id, sha256, byte_size, exif summary}` |
| POST | `/upload/token` | admin header | Vercel Blob client-upload token route (`handleUpload`). Only `apothecary/originals/<name>`, `image/*`, ≤50 MB, private. Used by `@vercel/blob/client` `upload()` |
| POST | `/upload/complete` | admin | `{pathname, filename?, observation_id?, location_label?, precision_km?, is_public?, location_public?, user_notes?}` after a client upload: reads the stored original back, extracts EXIF from those exact bytes, hashes, makes display copy, creates media (+ new observation unless observation_id). Same response as `/upload` |
| POST | `/upload-from-url` | admin | `{url, observationId? (or observation_id), …same optional fields}`. Server fetches http(s) URL (private/loopback hosts refused), stores bytes unchanged, rejects non-images (415) and >50 MB (413), extracts EXIF, records sha256. Response adds `source_url` |
| GET | `/media/:id` | – / admin | display WebP; `?variant=original` (admin) streams exact original with `x-sha256` |
| POST | `/observations` | admin | create observation without photo |
| GET/PATCH/DELETE | `/observations/:id` | –/admin/admin | card payload / edit date, approx_time, location, privacy, notes / soft-hide |
| GET/POST | `/observations/:id/identifications` | –/admin | history / append revision (see below) |
| GET/POST | `/species` | –/admin | list / upsert full SpeciesProfile |
| GET/PATCH/DELETE | `/species/:id` | –/admin/admin | profile / partial update (version++) / delete if unreferenced |
| POST | `/species/:id/uses` | admin | add/upsert one use |
| GET/POST | `/species/:id/signoffs` | –/admin | rarity sign-off log + derived provisional / append `{by, decision, tier, sources, note, at?}` |
| PATCH/DELETE | `/uses/:id` | admin | edit/remove a use |
| GET/POST | `/references` | –/admin | list / upsert a citation with `links[]` |
| GET | `/search` | – | `q, kingdom, phylum, class, order, family, genus, organism_type, visual_group, rarity, edible, iucn, status, verified, species_id, limit(≤200), offset`; comma lists allowed (`rarity=Rare,Elusive`). Newest first. |
| GET | `/cards/:id` | – | full expandable-card payload |

### Search result row
```json
{"observation_id":"OBS-20261014-A1B2C3","observed_date":"2026-10-14","approx_time":"morning","location_label":"Tallahassee, FL","created_at":"…",
 "species_id":"SP-quercus-virginiana","scientific_name":"Quercus virginiana","common_name":"Southern live oak","visual_group":"tree",
 "rarity_tier":"Common","rarity_color":"metallic-silver","rarity_provisional":true,"edible":"Conditional","iucn_status":"LC","family":"Fagaceae",
 "id_status":"proposed","resolved_rank":"species","verified_by_human":false,"top_score":82,"top_candidate":"Quercus virginiana","identification_confidence_label":"High",
 "cover_url":"/api/apothecary/media/MED-…"}
```
Response: `{ "total": n, "results": [row…] }`.

### Card payload (`GET /cards/:id`)
```json
{
  "card_version": 1,
  "observation": {
    "observation_id": "OBS-…", "species_profile_id": "SP-…|null", "current_identification_id": "IDR-…",
    "observed_date": "2026-10-14", "approx_time": "morning",
    "location": {"label": "…", "lat": 30.45, "lon": -84.32, "precision_km": 10, "source": "exif", "is_precise": false},
    "is_public": true, "location_public": false, "user_notes": "…",
    "media": [{"id": "MED-…", "role": "observation", "url": "/api/apothecary/media/MED-…", "width": 4032, "height": 3024,
               "sha256": "…", "byte_size": 3100000, "camera": {"make": "Apple", "model": "iPhone 15", "lens": "…"},
               "datetime_original": "2026-10-14T07:42:10", "offset_time": "-04:00"
               /* admin only: original_url, original_filename, content_type, exif:{gps_lat,gps_lon,gps_alt_m,raw} */}]
  },
  "identification": { /* current revision, same shape as history items */ },
  "identification_history": [{
    "id": "IDR-…", "identification_confidence_label": "High", "revision": 2, "supersedes_id": "IDR-…", "status": "proposed", "resolved_rank": "species",
    "resolved_species_id": "SP-…", "verified_by_human": false, "author": "maomao", "change_note": "…",
    "uncertainties": [], "diagnostic_features_observed": [], "score_disclaimer": "Scores are estimates, not calibrated probabilities.",
    "created_at": "…",
    "candidates": [{"rank_order": 1, "species_id": "SP-…", "scientific_name": "…", "common_name": "…", "rank": "species",
                    "match_score": 82, "confidence_label": "High", "rationale": "…", "distinguishing_vs_primary": [], "portrait_url": "…",
                    "portrait_source": "verified_reference", "portrait_credit": "…", "portrait_license": "CC BY 4.0"}],
    "sources": [{"id": "REF-…", "title": "…", "url": "…", "accessed": "…"}]
  }],
  "species": {
    "species_profile_id": "SP-…", "scientific_name": "…", "common_name": "…", "authority": "…", "rank": "species",
    "taxonomy": {"kingdom": "", "phylum": "", "class": "", "order": "", "family": "", "genus": "", "species": ""},
    "organism_type": "plant", "visual_group": "tree", "distinguishing_characteristics": [],
    "geographic_distribution": "", "typical_habitat": "", "seasonal_occurrence": "",
    "native_status": {"region": "", "status": "native"},
    "conservation_status": {"iucn": "LC", "regional": "", "source": ""},
    "collectible_rarity": {"tier": "Common", "color": "metallic-silver", "region_basis": "", "evidence": "", "provisional": true, "assessed_by": [],
                           "signoffs": [{"by": "maomao", "decision": "cosign", "tier": "Common", "sources": [{"title": "…", "url": "…"}], "note": null, "at": "2026-10-14T20:00:00Z"}]},
    "edibility": {"edible": "Conditional", "edible_parts": [], "conditions": "", "cautions": [], "verified_safe_specimen": false,
                  "warning": "Species-level edibility is not a safety verification of this specimen."},
    "toxicity": {"humans": {"level": "", "details": "", "compounds": []}, "animals": [], "allergens": [], "dangerous_lookalikes": []},
    "ecological_role": "", "interesting_facts": [], "chemical_constituents": [],
    "portrait": {"media_id": null, "url": "", "source": "", "credit": "", "license": ""},
    "uses": {"culinary": [{"id": "USE-…", "use": "Acorn flour flatbread", "detail": "short", "description": "long, optional", "cautions": ["Leach tannins first"], "evidence_level": "established", "source_ids": ["REF-…"]}]},
    "use_categories": [{"key": "culinary", "label": "Culinary", "count": 4}],
    "references": [{"id": "REF-…", "title": "", "url": "", "type": "database", "authors": null, "year": null, "accessed": null}],
    "record_meta": {"version": 3, "last_reviewed": "2026-10-14", "reviewer": "maomao", "updated_at": "…"}
  },
  "sightings_of_species": {"count": 3, "others": [{"id": "OBS-…", "observed_date": "…", "approx_time": "…", "location_label": "…"}]}
}
```
Uses are grouped by category and each list is **complete** (every dish, every application; no truncation), so it can drive a dropdown directly. `use_categories` gives display order, v0.2 labels (Culinary, Traditional Medicine, Evidence-Based Medical Applications, Scientific Research, Industrial Uses, Agriculture, Cosmetics, Ecological Roles, Historical Uses, Other Verified Applications) and counts. Empty categories are omitted (UI shows "No documented uses found.").
`identification_confidence_label`: High ≥75, Medium 40–74, Low <40 from the top candidate's score; forced Low when resolved_rank is above genus. TypeScript shapes: `src/lib/apothecary/types.ts`. `species` is null until an identification resolves one.

## Capture values: EXIF vs observer (hand-entered)
Chat apps often strip EXIF, so Zae may give date, time of day and rough location by hand.
- Hand-entered values go in `observer_date` (YYYY-MM-DD), `observer_approx_time` (bucket), `observer_lat`+`observer_lon`. They are stored in their own columns and **never overwrite EXIF** (EXIF stays on `apo_media`).
- The effective `observed_date`, `approx_time` and coordinates are derived (`src/lib/apothecary/capture.ts`): real EXIF from the observation's earliest photo wins, otherwise observer, otherwise null/`unknown`. Re-derived after every upload or PATCH, so adding a later photo with EXIF upgrades the source automatically.
- Accepted on `/upload`, `/upload/complete`, `/upload-from-url`, `POST /observations` and `PATCH /observations/:id` (legacy `observed_date`/`approx_time`/`lat`/`lon` on the observation endpoints are treated as observer values).
- Card payload `observation` adds:
```json
"capture_sources": {"observed_date": "observer", "approx_time": "exif", "location": "none"},
"observer_entered": {"observed_date": "2026-10-12", "approx_time": "evening", "lat": 30.45, "lon": -84.32}
```
`location.source` matches `capture_sources.location`. `observer_entered` coords are coarsened like GPS unless `location_public` or admin. UI: label any value whose source is `observer` as "reported by observer" (or similar); never present it as camera data. `location_label` is always free text from the observer.

## Photo intake (no commit/redeploy per photo)
1. **Admin page** `/apothecary/admin/upload` (unstyled, noindex; Treyni may restyle). Asks for the admin token at runtime and keeps it in `sessionStorage` only. Browser → `/upload/token` → file PUT straight to private Blob (bypasses the 4.5 MB function limit, multipart for >8 MB) → `/upload/complete`. Multiple files OK; optional existing observation_id.
2. **URL intake** for agents that only have a link: `node scripts/apothecary.mjs upload-url https://…/photo.jpg [--observation OBS-…]`. Note: hosts that re-encode images (chat apps, social sites) strip EXIF before we ever see it; use direct original-file links when EXIF matters.
3. **Multipart** `/upload` (≤4.5 MB) for scripts.
All three share one pipeline (`src/lib/apothecary/ingest.ts`), dedupe by sha256 (409 with the existing media id).

## How Treyni consumes it
- Replace `src/app/apothecary/page.tsx` (placeholder) and add components under `src/components/apothecary/`. Do not edit `src/lib/apothecary/*` or `src/app/api/apothecary/*` without Miyuki.
- Grid: `fetch('/api/apothecary/search?…')`. Expand a card: `fetch('/api/apothecary/cards/<id>')`. Images: use the returned `url` (`/api/apothecary/media/<id>`) with a plain `<img>` (same-origin; no remotePatterns needed).
- Label any candidate with `portrait_source: "generated_illustration"` as "Illustration".
- Honor UI rules from Maomao's v0.1: big primary candidate + two smaller alternates with scores and confidence labels; non-species `resolved_rank` → "Genus-level" etc.; edible badge always paired with `edibility.warning`; "Provisional" when `collectible_rarity.provisional`; italic scientific names; never render null EXIF/location fields as known; show `location.is_precise=false` as "approx., ±precision_km km".
- An upload form in the page needs the admin token; keep any upload UI behind a token prompt stored only in the browser (sessionStorage), never in code.

## How Maomao writes records
Set `APOTHECARY_ADMIN_TOKEN` in your environment (Zae shares it privately; never in a file in the repo). Then from the repo:
```bash
node scripts/apothecary.mjs health
node scripts/apothecary.mjs upload /workspace/path/photo.jpg --date 2026-10-12 --time evening --lat 30.44 --lon -84.28 --location-label "Lake Ella, Tallahassee" --precision-km 5
node scripts/apothecary.mjs observe --date 2026-10-12 --time evening --location-label "Lake Ella"     # no photo yet
node scripts/apothecary.mjs upload-url https://…/photo.jpg --date 2026-10-12 --time morning
node scripts/apothecary.mjs species  profile.json        # SpeciesProfile v0.1 JSON; nested uses{category:[{id?,use,detail,description,cautions[],evidence_level,source_ids}]}, collectible_rarity.signoffs[] and references[] accepted
node scripts/apothecary.mjs identify OBS-20261014-A1B2C3 ident.json
node scripts/apothecary.mjs use SP-quercus-virginiana use.json
node scripts/apothecary.mjs signoff SP-quercus-virginiana signoff.json   # {by,decision:cosign|dissent,tier,sources,note}
node scripts/apothecary.mjs reference ref.json         # {id?,title,url,type,links:[{target_type,target_id}]}
node scripts/apothecary.mjs card OBS-…
```
Scores are stored exactly as sent; give each candidate its own estimate (82/55/20 is fine; they need not sum to 100). Use items should list every dish/application as its own item so dropdowns are complete.
Order: upsert the species first (so `species_id` exists), then append the identification.
`ident.json`:
```json
{"status":"proposed","resolved_rank":"species","resolved_species_id":"SP-quercus-virginiana","verified_by_human":false,"author":"maomao",
 "change_note":"Initial ID","uncertainties":["Acorns not visible"],"diagnostic_features_observed":["Revolute leaf margins"],
 "candidates":[
   {"rank_order":1,"species_id":"SP-quercus-virginiana","scientific_name":"Quercus virginiana","common_name":"Southern live oak","match_score":82,"rationale":"…","portrait_url":"…","portrait_source":"verified_reference","portrait_credit":"…","portrait_license":"CC BY-SA 4.0"},
   {"rank_order":2,"scientific_name":"Quercus geminata","common_name":"Sand live oak","match_score":55,"rationale":"…","distinguishing_vs_primary":["Strongly rolled margins","Deeply veined underside"],"portrait_source":"generated_illustration"},
   {"rank_order":3,"scientific_name":"Quercus hemisphaerica","match_score":20,"distinguishing_vs_primary":["…"]}],
 "sources":[{"id":"inat-qv","title":"iNaturalist: Quercus virginiana","url":"https://www.inaturalist.org/taxa/…","type":"database","accessed":"2026-10-14"}]}
```
Corrections: post a new identification with a `change_note` (e.g. status `revised`). History is kept; the card switches to the new one and the observation re-links to the new species. Zae's review = a revision with `author:"zae"`, `status:"user_reviewed"` or `"verified"`, `verified_by_human:true`.
Species `id` = `species_profile_id` if given, else `SP-` + slug of scientific_name. Portrait fields: `portrait:{url,source,credit,license}` in the profile, or upload with `role=portrait&species_id=…`.

## Known limits
- Vercel Functions accept request bodies up to 4.5 MB, so multipart `/upload` rejects bigger files; use the admin page (client upload) or `/upload-from-url` (≤50 MB).
- `/upload/complete` and `/upload-from-url` load the whole original into function memory to hash/EXIF it; 50 MB is the cap.
- No re-encoding of originals; the display copy is the only derived version.
