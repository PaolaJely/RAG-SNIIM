import type { DataSource } from "../stores/filterStore";

/**
 * Base HTTP client.
 *
 * Migration path → replace fetchJson/postJson with
 * @tanstack/react-query + fetch inside queryFn, keeping this
 * module as the single source of truth for base URL and error shape.
 */

/**
 * Base URL de la API.
 * - Dev con proxy Vite (túnel incluido): dejar vacío → peticiones relativas /api/*
 * - Producción o API remota: VITE_API_URL=https://tu-api.com
 */
export const API_BASE = import.meta.env.VITE_API_URL ?? "";

export function dashboardParams(
  destinos?: string[],
  source: DataSource = "sniim",
): Record<string, string> {
  return {
    source,
    ...(destinos?.length ? { destino: destinos.join("|") } : {}),
  };
}

class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(endpoint: string, params?: Record<string, string>): string {
  if (!params) return `${API_BASE}${endpoint}`;
  const filtered = Object.fromEntries(
    Object.entries(params).filter(([, v]) => Boolean(v)),
  );
  const qs = new URLSearchParams(filtered).toString();
  return qs ? `${API_BASE}${endpoint}?${qs}` : `${API_BASE}${endpoint}`;
}

export async function fetchJson<T>(
  endpoint: string,
  params?: Record<string, string>,
): Promise<T> {
  const res = await fetch(buildUrl(endpoint, params));
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new ApiError(res.status, body.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}

export async function postJson<T>(
  endpoint: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new ApiError(res.status, err.detail ?? `HTTP ${res.status}`);
  }
  return res.json() as Promise<T>;
}
