import { useState, useCallback, useRef } from "react";
import { sendMessage } from "../../../services/chatService";
import type { ChatMessage, RagDocument } from "../../../types/chat";

const WELCOME_MESSAGE: ChatMessage = {
  id: 1,
  role: "assistant",
  content:
    "¡Hola! Soy tu asistente de precios SNIIM. Puedes preguntarme sobre tendencias de precios, comparaciones entre mercados o períodos específicos.",
};

interface UseChatReturn {
  messages: ChatMessage[];
  activeDocs: RagDocument[];
  sending: boolean;
  isWelcome: boolean;
  send: (text: string) => Promise<void>;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [activeDocs, setActiveDocs] = useState<RagDocument[]>([]);
  const [sending, setSending] = useState(false);

  // Using a ref to guard concurrent sends avoids including `sending` in
  // useCallback deps, which would recreate `send` on every state change
  // and force ChatInput / WelcomeScreen to re-render while streaming.
  const sendingRef = useRef(false);

  // Stable reference: `send` never changes after mount.
  const send = useCallback(async (text: string) => {
    const pregunta = text.trim();
    if (!pregunta || sendingRef.current) return;

    // IDs: crypto.randomUUID() is available in all modern browsers and is
    // collision-free, unlike Date.now() which can repeat within the same ms.
    const userId = crypto.randomUUID ? parseInt(crypto.randomUUID().replace(/-/g, "").slice(0, 8), 16) : Date.now();
    const loadingId = userId + 1;

    const userMsg: ChatMessage = { id: userId, role: "user", content: pregunta };
    const loadingMsg: ChatMessage = { id: loadingId, role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    sendingRef.current = true;
    setSending(true);

    try {
      const result = await sendMessage(pregunta);
      setActiveDocs(result.documentos);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, content: result.respuesta, docs: result.documentos, tokens: result.tokens, loading: false }
            : m,
        ),
      );
    } catch (err) {
      const errorText = err instanceof Error ? err.message : "Intenta nuevamente";
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { ...m, content: `Error al contactar el servidor: ${errorText}`, loading: false }
            : m,
        ),
      );
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, []); // stable — no deps needed thanks to sendingRef

  return {
    messages,
    activeDocs,
    sending,
    isWelcome: messages.length === 1,
    send,
  };
}
