import { API_BASE } from "./api";
import type {
  ImportApproval,
  ImportFormMetadata,
  ImportPreview,
} from "../types/imports";

export async function analyzeImport(
  file: File,
  metadata: ImportFormMetadata,
): Promise<ImportPreview> {
  const form = new FormData();
  form.append("file", file);
  if (metadata.producerName.trim()) {
    form.append("producer_name", metadata.producerName.trim());
  }
  if (metadata.municipality.trim()) {
    form.append("municipality", metadata.municipality.trim());
  }
  form.append("currency", metadata.currency);
  if (metadata.packageWeightKg) {
    form.append("package_weight_kg", metadata.packageWeightKg);
  }

  const response = await fetch(`${API_BASE}/api/imports/analyze`, {
    method: "POST",
    body: form,
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<ImportPreview>;
}

export async function approveImport(
  batchId: number,
  excludeErrors: boolean,
): Promise<ImportApproval> {
  const response = await fetch(`${API_BASE}/api/imports/${batchId}/approve`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ exclude_errors: excludeErrors }),
  });
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.detail ?? `HTTP ${response.status}`);
  }
  return response.json() as Promise<ImportApproval>;
}
