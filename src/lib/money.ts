export const CURRENCIES = ["USD", "AUD", "EUR", "GBP"] as const;
export type Currency = (typeof CURRENCIES)[number];

const LOCALE: Record<Currency, string> = {
  USD: "en-US",
  AUD: "en-AU",
  EUR: "en-IE",
  GBP: "en-GB",
};

export function formatMoney(
  cents: number,
  currency: Currency,
  opts: { signed?: boolean; compact?: boolean; digits?: "auto" | 0 | 2 } = {},
) {
  const value = cents / 100;
  const abs = Math.abs(value);
  let maximumFractionDigits: number;
  let minimumFractionDigits: number;
  if (opts.compact) {
    maximumFractionDigits = abs >= 1000 ? 0 : abs >= 100 ? 0 : 2;
    minimumFractionDigits = 0;
  } else if (opts.digits === 0) {
    maximumFractionDigits = 0;
    minimumFractionDigits = 0;
  } else if (opts.digits === 2) {
    maximumFractionDigits = 2;
    minimumFractionDigits = 2;
  } else {
    const hasCents = Math.round(abs * 100) % 100 !== 0;
    maximumFractionDigits = hasCents ? 2 : 0;
    minimumFractionDigits = hasCents ? 2 : 0;
  }

  const formatted = new Intl.NumberFormat(LOCALE[currency], {
    style: "currency",
    currency,
    maximumFractionDigits,
    minimumFractionDigits,
  }).format(abs);

  if (opts.signed) {
    if (cents > 0) return `+${formatted}`;
    if (cents < 0) return `−${formatted}`;
  }
  if (cents < 0) return `−${formatted}`;
  return formatted;
}

export function parseAmountToCents(raw: string): number | null {
  const cleaned = raw.replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const n = Number.parseFloat(cleaned);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
