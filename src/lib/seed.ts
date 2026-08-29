import {
  type Entry,
  type Category,
  addDays,
  addMonths,
  isoDate,
  startOfMonth,
} from "@/lib/ledger";

function mulberry32(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, items: readonly T[]): T {
  return items[Math.floor(rng() * items.length)] as T;
}

function money(rng: () => number, min: number, max: number, step = 50): number {
  const span = Math.floor((max - min) / step);
  return (min + Math.floor(rng() * (span + 1)) * step) * 100;
}

const PROJECT_NOTES = [
  "Brand system — Meridian Labs",
  "Launch site — Glasshouse",
  "Campaign deck — North Line",
  "Identity refresh — Hale & Co",
  "Packaging suite — Private client",
  "Product pages — Meridian Labs",
  "Type specimen — Glasshouse",
  "Investor memo — North Line",
];

const CONTRACTOR_NOTES = [
  "Motion freelancer",
  "Copy edit",
  "Photography day rate",
  "Dev assist — landing",
];

const LIVING_NOTES = [
  "Client lunch",
  "Studio coffee tab",
  "Print proofs",
  "Reference books",
];

/**
 * A six-month freelance studio ledger ending at `now`, shaped so the current
 * month looks alive and the year has a story (June dip, July peak).
 */
export function buildSeed(now = new Date()): Entry[] {
  const rng = mulberry32(20260829);
  const entries: Entry[] = [];
  let n = 0;
  const id = () => `seed-${++n}`;

  const start = startOfMonth(addMonths(now, -5));
  const today = isoDate(now);

  for (let cursor = new Date(start); isoDate(cursor) <= today; cursor = addDays(cursor, 1)) {
    const day = cursor.getDate();
    const month = cursor.getMonth();
    const iso = isoDate(cursor);
    const monthMul =
      month === 5 ? 0.72 : month === 6 ? 1.32 : month === 2 ? 0.78 : 1;

    if (day === 1) {
      entries.push({
        id: id(),
        date: iso,
        type: "in",
        amountCents: 420000,
        category: "Retainers",
        note: "Hale & Co — monthly retainer",
      });
    }

    if (day === 3) {
      entries.push({
        id: id(),
        date: iso,
        type: "out",
        amountCents: 45000,
        category: "Studio",
        note: "Workshop desk",
      });
    }

    if (day === 5) {
      entries.push({
        id: id(),
        date: iso,
        type: "out",
        amountCents: 18600,
        category: "Software",
        note: "Figma, Cursor, Adobe",
      });
    }

    if (day === 8 && rng() > 0.15) {
      entries.push({
        id: id(),
        date: iso,
        type: "in",
        amountCents: Math.round(money(rng, 1800, 6400, 100) * monthMul),
        category: "Projects",
        note: pick(rng, PROJECT_NOTES),
      });
    }

    if (day === 14 && rng() > 0.35) {
      entries.push({
        id: id(),
        date: iso,
        type: "in",
        amountCents: Math.round(money(rng, 900, 3800, 50) * monthMul),
        category: "Projects",
        note: pick(rng, PROJECT_NOTES),
      });
    }

    if (day === 21 && rng() > 0.4) {
      entries.push({
        id: id(),
        date: iso,
        type: "in",
        amountCents: Math.round(money(rng, 1200, 4200, 100) * monthMul),
        category: "Projects",
        note: pick(rng, PROJECT_NOTES),
      });
    }

    if (day === 26 && monthMul > 1 && rng() > 0.4) {
      entries.push({
        id: id(),
        date: iso,
        type: "in",
        amountCents: money(rng, 400, 1600, 50),
        category: "Product",
        note: "Type license pack",
      });
    }

    if (day === 11 && rng() > 0.45) {
      entries.push({
        id: id(),
        date: iso,
        type: "out",
        amountCents: money(rng, 250, 1400, 25),
        category: "Contractors",
        note: pick(rng, CONTRACTOR_NOTES),
      });
    }

    if (day === 18 && rng() > 0.5) {
      entries.push({
        id: id(),
        date: iso,
        type: "out",
        amountCents: money(rng, 40, 180, 10),
        category: "Living",
        note: pick(rng, LIVING_NOTES),
      });
    }

    if (day === 22 && rng() > 0.72) {
      entries.push({
        id: id(),
        date: iso,
        type: "out",
        amountCents: money(rng, 180, 620, 20),
        category: "Travel",
        note: "Client hop — rail + hotel",
      });
    }

    const quarterMonth = month % 3 === 2;
    if (quarterMonth && day === 28) {
      entries.push({
        id: id(),
        date: iso,
        type: "out",
        amountCents: 180000,
        category: "Tax",
        note: "Quarterly set-aside",
      });
    }
  }

  // Guarantee a handful of current-month rows so the hero is never empty.
  const thisMonth = isoDate(now).slice(0, 7);
  const hasCurrentIn = entries.some(
    (e) => e.date.startsWith(thisMonth) && e.type === "in" && e.category === "Projects",
  );
  if (!hasCurrentIn) {
    const date = isoDate(new Date(now.getFullYear(), now.getMonth(), Math.min(12, now.getDate())));
    entries.push({
      id: id(),
      date,
      type: "in",
      amountCents: 280000,
      category: "Projects",
      note: "Launch site — Glasshouse",
    });
  }

  return entries.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

export function defaultCategory(type: "in" | "out"): Category {
  return type === "in" ? "Projects" : "Studio";
}
