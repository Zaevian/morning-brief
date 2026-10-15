// Shared TypeScript shapes for the Apothecary card payload (contract v1, schema v0.2). Treyni can import these.
export type VisualGroup = "tree" | "flowering_plant" | "vine" | "general_plant" | "mushroom" | "lichen" | "moss" | "fern" | "butterfly_moth" | "beetle" | "other_insect" | "spider" | "other_arachnid" | "bird" | "mammal" | "fish" | "reptile" | "amphibian" | "mollusc" | "other";
export type ApproxTime = "dawn" | "morning" | "midday" | "afternoon" | "evening" | "night" | "unknown";
export type ConfidenceLabel = "High" | "Medium" | "Low";
export type UseCategory = "culinary" | "traditional_medicine" | "evidence_based_medical" | "scientific_research" | "industrial" | "agriculture" | "cosmetics" | "ecological" | "historical_cultural" | "other_verified";
export type PortraitSource = "verified_reference" | "generated_illustration" | "none";

export interface Candidate {
  rank_order: 1 | 2 | 3; species_id: string | null; scientific_name: string; common_name: string | null; rank: string;
  /** Independent 0-100 estimate. Never normalized; the three need not sum to 100. */
  match_score: number; confidence_label: ConfidenceLabel | null; rationale: string | null;
  distinguishing_vs_primary: string[]; portrait_url: string | null;
  /** generated_illustration must be labeled "Illustration" on the card. */
  portrait_source: PortraitSource; portrait_credit: string | null; portrait_license: string | null;
}
export interface Identification {
  id: string; revision: number; supersedes_id: string | null;
  status: "pending" | "proposed" | "user_reviewed" | "verified" | "revised";
  resolved_rank: "species" | "genus" | "family" | "order" | "higher" | null; resolved_species_id: string | null;
  identification_confidence_label: ConfidenceLabel | null; verified_by_human: boolean; author: string; change_note: string | null;
  uncertainties: string[]; diagnostic_features_observed: string[]; score_disclaimer: string; created_at: string;
  candidates: Candidate[]; sources: { id: string; title: string; url: string | null; accessed: string | null }[];
}
export interface UseItem { id: string; use: string; detail: string | null; description: string | null; cautions: string[]; evidence_level: string | null; source_ids: string[] }
export interface RaritySignoff { by: string; decision: "cosign" | "dissent"; tier: string | null; sources: unknown[]; note: string | null; at: string }
export interface Media { id: string; role: "observation" | "portrait"; url: string; width: number | null; height: number | null; sha256: string; byte_size: number;
  camera: { make: string | null; model: string | null; lens: string | null }; datetime_original: string | null; offset_time: string | null }
export interface SpeciesProfile {
  species_profile_id: string; scientific_name: string; common_name: string | null; authority: string | null; rank: string;
  taxonomy: Record<"kingdom" | "phylum" | "class" | "order" | "family" | "genus" | "species", string | null>;
  organism_type: string | null; visual_group: VisualGroup | null; distinguishing_characteristics: string[];
  geographic_distribution: string | null; typical_habitat: string | null; seasonal_occurrence: string | null;
  native_status: { region: string | null; status: string | null };
  conservation_status: { iucn: string | null; regional: string | null; source: string | null };
  collectible_rarity: { tier: string | null; color: string | null; region_basis: string | null; evidence: string | null; provisional: boolean; assessed_by: string[]; signoffs: RaritySignoff[] };
  edibility: { edible: string | null; edible_parts: string[]; conditions: string | null; cautions: string[]; verified_safe_specimen: false; warning: string };
  toxicity: { humans: { level: string | null; details: string | null; compounds: string[] }; animals: { group: string; level: string; details: string }[]; allergens: string[]; dangerous_lookalikes: { name: string; how_to_tell: string }[] };
  ecological_role: string | null; interesting_facts: string[]; chemical_constituents: { name: string; note: string; source: string }[];
  portrait: { media_id: string | null; url: string | null; source: string | null; credit: string | null; license: string | null };
  /** Complete lists per category (every dish / every application); empty categories omitted. */
  uses: Partial<Record<UseCategory, UseItem[]>>;
  use_categories: { key: UseCategory; label: string; count: number }[];
  references: { id: string; title: string; url: string | null; type: string; authors: string | null; year: number | null; accessed: string | null }[];
  record_meta: { version: number; last_reviewed: string | null; reviewer: string | null; updated_at: string };
}
export interface CardPayload {
  card_version: 1;
  observation: { observation_id: string; species_profile_id: string | null; current_identification_id: string | null; observed_date: string | null; approx_time: ApproxTime;
    location: { label: string | null; lat: number | null; lon: number | null; precision_km: number | null; source: "exif" | "user" | "none"; is_precise: boolean };
    is_public: boolean; location_public: boolean; user_notes: string | null; created_at: string; updated_at: string; media: Media[] };
  identification: Identification | null; identification_history: Identification[];
  species: SpeciesProfile | null;
  sightings_of_species: { count: number; others: { id: string; observed_date: string | null; approx_time: ApproxTime; location_label: string | null }[] };
}
