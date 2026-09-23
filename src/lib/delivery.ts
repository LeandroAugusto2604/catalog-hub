export function businessDaysDate(days: number, from = new Date()): string {
  const d = new Date(from);
  let left = Math.max(0, Math.round(Number(days) || 0));
  while (left > 0) {
    d.setDate(d.getDate() + 1);
    const w = d.getDay();
    if (w !== 0 && w !== 6) left--;
  }
  return d.toLocaleDateString("pt-BR", {
    weekday: "long", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "America/Sao_Paulo",
  });
}
