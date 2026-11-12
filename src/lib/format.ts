export function indiaDate(offsetDays = 0) {
  const parts = new Intl.DateTimeFormat("en", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map((part) => [part.type, Number(part.value)]));
  return new Date(Date.UTC(values.year, values.month - 1, values.day + offsetDays))
    .toISOString()
    .slice(0, 10);
}

export function formatDate(date: string) {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(`${date}T12:00:00+05:30`));
}

export function formatRupees(paise: bigint | number | string | null | undefined) {
  const amount = typeof paise === "bigint" ? paise : BigInt(paise ?? 0);
  const negative = amount < 0n;
  const absolute = negative ? -amount : amount;
  const rupees = absolute / 100n;
  const remainder = String(absolute % 100n).padStart(2, "0");
  return `${negative ? "−" : ""}₹${rupees.toLocaleString("en-IN")}.${remainder}`;
}
