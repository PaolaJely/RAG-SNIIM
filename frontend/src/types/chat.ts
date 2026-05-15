export interface RagDocument {
  fecha: string;
  origen: string;
  destino: string;
  precio_frec: number;
  similarity: number;
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
}

export interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  docs?: RagDocument[];
  tokens?: TokenInfo | null;
  loading?: boolean;
}
