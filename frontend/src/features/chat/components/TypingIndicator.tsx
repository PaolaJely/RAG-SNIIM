import { motion } from "motion/react";

const TYPING_DOT_DELAYS = [0, 0.18, 0.36];

export function TypingIndicator() {
  return (
    <div className="flex items-center gap-1" aria-label="El asistente está escribiendo">
      {TYPING_DOT_DELAYS.map((delay) => (
        <motion.span
          key={delay}
          className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40"
          animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.9, repeat: Infinity, delay, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}
