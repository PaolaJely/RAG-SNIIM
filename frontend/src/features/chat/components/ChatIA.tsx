import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Database } from "lucide-react";
import { AnimatePresence } from "motion/react";
import { useChat } from "../hooks/useChat";
import { ChatMessage } from "./ChatMessage";
import { ChatInput } from "./ChatInput";
import { WelcomeScreen } from "./WelcomeScreen";
import { ContextDrawer } from "./ContextDrawer";

export function ChatIA() {
  const { messages, activeDocs, sending, isWelcome, send } = useChat();
  const [input, setInput] = useState("");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isWelcome) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isWelcome]);

  // Stable: only recreated when `input` or `send` changes.
  // `send` is now stable (no deps), so this only changes when the user types.
  const handleSend = useCallback(async (text?: string) => {
    const value = text ?? input;
    await send(value);
    if (!text) setInput("");
  }, [input, send]);

  // Avoid re-filtering messages on every keystroke.
  const userMessageCount = useMemo(
    () => messages.filter((m) => m.role === "user").length,
    [messages],
  );

  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  return (
    <div className="relative flex flex-col h-[calc(100vh-3.5rem)] bg-surface">
      {/* Minimal toolbar */}
      <div className="flex items-center justify-between h-10 px-4 border-b border-border/50 bg-surface-raised shrink-0">
        <span className="text-xs text-muted-foreground">
          {isWelcome ? "Nueva conversación" : `${userMessageCount} preguntas`}
        </span>
        <button
          type="button"
          onClick={openDrawer}
          aria-label="Ver documentos recuperados"
          className={[
            "flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-medium transition-all",
            activeDocs.length > 0
              ? "text-brand bg-brand-muted/50 hover:bg-brand-muted"
              : "text-muted-foreground hover:bg-muted hover:text-foreground",
          ].join(" ")}
        >
          <Database className="w-3 h-3" aria-hidden="true" />
          <span>Contexto</span>
          {activeDocs.length > 0 && (
            <span className="bg-brand text-brand-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {activeDocs.length}
            </span>
          )}
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" role="log" aria-live="polite" aria-label="Conversación">
        {isWelcome ? (
          <WelcomeScreen onSuggest={handleSend} />
        ) : (
          <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
            <AnimatePresence initial={false}>
              {messages.map((message) => (
                <ChatMessage key={message.id} message={message} />
              ))}
            </AnimatePresence>
            <div ref={messagesEndRef} aria-hidden="true" />
          </div>
        )}
      </div>

      {/* Input */}
      <ChatInput
        value={input}
        onChange={setInput}
        onSend={handleSend}
        sending={sending}
        showChips={!isWelcome && messages.length <= 3}
      />

      {/* Context drawer */}
      <ContextDrawer
        open={drawerOpen}
        onClose={closeDrawer}
        docs={activeDocs}
      />
    </div>
  );
}
