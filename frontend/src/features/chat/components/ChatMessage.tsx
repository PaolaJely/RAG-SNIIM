import { Bot, User, Copy, Check, Zap } from "lucide-react";
import { useState, useCallback, memo } from "react";
import { motion } from "motion/react";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatMessage as ChatMessageType, TokenInfo } from "../../../types/chat";

function TokenBadge({ tokens }: { tokens: TokenInfo }) {
  return (
    <span
      title={`Prompt: ${tokens.tokens_prompt} · Completion: ${tokens.tokens_completion}`}
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-muted text-[10px] text-muted-foreground font-mono"
    >
      <Zap className="w-2.5 h-2.5" aria-hidden="true" />
      {tokens.tokens_total.toLocaleString()} tokens
      {tokens.costo_usd != null && ` · $${tokens.costo_usd.toFixed(5)}`}
    </span>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard API not available
    }
  }, [text]);

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="Copiar respuesta"
      className="opacity-0 group-hover:opacity-100 p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-[opacity,color,background-color] duration-150"
    >
      {copied ? (
        <Check className="w-3.5 h-3.5 text-brand-success" aria-hidden="true" />
      ) : (
        <Copy className="w-3.5 h-3.5" aria-hidden="true" />
      )}
    </button>
  );
}

interface Props {
  message: ChatMessageType;
}

// Custom comparison: skip re-render if id, content, and loading haven't changed.
// This prevents all prior messages from re-rendering when a new one is appended.
function areEqual(prev: Props, next: Props): boolean {
  return (
    prev.message.id === next.message.id &&
    prev.message.content === next.message.content &&
    prev.message.loading === next.message.loading &&
    prev.message.tokens === next.message.tokens
  );
}

export const ChatMessage = memo(function ChatMessage({ message }: Props) {
  if (message.role === "assistant") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex gap-3 group"
      >
        <div className="w-7 h-7 rounded-lg bg-brand-muted flex items-center justify-center shrink-0 mt-0.5 ring-1 ring-brand/10">
          <Bot className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <div className="bg-surface-raised border border-border rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-foreground leading-[1.65]">
            {message.loading ? (
              <TypingIndicator />
            ) : (
              <p className="whitespace-pre-wrap">{message.content}</p>
            )}
          </div>
          {!message.loading && (
            <div className="flex items-center gap-2 pl-1 flex-wrap">
              <CopyButton text={message.content} />
              {message.docs && message.docs.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {message.docs.length} fuentes consultadas
                </span>
              )}
              {message.tokens && <TokenBadge tokens={message.tokens} />}
            </div>
          )}
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="flex gap-3 justify-end"
    >
      <div className="max-w-[78%] bg-brand text-brand-foreground rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-[1.65]">
        {message.content}
      </div>
      <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center shrink-0 mt-0.5">
        <User className="w-3.5 h-3.5 text-muted-foreground" aria-hidden="true" />
      </div>
    </motion.div>
  );
}, areEqual);
