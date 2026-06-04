import { X, Database, FileText } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import type { RagDocument } from "../../../types/chat";

function DocCard({ doc, index }: { doc: RagDocument; index: number }) {
  const pct = Math.round(doc.similarity * 100);
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.04 }}
      className="rounded-lg border border-border bg-surface p-3 space-y-2"
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-brand bg-brand-muted px-1.5 py-0.5 rounded">
          #{index + 1}
        </span>
        <span className="text-[10px] font-semibold text-brand">{pct}%</span>
      </div>
      <p className="text-xs text-muted-foreground leading-snug">
        {doc.origen} → {doc.destino?.split(":")[0].trim()}
      </p>
      <div className="flex items-baseline gap-1.5">
        <span className="text-sm font-semibold text-foreground tabular-nums">
          ${doc.precio_frec}/kg
        </span>
        <span className="text-[11px] text-muted-foreground">{doc.fecha}</span>
      </div>
      <div
        className="w-full bg-muted rounded-full h-1"
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div
          className="bg-brand h-1 rounded-full transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
    </motion.div>
  );
}

interface Props {
  open: boolean;
  onClose: () => void;
  docs: RagDocument[];
}

export function ContextDrawer({ open, onClose, docs }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/30 z-20"
            onClick={onClose}
            aria-hidden="true"
          />
          <motion.aside
            key="drawer"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 280 }}
            className="absolute inset-y-0 right-0 z-30 w-80 bg-surface-raised border-l border-border flex flex-col shadow-xl"
            aria-label="Panel de contexto RAG"
          >
            <div className="flex items-center justify-between px-4 py-3.5 border-b border-border shrink-0">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-brand" aria-hidden="true" />
                <h2 className="text-sm font-semibold text-foreground">Contexto RAG</h2>
                {docs.length > 0 && (
                  <span className="text-[10px] font-bold bg-brand text-brand-foreground px-1.5 py-0.5 rounded-full">
                    {docs.length}
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                aria-label="Cerrar panel"
                className="p-1.5 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-5">
              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Documentos recuperados
                </p>
                {docs.length === 0 ? (
                  <div className="border border-dashed border-border rounded-xl p-6 text-center">
                    <FileText className="w-7 h-7 text-muted-foreground/25 mx-auto mb-2" />
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Los documentos recuperados aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {docs.slice(0, 5).map((doc, i) => (
                      <DocCard key={i} doc={doc} index={i} />
                    ))}
                  </div>
                )}
              </div>

              <div className="border-t border-border" />

              <div>
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-3">
                  Modelos activos
                </p>
                <div className="space-y-2">
                  {[
                    { emoji: "🔢", name: "text-embedding-3-small", detail: "Embeddings · OpenAI" },
                    { emoji: "🤖", name: "gpt-4o-mini", detail: "Generación · OpenAI" },
                  ].map((m) => (
                    <div key={m.name} className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg bg-surface border border-border">
                      <span className="text-sm leading-none">{m.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-foreground">{m.name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{m.detail}</p>
                      </div>
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-success shrink-0" aria-label="activo" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
