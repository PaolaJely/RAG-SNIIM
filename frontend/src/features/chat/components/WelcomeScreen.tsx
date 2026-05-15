import { Sparkles, BarChart3, MapPin, TrendingUp } from "lucide-react";
import { motion } from "motion/react";

const SUGGESTIONS = [
  {
    icon: BarChart3,
    title: "Precio promedio",
    text: "¿Cuál es el precio promedio del plátano en 2025?",
  },
  {
    icon: MapPin,
    title: "Mercado más caro",
    text: "¿En qué mercado es más caro el plátano Tabasco?",
  },
  {
    icon: TrendingUp,
    title: "Tendencia anual",
    text: "¿Cómo evolucionaron los precios a lo largo de 2025?",
  },
];

interface Props {
  onSuggest: (text: string) => void;
}

export function WelcomeScreen({ onSuggest }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="flex flex-col items-center justify-center h-full px-4 py-12"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="w-16 h-16 rounded-2xl bg-brand-muted flex items-center justify-center mb-6 shadow-sm"
      >
        <Sparkles className="w-8 h-8 text-brand" aria-hidden="true" />
      </motion.div>

      <h1 className="text-xl font-semibold text-foreground text-center mb-2">
        Asistente SNIIM
      </h1>
      <p className="text-sm text-muted-foreground text-center max-w-xs leading-relaxed mb-10">
        Consulta precios del plátano Tabasco en lenguaje natural. Respuestas
        fundamentadas en datos oficiales.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-2xl">
        {SUGGESTIONS.map((s) => (
          <button
            key={s.text}
            onClick={() => onSuggest(s.text)}
            className="group text-left rounded-xl border border-border bg-surface-raised p-4 hover:border-brand/40 hover:bg-surface hover:shadow-sm transition-all duration-200"
          >
            <s.icon
              className="w-4 h-4 text-muted-foreground group-hover:text-brand mb-2.5 transition-colors"
              aria-hidden="true"
            />
            <p className="text-xs font-semibold text-foreground mb-1">{s.title}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">{s.text}</p>
          </button>
        ))}
      </div>
    </motion.div>
  );
}
