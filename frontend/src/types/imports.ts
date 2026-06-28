export type ImportRowStatus = "valid" | "warning" | "error";

export interface ImportMetadata {
  title: string | null;
  product_name: string | null;
  quality: string | null;
  presentation: string | null;
  producer_name: string | null;
  municipality: string | null;
  currency: string;
  package_weight_kg: number | null;
  column_mapping?: Record<string, string | null>;
}

export interface ImportSummary {
  total_rows: number;
  valid_rows: number;
  warning_rows: number;
  error_rows: number;
  issues: number;
}

export interface ImportPreviewRow {
  source_row: number;
  source_year_block: number | null;
  record_date: string | null;
  year: number | null;
  iso_week: number | null;
  month: number | null;
  product_name: string | null;
  quality: string | null;
  presentation: string | null;
  price: number | null;
  currency: string;
  status: ImportRowStatus;
}

export interface ImportIssue {
  row: number;
  source_year_block: number | null;
  column: string;
  code: string;
  severity: "warning" | "error";
  message: string;
  value: unknown;
  suggestion: unknown;
}

export interface ImportPreview {
  filename: string;
  sheet: string;
  format: "annual_blocks" | "flat_table";
  metadata: ImportMetadata;
  summary: ImportSummary;
  rows: ImportPreviewRow[];
  issues: ImportIssue[];
  truncated: boolean;
  batch_id?: number;
  batch_status?: "analyzed" | "needs_review";
  agent_used?: boolean;
}

export interface ImportFormMetadata {
  producerName: string;
  municipality: string;
  currency: string;
  packageWeightKg: string;
  adminToken: string;
}

export interface ImportApproval {
  batch_id: number;
  producer_id: number;
  imported_rows: number;
  excluded_error_rows: number;
  status: "imported";
}
