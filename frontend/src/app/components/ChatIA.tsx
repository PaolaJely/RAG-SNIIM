import { Send, X, Database, FileText, Loader2 } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { postApi } from "../hooks/useApi";

interface RagDoc {
  fecha: string;
  origen: string;
  destino: string;
  precio_frec: number;
  similarity: number;
}

interface ChatResponse {
  respuesta: string;
  documentos: RagDoc[];
  total_docs: number;
}

interface Message {
  id: number;
  role: "user" | "assistant";
  content: string;
  docs?: RagDoc[];
  loading?: boolean;
}

const SUGGESTIONS = [
  "¿Cuál es el precio promedio del plátano?",
  "¿En qué mercado es más caro?",
  "¿Cómo fue la tendencia en 2025?",
];

export function ChatIA() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 1,
      role: "assistant",
      content: "¡Hola! Soy tu asistente de precios SNIIM. Puedes preguntarme sobre tendencias de precios, comparaciones entre mercados o períodos específicos.",
    },
  ]);
  const [input, setInput] = useState("");
  const [activeDocs, setActiveDocs] = useState<RagDoc[]>([]);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const pregunta = (text ?? input).trim();
    if (!pregunta || sending) return;

    const userMsg: Message = { id: Date.now(), role: "user", content: pregunta };
    const loadingMsg: Message = { id: Date.now() + 1, role: "assistant", content: "", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);
    setInput("");
    setSending(true);

    try {
      const result = await postApi<ChatResponse>("/api/chat", { pregunta });

      setActiveDocs(result.documentos);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: result.respuesta, docs: result.documentos, loading: false }
            : m
        )
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingMsg.id
            ? { ...m, content: `Error al contactar el servidor: ${err instanceof Error ? err.message : "Intenta nuevamente"}`, loading: false }
            : m
        )
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex h-[calc(100vh-4rem)]">
      {/* LEFT PANEL - Context */}
      <aside className="w-[35%] bg-[#F0F3F4] border-r border-gray-300 flex flex-col overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Database className="w-5 h-5 text-[#1B4F72]" />
            <h3 className="text-[#1B4F72]">Contexto activo</h3>
          </div>

          {/* Retrieved Documents */}
          <div className="mb-6">
            <h4 className="text-sm text-gray-600 mb-3">
              Documentos recuperados (RAG)
              {activeDocs.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-[#1B4F72] text-white text-xs rounded">
                  {activeDocs.length}
                </span>
              )}
            </h4>

            {activeDocs.length === 0 ? (
              <p className="text-xs text-gray-400 italic">
                Los documentos relevantes aparecerán aquí después de tu primera pregunta.
              </p>
            ) : (
              <div className="space-y-3">
                {activeDocs.slice(0, 5).map((doc, i) => (
                  <div key={i} className="bg-white rounded-lg p-3 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs bg-[#1B4F72] text-white px-2 py-0.5 rounded">
                        #{i + 1}
                      </span>
                      <FileText className="w-4 h-4 text-gray-400" />
                    </div>
                    <div className="text-xs text-gray-600 mb-1">
                      {doc.origen} → {doc.destino?.split(":")[0].trim()}
                    </div>
                    <div className="text-sm text-gray-800 mb-2">
                      ${doc.precio_frec}/kg · {doc.fecha}
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500">
                        {(doc.similarity * 100).toFixed(0)}% similitud
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-1.5">
                        <div
                          className="bg-[#27AE60] h-1.5 rounded-full"
                          style={{ width: `${doc.similarity * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Model info */}
          <div>
            <h4 className="text-sm text-gray-600 mb-3">Modelo activo</h4>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 bg-white rounded flex items-center justify-center">🦙</div>
                <div>
                  <div className="text-gray-700">nomic-embed-text</div>
                  <div className="text-xs text-gray-500">embeddings · Ollama</div>
                </div>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <div className="w-6 h-6 bg-white rounded flex items-center justify-center">🤖</div>
                <div>
                  <div className="text-gray-700">GPT-4</div>
                  <div className="text-xs text-gray-500">generación · OpenAI</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* RIGHT PANEL - Chat */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-6 bg-white">
          <div className="max-w-3xl mx-auto space-y-4">
            {messages.map((message) => (
              <div key={message.id}>
                {message.role === "assistant" ? (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-lg p-4 max-w-2xl shadow-sm">
                      {message.loading ? (
                        <div className="flex items-center gap-2 text-gray-400">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          <span className="text-sm">Consultando RAG...</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-gray-800 whitespace-pre-wrap text-sm leading-relaxed">
                            {message.content}
                          </div>
                          {message.docs && message.docs.length > 0 && (
                            <div className="text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                              📊 Basado en {message.docs.length} registros de Supabase
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex justify-end">
                    <div className="bg-[#1B4F72] text-white rounded-lg p-4 max-w-2xl text-sm">
                      {message.content}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="bg-white border-t border-gray-200 p-6">
          <div className="max-w-3xl mx-auto">
            <div className="flex gap-2 mb-3 flex-wrap">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  onClick={() => handleSend(s)}
                  disabled={sending}
                  className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-xs text-gray-700 rounded-full transition-colors disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
                placeholder="Pregunta sobre precios, mercados o tendencias..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1B4F72] text-sm"
                disabled={sending}
              />
              <button
                onClick={() => handleSend()}
                disabled={!input.trim() || sending}
                className="px-6 py-3 bg-[#1B4F72] text-white rounded-lg hover:bg-[#153d5a] disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
