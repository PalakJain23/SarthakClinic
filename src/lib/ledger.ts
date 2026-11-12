export type LedgerAmount = { amountPaise: bigint };

const MAX_AMOUNT_PAISE = 100_000_000_000n;

export function parseRupeesToPaise(value: string, allowNegative = false): bigint | null {
  const pattern = allowNegative
    ? /^-?\d{1,9}(?:\.\d{1,2})?$/
    : /^\d{1,9}(?:\.\d{1,2})?$/;
  if (!pattern.test(value)) return null;
  const negative = value.startsWith("-");
  const unsigned = negative ? value.slice(1) : value;
  const [whole, fraction = ""] = unsigned.split(".");
  const paise = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  if (paise === 0n || paise > MAX_AMOUNT_PAISE) return null;
  return negative ? -paise : paise;
}

export function calculateLedgerBalance(entries: readonly LedgerAmount[]) {
  return entries.reduce((balance, entry) => balance + entry.amountPaise, 0n);
}

export function calculateAccountTotals(balances: readonly bigint[]) {
  return balances.reduce(
    (totals, balance) => {
      if (balance > 0n) {
        totals.outstanding += balance;
        totals.patientsOwing += 1;
      } else if (balance < 0n) {
        totals.patientCredit += -balance;
      }
      return totals;
    },
    { outstanding: 0n, patientsOwing: 0, patientCredit: 0n },
  );
}
