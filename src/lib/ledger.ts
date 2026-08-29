import type { Currency } from "@/lib/money";
import { formatMoney } from "@/lib/money";

export const INCOME_CATEGORIES = [
  "Retainers",
  "Projects",
  "Product",
  "Other income",
] as const;

export const EXPENSE_CATEGORIES = [
  "Software",
  "Studio",
  "Contractors",
  "Tax",
  "Travel",
  "Living",
  "Other spend",
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];
export type Category = IncomeCategory | ExpenseCategory;
export type EntryType = "in" | "out";
export type Period = "month" | "quarter" | "year" | "all";

export type Entry = {
  id: string;
  date: string;
  type: EntryType;
  amountCents: number;
  category: Category;
  note: string;
};

export const PERIOD_LABEL: Record<Period, string> = {
  month: "This month",
  quarter: "Quarter",
  year: "Year",
  all: "All time",
};

export function categoriesFor(type: EntryType): readonly Category[] {
  return type === "in" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
}

export function isoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function parseIso(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y ?? 0, (m ?? 1) - 1, d ?? 1);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function startOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), 1);
}

export function endOfMonth(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
}

export function addMonths(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth() + n, d.getDate());
}

export function startOfQuarter(d: Date): Date {
  const q = Math.floor(d.getMonth() / 3) * 3;
  return new Date(d.getFullYear(), q, 1);
}

export function startOfYear(d: Date): Date {
  return new Date(d.getFullYear(), 0, 1);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function startOfWeek(d: Date): Date {
  const day = d.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;
  return startOfDay(addDays(d, mondayOffset));
}

export type Range = { start: Date; end: Date };

export function periodRange(period: Period, now: Date): Range {
  const end = startOfDay(now);
  if (period === "month") return { start: startOfMonth(now), end };
  if (period === "quarter") return { start: startOfQuarter(now), end };
  if (period === "year") return { start: startOfYear(now), end };
  return { start: new Date(2000, 0, 1), end };
}

export function previousRange(period: Period, now: Date): Range | null {
  if (period === "all") return null;
  if (period === "month") {
    const prev = addMonths(startOfMonth(now), -1);
    return { start: startOfMonth(prev), end: endOfMonth(prev) };
  }
  if (period === "quarter") {
    const prev = addMonths(startOfQuarter(now), -3);
    const end = addDays(startOfQuarter(now), -1);
    return { start: startOfQuarter(prev), end };
  }
  const start = new Date(now.getFullYear() - 1, 0, 1);
  const end = new Date(now.getFullYear() - 1, 11, 31);
  return { start, end };
}

export function inRange(iso: string, range: Range): boolean {
  const d = parseIso(iso);
  return d >= range.start && d <= range.end;
}

export type Totals = {
  revenue: number;
  spend: number;
  profit: number;
  margin: number;
  count: number;
  taxPaid: number;
  operating: number;
};

export function totals(entries: Entry[], range: Range): Totals {
  let revenue = 0;
  let spend = 0;
  let taxPaid = 0;
  let count = 0;
  for (const e of entries) {
    if (!inRange(e.date, range)) continue;
    count += 1;
    if (e.type === "in") revenue += e.amountCents;
    else {
      spend += e.amountCents;
      if (e.category === "Tax") taxPaid += e.amountCents;
    }
  }
  const profit = revenue - spend;
  const operating = spend - taxPaid;
  const margin = revenue === 0 ? 0 : profit / revenue;
  return { revenue, spend, profit, margin, count, taxPaid, operating };
}

export type TakeHome = {
  taxable: number;
  due: number;
  aside: number;
  real: number;
  rate: number;
};

/** Take-home after a tax set-aside on operating profit. Tax already paid is not double-counted. */
export function takeHome(t: Totals, taxPercent: number): TakeHome {
  const rate = Math.min(80, Math.max(0, taxPercent)) / 100;
  const taxable = Math.max(0, t.revenue - t.operating);
  const due = Math.round(taxable * rate);
  const aside = Math.max(0, due - t.taxPaid);
  return { taxable, due, aside, real: t.profit - aside, rate };
}

export type WeekPoint = {
  weekStart: string;
  label: string;
  inflow: number;
  outflow: number;
  net: number;
};

const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export function formatShortDate(iso: string): string {
  const d = parseIso(iso);
  return `${d.getDate()} ${MONTH_SHORT[d.getMonth()]}`;
}

export function formatMonthYear(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  }).format(d);
}

export function weekSeries(entries: Entry[], range: Range): WeekPoint[] {
  const points = new Map<string, WeekPoint>();
  let cursor = startOfWeek(range.start);
  const last = startOfWeek(range.end);
  while (cursor <= last) {
    const key = isoDate(cursor);
    points.set(key, {
      weekStart: key,
      label: formatShortDate(key),
      inflow: 0,
      outflow: 0,
      net: 0,
    });
    cursor = addDays(cursor, 7);
  }
  for (const e of entries) {
    if (!inRange(e.date, range)) continue;
    const key = isoDate(startOfWeek(parseIso(e.date)));
    const p = points.get(key);
    if (!p) continue;
    if (e.type === "in") p.inflow += e.amountCents;
    else p.outflow += e.amountCents;
    p.net = p.inflow - p.outflow;
  }
  return [...points.values()];
}

export type MixSlice = { category: Category; total: number; share: number };

export function mixFor(
  entries: Entry[],
  range: Range,
  type: EntryType,
): MixSlice[] {
  const map = new Map<Category, number>();
  let sum = 0;
  for (const e of entries) {
    if (e.type !== type || !inRange(e.date, range)) continue;
    map.set(e.category, (map.get(e.category) ?? 0) + e.amountCents);
    sum += e.amountCents;
  }
  return [...map.entries()]
    .map(([category, total]) => ({
      category,
      total,
      share: sum === 0 ? 0 : total / sum,
    }))
    .sort((a, b) => b.total - a.total);
}

export type Insight = {
  id: string;
  kicker: string;
  title: string;
  body: string;
};

export function insightsFor(
  entries: Entry[],
  range: Range,
  prev: Range | null,
  monthlyGoalCents: number,
  period: Period,
  now: Date,
  currency: Currency,
  taxPercent: number,
): Insight[] {
  const current = totals(entries, range);
  const keep = takeHome(current, taxPercent);
  const previous = prev ? totals(entries, prev) : null;
  const inMix = mixFor(entries, range, "in");
  const outMix = mixFor(entries, range, "out");
  const weeks = weekSeries(entries, range);
  const bestWeek = [...weeks].sort((a, b) => b.net - a.net)[0];

  const list: Insight[] = [];

  if (period === "month") {
    const day = now.getDate();
    const daysInMonth = endOfMonth(now).getDate();
    const pace = day === 0 ? 0 : keep.real / day;
    const projected = Math.round(pace * daysInMonth);
    const gap = monthlyGoalCents - keep.real;
    if (keep.real >= monthlyGoalCents) {
      list.push({
        id: "goal",
        kicker: "Goal",
        title: "Already cleared the month",
        body: `Real profit is ahead of the ${formatMoney(monthlyGoalCents, currency, { digits: 0 })} target with ${daysInMonth - day} days left.`,
      });
    } else {
      const needed = Math.max(0, gap);
      list.push({
        id: "goal",
        kicker: "Pace",
        title:
          projected >= monthlyGoalCents
            ? "On pace for the target"
            : "Behind the monthly target",
        body:
          projected >= monthlyGoalCents
            ? `This pace lands near ${formatMoney(projected, currency, { digits: 0 })} take-home by month-end.`
            : `${formatMoney(needed, currency, { digits: 0 })} more take-home this month closes the gap.`,
      });
    }
  } else if (previous) {
    const prevKeep = takeHome(previous, taxPercent);
    const delta = keep.real - prevKeep.real;
    list.push({
      id: "delta",
      kicker: "Versus last",
      title: delta >= 0 ? "Take-home is up" : "Take-home is down",
      body:
        prevKeep.real === 0
          ? "No prior period to compare against."
          : `${Math.abs(Math.round((delta / Math.abs(prevKeep.real)) * 100))}% ${delta >= 0 ? "above" : "below"} the last period.`,
    });
  }

  if (keep.aside > 0) {
    list.push({
      id: "tax",
      kicker: "Real profit",
      title: `${taxPercent}% still to set aside`,
      body: `${formatMoney(keep.aside, currency, { digits: 0 })} reserved so the figure above is actually yours.`,
    });
  }

  if (inMix[0] && list.length < 3) {
    list.push({
      id: "source",
      kicker: "Top source",
      title: inMix[0].category,
      body: `${Math.round(inMix[0].share * 100)}% of money in this period.`,
    });
  }

  if (outMix[0] && list.length < 3) {
    list.push({
      id: "leak",
      kicker: "Biggest leak",
      title: outMix[0].category,
      body: `${Math.round(outMix[0].share * 100)}% of spend — watch this line.`,
    });
  }

  if (bestWeek && bestWeek.net > 0 && list.length < 3) {
    list.push({
      id: "week",
      kicker: "Best week",
      title: `Week of ${bestWeek.label}`,
      body: "Highest net of the period.",
    });
  }

  return list.slice(0, 3);
}

export function groupByDate(entries: Entry[]): { date: string; rows: Entry[] }[] {
  const map = new Map<string, Entry[]>();
  const sorted = [...entries].sort((a, b) =>
    a.date === b.date ? b.amountCents - a.amountCents : a.date < b.date ? 1 : -1,
  );
  for (const e of sorted) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return [...map.entries()].map(([date, rows]) => ({ date, rows }));
}

export function periodCaption(period: Period, now: Date): string {
  if (period === "month") return formatMonthYear(now);
  if (period === "quarter") {
    const q = Math.floor(now.getMonth() / 3) + 1;
    return `Q${q} ${now.getFullYear()}`;
  }
  if (period === "year") return String(now.getFullYear());
  return "All activity";
}
