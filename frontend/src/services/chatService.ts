import { postJson } from "./api";
import type { ChatApiResponse } from "../types/chat";

export function sendMessage(pregunta: string): Promise<ChatApiResponse> {
  const hoy = new Date().toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const preguntaConFecha = `${pregunta} (fecha actual: ${hoy})`;
  return postJson<ChatApiResponse>("/api/chat", { pregunta: preguntaConFecha });
}