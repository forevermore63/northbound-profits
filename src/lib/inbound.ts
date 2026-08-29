import { isoDate, type Category, type EntryType } from "@/lib/ledger";

type Job = {
  note: string;
  category: Category;
  min: number;
  max: number;
  type: EntryType;
};

const IN: Job[] = [
  { type: "in", note: "Meridian Labs — milestone", category: "Projects", min: 900, max: 4200 },
  { type: "in", note: "Glasshouse — usage license", category: "Product", min: 180, max: 860 },
  { type: "in", note: "Hale & Co — sprint add-on", category: "Retainers", min: 400, max: 1600 },
  { type: "in", note: "North Line — deck revisions", category: "Projects", min: 650, max: 2400 },
  { type: "in", note: "Private client — hold fee", category: "Retainers", min: 500, max: 1800 },
  { type: "in", note: "Type license pack", category: "Product", min: 120, max: 640 },
  { type: "in", note: "Launch site — Glasshouse", category: "Projects", min: 1400, max: 4800 },
  { type: "in", note: "Identity refresh — Hale & Co", category: "Projects", min: 800, max: 2600 },
  { type: "in", note: "Investor memo — North Line", category: "Projects", min: 700, max: 2200 },
];

const OUT: Job[] = [
  { type: "out", note: "Figma, Cursor, Adobe", category: "Software", min: 18, max: 86 },
  { type: "out", note: "Motion freelancer", category: "Contractors", min: 380, max: 1400 },
  { type: "out", note: "Workshop desk", category: "Studio", min: 45, max: 180 },
  { type: "out", note: "PAYG instalment", category: "Tax", min: 420, max: 1600 },
  { type: "out", note: "Client hop — rail + hotel", category: "Travel", min: 80, max: 420 },
  { type: "out", note: "Studio coffee tab", category: "Living", min: 12, max: 64 },
  { type: "out", note: "Copy edit", category: "Contractors", min: 160, max: 720 },
  { type: "out", note: "Type foundry renewal", category: "Software", min: 40, max: 220 },
];

export type InboundHit = {
  id: string;
  type: EntryType;
  amountCents: number;
  note: string;
  category: Category;
  date: string;
};

function pick(job: Job): Omit<InboundHit, "id"> {
  const step = job.type === "in" ? 25 : 5;
  const span = Math.floor((job.max - job.min) / step);
  const dollars = job.min + Math.floor(Math.random() * (span + 1)) * step;
  return {
    type: job.type,
    amountCents: dollars * 100,
    note: job.note,
    category: job.category,
    date: isoDate(new Date()),
  };
}

/** Optional demo feed only. Off by default — these jobs are fictional. */
export function nextCashEvent(): Omit<InboundHit, "id"> {
  const pool = Math.random() < 0.7 ? IN : OUT;
  return pick(pool[Math.floor(Math.random() * pool.length)]!);
}

export function nextInbound(): Omit<InboundHit, "id"> {
  return nextCashEvent();
}
