/** Currency — $12.50 */
export function formatPrice(value: number): string {
  return `$${value.toFixed(2)}`;
}

/** Short price for charts — $12.5 */
export function formatPriceShort(value: number): string {
  return `$${value.toFixed(1)}`;
}

/** Percentage with sign — +3.2% */
export function formatPct(value: number): string {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

/** Greeting based on hour */
export function getDayGreeting(): string {
  const h = new Date().getHours();
  if (h < 13) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** Long locale date — "lunes, 11 de mayo de 2026" */
export function formatLongDate(): string {
  return new Date().toLocaleDateString("es-MX", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
