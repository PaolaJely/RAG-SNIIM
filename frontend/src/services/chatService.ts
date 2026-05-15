import { postJson } from "./api";
import type { ChatApiResponse } from "../types/chat";

export function sendMessage(pregunta: string): Promise<ChatApiResponse> {
  return postJson<ChatApiResponse>("/api/chat", { pregunta });
}
