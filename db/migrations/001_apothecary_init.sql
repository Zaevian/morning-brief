-- Apothecary Collection schema v1. Apply with: DATABASE_URL=... node scripts/apothecary-migrate.mjs
CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());

-- One row per taxon. Maomao owns scientific fields.
CREATE TABLE apo_species (
  id                text PRIMARY KEY,                 -- 'SP-<slug>'
  scientific_name   text NOT NULL,
  common_name       text,
  authority         text,
  rank              text NOT NULL DEFAULT 'species' CHECK (rank IN ('species','genus','family','order','higher')),
  kingdom text, phylum text, class text, "order" text, family text, genus text, species_epithet text,
  organism_type     text CHECK (organism_type IN ('plant','fungus','insect','arachnid','bird','mammal','reptile','amphibian','fish','other')),
  visual_group      text CHECK (visual_group IN ('tree','flowering_plant','vine','general_plant','mushroom','lichen','moss','fern','butterfly_moth','beetle','other_insect','spider','other_arachnid','bird','mammal','fish','reptile','amphibian','mollusc','other')), -- UI icon key (Treyni)
  distinguishing_characteristics jsonb NOT NULL DEFAULT '[]',
  geographic_distribution text, typical_habitat text, seasonal_occurrence text,
  native_region text, native_status text CHECK (native_status IN ('native','introduced','invasive','unknown')),
  iucn_status       text CHECK (iucn_status IN ('LC','NT','VU','EN','CR','EW','EX','DD','NE')),
  regional_status   text, conservation_source text,
  rarity_tier       text CHECK (rarity_tier IN ('Common','Uncommon','Rare','Elusive','Legendary')),
  rarity_color      text, rarity_region_basis text, rarity_evidence text,
  rarity_provisional boolean NOT NULL DEFAULT true,  -- stored hint; API derives provisional from apo_rarity_signoffs (false only when maomao AND treyni latest = cosign)
  rarity_assessed_by jsonb NOT NULL DEFAULT '[]',
  edible            text CHECK (edible IN ('Yes','No','Conditional','Unknown')) DEFAULT 'Unknown',
  edible_parts jsonb NOT NULL DEFAULT '[]', edibility_conditions text, edibility_cautions jsonb NOT NULL DEFAULT '[]',
  toxicity_humans_level text, toxicity_humans_details text, toxicity_compounds jsonb NOT NULL DEFAULT '[]',
  toxicity_animals  jsonb NOT NULL DEFAULT '[]',       -- [{group,level,details}]
  allergens jsonb NOT NULL DEFAULT '[]', dangerous_lookalikes jsonb NOT NULL DEFAULT '[]',
  ecological_role text, interesting_facts jsonb NOT NULL DEFAULT '[]', chemical_constituents jsonb NOT NULL DEFAULT '[]',
  portrait_media_id text,                               -- FK added below
  portrait_url text, portrait_source text, portrait_credit text, portrait_license text,
  version int NOT NULL DEFAULT 1, last_reviewed date, reviewer text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  search tsvector GENERATED ALWAYS AS (to_tsvector('simple',
     coalesce(scientific_name,'')||' '||coalesce(common_name,'')||' '||coalesce(genus,'')||' '||coalesce(family,'')||' '||coalesce("order",'')||' '||coalesce(class,''))) STORED
);
CREATE INDEX apo_species_search ON apo_species USING gin(search);
CREATE INDEX apo_species_family ON apo_species(family);

-- Repeatable sightings. species_id is denormalized from the current identification for fast filters.
CREATE TABLE apo_observations (
  id               text PRIMARY KEY,                  -- 'OBS-YYYYMMDD-XXXX'
  species_id       text REFERENCES apo_species(id) ON DELETE SET NULL,
  current_identification_id text,                      -- FK added below
  observed_date    date,
  approx_time      text CHECK (approx_time IN ('dawn','morning','midday','afternoon','evening','night','unknown')) DEFAULT 'unknown',
  location_label   text,
  lat double precision, lon double precision,          -- PRIVATE precise values
  coarse_lat double precision, coarse_lon double precision, -- public, rounded per precision_km
  precision_km     real NOT NULL DEFAULT 10,
  location_source  text NOT NULL CHECK (location_source IN ('exif','observer','none')) DEFAULT 'none',
  -- Effective observed_date/approx_time/lat/lon above are DERIVED (src/lib/apothecary/capture.ts): real EXIF wins, else observer, else null.
  observed_date_source text NOT NULL CHECK (observed_date_source IN ('exif','observer','none')) DEFAULT 'none',
  approx_time_source   text NOT NULL CHECK (approx_time_source IN ('exif','observer','none')) DEFAULT 'none',
  -- Hand-entered values (e.g. Zae via chat when EXIF was stripped). Stored separately; never overwrite EXIF (which lives on apo_media).
  observer_date date,
  observer_approx_time text CHECK (observer_approx_time IN ('dawn','morning','midday','afternoon','evening','night','unknown')),
  observer_lat double precision, observer_lon double precision,  -- PRIVATE
  location_public  boolean NOT NULL DEFAULT false,     -- true = precise lat/lon may be shown publicly
  is_public        boolean NOT NULL DEFAULT true,       -- false hides whole observation from public API
  user_notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX apo_obs_species ON apo_observations(species_id);

-- Uploaded files. Original bytes stored untouched in PRIVATE blob; raw EXIF private.
CREATE TABLE apo_media (
  id              text PRIMARY KEY,                    -- 'MED-<uuid>'
  observation_id  text REFERENCES apo_observations(id) ON DELETE SET NULL,
  role            text NOT NULL DEFAULT 'observation' CHECK (role IN ('observation','portrait')),
  original_pathname text NOT NULL,                     -- private blob pathname (never exposed publicly)
  original_filename text, content_type text, byte_size bigint NOT NULL, sha256 text NOT NULL,
  web_pathname    text,                                -- optional derived/display version (public store or same)
  width int, height int,
  exif_raw        jsonb,                               -- full tag dump (PRIVATE)
  exif_datetime_original text, exif_offset_time text,
  exif_gps_lat double precision, exif_gps_lon double precision, exif_gps_alt_m double precision, -- PRIVATE (exif_datetime_original = camera wall-clock "YYYY-MM-DDTHH:MM:SS", zone in exif_offset_time)
  camera_make text, camera_model text, lens text,
  source text, credit text, license text,              -- for portrait media
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX apo_media_sha ON apo_media(sha256, role);
CREATE INDEX apo_media_obs ON apo_media(observation_id);
ALTER TABLE apo_species ADD CONSTRAINT apo_species_portrait_fk FOREIGN KEY (portrait_media_id) REFERENCES apo_media(id) ON DELETE SET NULL;

-- Append-only identification history. Corrections = new revision with supersedes_id.
CREATE TABLE apo_identifications (
  id              text PRIMARY KEY,                    -- 'IDR-<uuid>'
  observation_id  text NOT NULL REFERENCES apo_observations(id) ON DELETE CASCADE,
  revision        int NOT NULL,
  supersedes_id   text REFERENCES apo_identifications(id),
  status          text NOT NULL CHECK (status IN ('pending','proposed','user_reviewed','verified','revised')),
  resolved_rank   text CHECK (resolved_rank IN ('species','genus','family','order','higher')),
  resolved_species_id text REFERENCES apo_species(id),
  verified_by_human boolean NOT NULL DEFAULT false,
  author          text NOT NULL,                       -- 'maomao' | 'zae' | 'treyni'
  change_note     text,
  uncertainties jsonb NOT NULL DEFAULT '[]', diagnostic_features_observed jsonb NOT NULL DEFAULT '[]',
  score_disclaimer text NOT NULL DEFAULT 'Scores are estimates, not calibrated probabilities.',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (observation_id, revision)
);
ALTER TABLE apo_observations ADD CONSTRAINT apo_obs_current_fk FOREIGN KEY (current_identification_id) REFERENCES apo_identifications(id) ON DELETE SET NULL;
CREATE OR REPLACE FUNCTION apo_no_update() RETURNS trigger AS $$ BEGIN RAISE EXCEPTION 'apo_identifications is append-only'; END $$ LANGUAGE plpgsql;
CREATE TRIGGER apo_ident_append_only BEFORE UPDATE ON apo_identifications FOR EACH ROW EXECUTE FUNCTION apo_no_update();

CREATE TABLE apo_candidates (
  id serial PRIMARY KEY,
  identification_id text NOT NULL REFERENCES apo_identifications(id) ON DELETE CASCADE,
  rank_order      int NOT NULL CHECK (rank_order BETWEEN 1 AND 3),
  species_id      text REFERENCES apo_species(id),
  scientific_name text NOT NULL, common_name text,
  rank            text NOT NULL DEFAULT 'species',
  match_score     real NOT NULL CHECK (match_score BETWEEN 0 AND 100),
  -- match_score is an independent estimate per candidate; scores are NEVER normalized to sum to 100.
  confidence_label text CHECK (confidence_label IN ('High','Medium','Low')), -- optional override; API derives from score if null
  rationale text,
  distinguishing_vs_primary jsonb NOT NULL DEFAULT '[]', -- [] for rank_order 1
  portrait_url text,
  portrait_source text NOT NULL DEFAULT 'none' CHECK (portrait_source IN ('verified_reference','generated_illustration','none')),
  portrait_credit text, portrait_license text,
  UNIQUE (identification_id, rank_order)
);
CREATE TRIGGER apo_cand_append_only BEFORE UPDATE ON apo_candidates FOR EACH ROW EXECUTE FUNCTION apo_no_update();

CREATE TABLE apo_uses (
  id              text PRIMARY KEY,                    -- 'USE-<uuid>' (stable, Treyni menus key on it)
  species_id      text NOT NULL REFERENCES apo_species(id) ON DELETE CASCADE,
  category        text NOT NULL CHECK (category IN ('culinary','traditional_medicine','evidence_based_medical','scientific_research','industrial','agriculture','cosmetics','ecological','historical_cultural','other_verified')),
  title           text NOT NULL,                       -- v0.2 "use" (dropdown label, e.g. one dish or one application)
  detail          text,                                -- short
  description     text,                                -- long, optional
  cautions jsonb NOT NULL DEFAULT '[]',
  evidence_level  text CHECK (evidence_level IN ('established','clinical-limited','preliminary','traditional-only')),
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX apo_uses_species ON apo_uses(species_id);

CREATE TABLE apo_references (
  id text PRIMARY KEY,                                 -- 'REF-<uuid>' or caller slug
  title text NOT NULL, url text, type text CHECK (type IN ('database','paper','field-guide','agency','other')) DEFAULT 'other',
  authors text, year int, accessed date,
  created_at timestamptz NOT NULL DEFAULT now()
);
-- Polymorphic link table: a reference can back a species, a use, or an identification.
CREATE TABLE apo_reference_links (
  reference_id text NOT NULL REFERENCES apo_references(id) ON DELETE CASCADE,
  target_type text NOT NULL CHECK (target_type IN ('species','use','identification')),
  target_id text NOT NULL,
  note text,
  PRIMARY KEY (reference_id, target_type, target_id)
);
CREATE INDEX apo_reflinks_target ON apo_reference_links(target_type, target_id);

-- Rarity co-sign log (append-only). Maomao proposes; Treyni co-signs or dissents with sources.
CREATE TABLE apo_rarity_signoffs (
  id serial PRIMARY KEY,
  species_id text NOT NULL REFERENCES apo_species(id) ON DELETE CASCADE,
  by         text NOT NULL,                            -- 'maomao' | 'treyni' | named expert
  decision   text NOT NULL CHECK (decision IN ('cosign','dissent')),
  tier       text CHECK (tier IN ('Common','Uncommon','Rare','Elusive','Legendary')), -- tier being signed
  sources    jsonb NOT NULL DEFAULT '[]',              -- [{title,url}] or reference ids
  note       text,
  at         timestamptz NOT NULL DEFAULT now(),
  UNIQUE (species_id, by, at)
);
CREATE INDEX apo_signoffs_species ON apo_rarity_signoffs(species_id);
CREATE TRIGGER apo_signoff_append_only BEFORE UPDATE ON apo_rarity_signoffs FOR EACH ROW EXECUTE FUNCTION apo_no_update();
