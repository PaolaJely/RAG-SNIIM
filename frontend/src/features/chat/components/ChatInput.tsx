import { Send, BarChart3, MapPin, TrendingUp } from "lucide-react";
import { useRef } from "react";

const QUICK_CHIPS = [
  { icon: BarChart3, label: "Precio promedio", text: "¿Cuál es el precio promedio?" },
  { icon: MapPin, label: "Mercado más caro", text: "¿En qué mercado es más caro?" },
  { icon: TrendingUp, label: "Tendencia", text: "¿Cómo fue la tendencia en 2025?" },
];

interface Props {
  value: string;
  onChange: (v: string) => void;
  onSend: (text?: string) => void;
  sending: boolean;
  showChips?: boolean;
}

export function ChatInput({ value, onChange, onSend, sending, showChips = false }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const canSend = value.trim().length > 0 && !sending;

  return (
    <div className="bg-surface border-t border-border/50 px-4 py-3.5 shrink-0">
      <div className="max-w-2xl mx-auto space-y-2.5">
        {showChips && (
          <div className="flex flex-wrap gap-1.5">
            {QUICK_CHIPS.map((c) => (
              <button
                type="button"
                key={c.text}
                onClick={() => onSend(c.text)}
                disabled={sending}
                className="flex items-center gap-1.5 h-7 px-3 rounded-full border border-border bg-surface-raised text-xs text-muted-foreground hover:text-foreground hover:border-brand/30 transition-all disabled:opacity-40"
              >
                <c.icon className="w-3 h-3" aria-hidden="true" />
                <span>{c.label}</span>
              </button>
            ))}
          </div>
        )}

        <div
          className={[
            "flex items-end gap-2 rounded-2xl border bg-surface-raised px-3 py-2.5 shadow-sm transition-all duration-150",
            sending ? "border-border opacity-75" : "border-border hover:border-brand/30 focus-within:border-brand/50 focus-within:ring-1 focus-within:ring-brand/15",
          ].join(" ")}
        >
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              autoResize();
            }}
            onKeyDown={handleKeyDown}
            placeholder="Pregunta sobre precios, mercados o tendencias..."
            aria-label="Escribe tu pregunta"
            disabled={sending}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none leading-relaxed disabled:opacity-50"
            style={{ minHeight: "24px", maxHeight: "140px" }}
          />
          <button
            type="button"
            onClick={() => onSend()}
            disabled={!canSend}
            aria-label="Enviar mensaje"
            className={[
              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-all duration-150",
              canSend
                ? "bg-brand text-brand-foreground hover:bg-brand-light shadow-sm"
                : "bg-muted text-muted-foreground cursor-not-allowed",
            ].join(" ")}
          >
            <Send className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>

        <p className="text-[11px] text-muted-foreground text-center">
          <kbd>Enter</kbd> para enviar · <kbd>Shift+Enter</kbd> nueva línea
        </p>
      </div>
    </div>
  );
}
