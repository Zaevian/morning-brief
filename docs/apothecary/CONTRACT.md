# Apothecary Collection: shared data contract v1

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
- **apo_species** `SP-<slug>`: names, rank, taxonomy (kingdom…species_epithet), organism_type, visual_group (icon key), distinguishing_characteristics[], distribution/habitat/season, native status, IUCN + regional conservation, rarity (tier, color, region_basis, evidence, provisional, assessed_by), edibility (edible, parts, conditions, cautions), toxicity (humans level/details/compounds, animals[], allergens[], dangerous_lookalikes[]), ecological_role, interesting_facts[], chemical_constituents[], portrait (portrait_media_id or portrait_url + source/credit/license), version (auto-bumps on every update), last_reviewed, reviewer.
- **apo_observations** `OBS-YYYYMMDD-XXXXXX`: species_id (denormalized from current identification), current_identification_id, observed_date, approx_time (`dawn|morning|midday|afternoon|dusk|night|unknown`, from EXIF camera wall clock), location_label, private lat/lon, public coarse_lat/coarse_lon (grid ≈ precision_km, default 10 km), location_source (`exif|user|none`), location_public (precise coords allowed publicly), is_public, user_notes. Many observations per species.
- **apo_media** `MED-<uuid>`: observation_id, role (`observation|portrait`), original pathname/filename/content_type/byte_size/sha256 (unique per role → duplicate uploads 409), web pathname, width/height, exif_raw (full tag dump), extracted datetime_original/offset_time/gps/camera make/model/lens, source/credit/license (portraits).
- **apo_identifications** `IDR-<uuid>`: **append-only** (DB trigger blocks UPDATE). observation_id, revision (1..n), supersedes_id, status (`pending|proposed|user_reviewed|verified|revised`), resolved_rank, resolved_species_id, verified_by_human, author, change_note, uncertainties[], diagnostic_features_observed[], score_disclaimer. Corrections = a new revision; the observation's current pointer moves.
- **apo_candidates** (append-only, ≤3 per identification): rank_order 1–3, species_id?, scientific_name, common_name, rank, match_score 0–100 (not normalized), confidence_label (`high|moderate|low|very_low`), rationale, distinguishing_vs_primary (null on #1), portrait_url.
- **apo_uses** `USE-<uuid>` (stable ids): species_id, category (`culinary|traditional_medicine|evidence_based_medical|scientific_research|industrial|agriculture|cosmetics|ecological|historical_cultural|other_verified`), title, detail, cautions[], evidence_level (`established|clinical-limited|preliminary|traditional-only`), sort_order.
- **apo_references** `REF-…`: title, url, type (`database|paper|field-guide|agency|other`), authors, year, accessed.
- **apo_reference_links**: (reference_id, target_type `species|use|identification`, target_id, note). One citation can back many things.

## Auth
Writes and private reads: header `Authorization: Bearer $APOTHECARY_ADMIN_TOKEN`. Public reads (no token) never include originals, raw EXIF, precise GPS (unless `location_public`), or non-public observations.

## Endpoints (base `/api/apothecary`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| GET | `/health` | – | config booleans |
| POST | `/upload` (multipart) | admin | `file` + optional `observation_id`, `role`, `location_label`, `precision_km`, `is_public`, `location_public`, `user_notes`; portraits: `role=portrait`, `species_id`, `source`, `credit`, `license`. Stores original untouched, extracts EXIF (exifr), makes stripped WebP, creates observation + pending revision 1 if no observation_id. Returns `{media_id, observation_id, sha256, byte_size, exif summary}` |
| GET | `/media/:id` | – / admin | display WebP; `?variant=original` (admin) streams exact original with `x-sha256` |
| POST | `/observations` | admin | create observation without photo |
| GET/PATCH/DELETE | `/observations/:id` | –/admin/admin | card payload / edit date, approx_time, location, privacy, notes / soft-hide |
| GET/POST | `/observations/:id/identifications` | –/admin | history / append revision (see below) |
| GET/POST | `/species` | –/admin | list / upsert full SpeciesProfile |
| GET/PATCH/DELETE | `/species/:id` | –/admin/admin | profile / partial update (version++) / delete if unreferenced |
| POST | `/species/:id/uses` | admin | add/upsert one use |
| PATCH/DELETE | `/uses/:id` | admin | edit/remove a use |
| GET/POST | `/references` | –/admin | list / upsert a citation with `links[]` |
| GET | `/search` | – | `q, kingdom, phylum, class, order, family, genus, organism_type, visual_group, rarity, edible, iucn, status, verified, species_id, limit(≤200), offset`; comma lists allowed (`rarity=Rare,Elusive`). Newest first. |
| GET | `/cards/:id` | – | full expandable-card payload |

### Search result row
```json
{"observation_id":"OBS-20261014-A1B2C3","observed_date":"2026-10-14","approx_time":"morning","location_label":"Tallahassee, FL","created_at":"…",
 "species_id":"SP-quercus-virginiana","scientific_name":"Quercus virginiana","common_name":"Southern live oak","visual_group":"tree",
 "rarity_tier":"Common","rarity_color":"metallic-silver","rarity_provisional":true,"edible":"Conditional","iucn_status":"LC","family":"Fagaceae",
 "id_status":"proposed","resolved_rank":"species","verified_by_human":false,"top_score":82,"top_confidence":"high","top_candidate":"Quercus virginiana",
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
    "id": "IDR-…", "revision": 2, "supersedes_id": "IDR-…", "status": "proposed", "resolved_rank": "species",
    "resolved_species_id": "SP-…", "verified_by_human": false, "author": "maomao", "change_note": "…",
    "uncertainties": [], "diagnostic_features_observed": [], "score_disclaimer": "Scores are estimates, not calibrated probabilities.",
    "created_at": "…",
    "candidates": [{"rank_order": 1, "species_id": "SP-…", "scientific_name": "…", "common_name": "…", "rank": "species",
                    "match_score": 82, "confidence_label": "high", "rationale": "…", "distinguishing_vs_primary": null, "portrait_url": "…"}],
    "sources": [{"id": "REF-…", "title": "…", "url": "…", "accessed": "…"}]
  }],
  "species": {
    "species_profile_id": "SP-…", "scientific_name": "…", "common_name": "…", "authority": "…", "rank": "species",
    "taxonomy": {"kingdom": "", "phylum": "", "class": "", "order": "", "family": "", "genus": "", "species": ""},
    "organism_type": "plant", "visual_group": "tree", "distinguishing_characteristics": [],
    "geographic_distribution": "", "typical_habitat": "", "seasonal_occurrence": "",
    "native_status": {"region": "", "status": "native"},
    "conservation_status": {"iucn": "LC", "regional": "", "source": ""},
    "collectible_rarity": {"tier": "Common", "color": "metallic-silver", "region_basis": "", "evidence": "", "provisional": true, "assessed_by": []},
    "edibility": {"edible": "Conditional", "edible_parts": [], "conditions": "", "cautions": [], "verified_safe_specimen": false,
                  "warning": "Species-level edibility is not a safety verification of this specimen."},
    "toxicity": {"humans": {"level": "", "details": "", "compounds": []}, "animals": [], "allergens": [], "dangerous_lookalikes": []},
    "ecological_role": "", "interesting_facts": [], "chemical_constituents": [],
    "portrait": {"media_id": null, "url": "", "source": "", "credit": "", "license": ""},
    "uses": {"culinary": [{"id": "USE-…", "title": "", "detail": "", "cautions": [], "evidence_level": "established", "source_ids": ["REF-…"]}]},
    "references": [{"id": "REF-…", "title": "", "url": "", "type": "database", "authors": null, "year": null, "accessed": null}],
    "record_meta": {"version": 3, "last_reviewed": "2026-10-14", "reviewer": "maomao", "updated_at": "…"}
  },
  "sightings_of_species": {"count": 3, "others": [{"id": "OBS-…", "observed_date": "…", "approx_time": "…", "location_label": "…"}]}
}
```
Empty use categories are omitted (UI shows "No documented uses found."). `species` is null until an identification resolves one.

## How Treyni consumes it
- Replace `src/app/apothecary/page.tsx` (placeholder) and add components under `src/components/apothecary/`. Do not edit `src/lib/apothecary/*` or `src/app/api/apothecary/*` without Miyuki.
- Grid: `fetch('/api/apothecary/search?…')`. Expand a card: `fetch('/api/apothecary/cards/<id>')`. Images: use the returned `url` (`/api/apothecary/media/<id>`) with a plain `<img>` (same-origin; no remotePatterns needed).
- Honor UI rules from Maomao's v0.1: big primary candidate + two smaller alternates with scores and confidence labels; non-species `resolved_rank` → "Genus-level" etc.; edible badge always paired with `edibility.warning`; "Provisional" when `collectible_rarity.provisional`; italic scientific names; never render null EXIF/location fields as known; show `location.is_precise=false` as "approx., ±precision_km km".
- An upload form in the page needs the admin token; keep any upload UI behind a token prompt stored only in the browser (sessionStorage), never in code.

## How Maomao writes records
Set `APOTHECARY_ADMIN_TOKEN` in your environment (Zae shares it privately; never in a file in the repo). Then from the repo:
```bash
node scripts/apothecary.mjs health
node scripts/apothecary.mjs species  profile.json        # SpeciesProfile v0.1 JSON; nested uses{category:[{id?,use|title,detail,cautions,evidence_level,source_ids}]} and references[] accepted
node scripts/apothecary.mjs identify OBS-20261014-A1B2C3 ident.json
node scripts/apothecary.mjs use SP-quercus-virginiana use.json
node scripts/apothecary.mjs reference ref.json         # {id?,title,url,type,links:[{target_type,target_id}]}
node scripts/apothecary.mjs card OBS-…
```
Order: upsert the species first (so `species_id` exists), then append the identification.
`ident.json`:
```json
{"status":"proposed","resolved_rank":"species","resolved_species_id":"SP-quercus-virginiana","verified_by_human":false,"author":"maomao",
 "change_note":"Initial ID","uncertainties":["Acorns not visible"],"diagnostic_features_observed":["Revolute leaf margins"],
 "candidates":[
   {"rank_order":1,"species_id":"SP-quercus-virginiana","scientific_name":"Quercus virginiana","common_name":"Southern live oak","match_score":82,"confidence_label":"high","rationale":"…"},
   {"rank_order":2,"scientific_name":"Quercus geminata","common_name":"Sand live oak","match_score":55,"confidence_label":"moderate","rationale":"…","distinguishing_vs_primary":"Strongly rolled margins, deeply veined underside"},
   {"rank_order":3,"scientific_name":"Quercus hemisphaerica","match_score":20,"confidence_label":"low","distinguishing_vs_primary":"…"}],
 "sources":[{"id":"inat-qv","title":"iNaturalist: Quercus virginiana","url":"https://www.inaturalist.org/taxa/…","type":"database","accessed":"2026-10-14"}]}
```
Corrections: post a new identification with a `change_note` (e.g. status `revised`). History is kept; the card switches to the new one and the observation re-links to the new species. Zae's review = a revision with `author:"zae"`, `status:"user_reviewed"` or `"verified"`, `verified_by_human:true`.
Species `id` = `species_profile_id` if given, else `SP-` + slug of scientific_name. Portrait fields: `portrait:{url,source,credit,license}` in the profile, or upload with `role=portrait&species_id=…`.

## Known limits
- Vercel Functions accept request bodies up to 4.5 MB, so `/upload` rejects bigger files. Phone photos over 4.5 MB need a direct-to-Blob client upload step (planned next; it needs the Blob store to exist first).
- No re-encoding of originals; the display copy is the only derived version.
