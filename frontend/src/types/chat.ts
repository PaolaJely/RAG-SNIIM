export interface RagVectorDocument {
  fecha: string;
  origen: string;
  destino: string;
  precio_frec: number;
  similarity: number;
}

export interface SqlResultDocument {
  source: "postgres";
  type: "sql_result" | "hybrid_sql_result";
  operation: string;
  year?: string | null;
  markets?: string[];
  rows: Record<string, unknown>[];
}

export type RagDocument = RagVectorDocument | SqlResultDocument;

export interface QueryIntent {
  intent: "analitica_sql" | "vectorial_rag" | "hibrida";
  reason: string;
  confidence: number;
}

export interface TokenInfo {
  tokens_prompt: number;
  tokens_completion: number;
  tokens_total: number;
  costo_usd: number;
}

export interface ChatApiResponse {
  respuesta: string;
  documentos: RagDocument[];
  total_docs: number;
  tokens: TokenInfo | null;
  intent?: QueryIntent;
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  docs?: RagDocument[];
  tokens?: TokenInfo | null;
  loading?: boolean;
}
