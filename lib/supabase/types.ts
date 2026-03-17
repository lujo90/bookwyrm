export type RegulationStatus = "active" | "superseded" | "under_review";
export type ReviewQueueStatus =
  | "pending"
  | "ai_processed"
  | "approved"
  | "rejected"
  | "edited";

export interface MonitoringJobLog {
  id: string;
  job_name: string;
  run_at: string;
  documents_found: number;
  documents_queued: number;
  error_text: string | null;
}

/** Structured JSON written by the AI queue processor. */
export interface AiInterpretation {
  plain_language_summary: string;
  affected_product_categories: string[];
  affected_certifications: string[];
  affected_channels: string[];
  proposed_checklist_items: string[];
  is_amendment_of_existing: boolean;
  existing_regulation_code: string | null;
  confidence_score: number;
}

export interface Regulation {
  id: string;
  code: string;
  title: string;
  summary: string | null;
  applies_to: string[] | null;
  markets: string[] | null;
  channels: string[] | null;
  certifications: string[] | null;
  checklist_item_refs: string[] | null;
  official_url: string | null;
  effective_date: string | null;
  last_updated: string;
  version: number;
  status: RegulationStatus;
  ai_confidence_score: number | null;
  created_at: string;
}

export interface RegulationVersion {
  id: string;
  regulation_id: string;
  version: number;
  summary: string | null;
  change_description: string | null;
  changed_at: string;
  changed_by: string | null;
}

export interface RegulationReviewQueue {
  id: string;
  eurlex_document_url: string | null;
  eurlex_celex_number: string | null;
  raw_text: string | null;
  ai_interpretation: AiInterpretation | null;
  proposed_regulation_id: string | null;
  is_new_regulation: boolean;
  status: ReviewQueueStatus;
  reviewer_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
}

// Minimal Database type for Supabase client generic
export interface Database {
  public: {
    Tables: {
      regulations: {
        Row: Regulation;
        Insert: Omit<Regulation, "id" | "last_updated" | "created_at"> & {
          id?: string;
          last_updated?: string;
          created_at?: string;
        };
        Update: Partial<Omit<Regulation, "id">>;
      };
      regulation_versions: {
        Row: RegulationVersion;
        Insert: Omit<RegulationVersion, "id" | "changed_at"> & {
          id?: string;
          changed_at?: string;
        };
        Update: Partial<Omit<RegulationVersion, "id">>;
      };
      regulation_review_queue: {
        Row: RegulationReviewQueue;
        Insert: Omit<RegulationReviewQueue, "id" | "created_at"> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Omit<RegulationReviewQueue, "id">>;
      };
      monitoring_job_log: {
        Row: MonitoringJobLog;
        Insert: Omit<MonitoringJobLog, "id" | "run_at"> & {
          id?: string;
          run_at?: string;
        };
        Update: never;
      };
    };
  };
}
