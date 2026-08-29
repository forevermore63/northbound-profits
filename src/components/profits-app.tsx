import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  ArrowDownRight,
  ArrowUpRight,
  Download,
  Ellipsis,
  Plus,
  RotateCcw,
  Target,
  Percent,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { EntryDialog, type EntryDialogState } from "@/components/entry-dialog";
import { LedgerList } from "@/components/ledger-list";
import { MixPanel } from "@/components/mix-panel";
import { ProfitChart } from "@/components/profit-chart";
import { LiveTape, ProfitFigure } from "@/components/profit-figure";
import { cn } from "@/lib/utils";
import { CURRENCIES, formatMoney, parseAmountToCents, type Currency } from "@/lib/money";
import {
  insightsFor,
  mixFor,
  periodCaption,
  periodRange,
  previousRange,
  takeHome,
  totals,
  weekSeries,
  type Period,
} from "@/lib/ledger";
import { useLedger } from "@/store/ledger";
import { nextCashEvent, type InboundHit } from "@/lib/inbound";

const PERIODS: Period[] = ["month", "quarter", "year", "all"];
const PERIOD_CHIP: Record<Period, string> = {
  month: "Month",
  quarter: "Quarter",
  year: "Year",
  all: "All",
};

function useNow() {
  const [now] = useState(() => new Date());
  return now;
}

export function ProfitsApp() {
  const now = useNow();
  const entries = useLedger((s) => s.entries);
  const currency = useLedger((s) => s.currency);
  const goal = useLedger((s) => s.monthlyGoalCents);
  const taxPercent = useLedger((s) => s.taxPercent);
  const businessName = useLedger((s) => s.businessName);
  const usingSample = useLedger((s) => s.usingSample);
  const setCurrency = useLedger((s) => s.setCurrency);
  const setGoal = useLedger((s) => s.setGoal);
  const setTaxPercent = useLedger((s) => s.setTaxPercent);
  const setBusinessName = useLedger((s) => s.setBusinessName);
  const restoreSample = useLedger((s) => s.restoreSample);
  const clearAll = useLedger((s) => s.clearAll);
  const addLiveEntry = useLedger((s) => s.addLiveEntry);

  const [period, setPeriod] = useState<Period>("month");
  const [query, setQuery] = useState("");
  const [dialog, setDialog] = useState<EntryDialogState>({ open: false });
  const [goalOpen, setGoalOpen] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");
  const [taxOpen, setTaxOpen] = useState(false);
  const [taxDraft, setTaxDraft] = useState("");
  const [nameEditing, setNameEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(businessName);
  const [clearOpen, setClearOpen] = useState(false);
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [live, setLive] = useState(true);
  const [landed, setLanded] = useState<InboundHit[]>([]);
  const [freshIds, setFreshIds] = useState<string[]>([]);
  const liveRef = useRef(live);
  liveRef.current = live;

  useEffect(() => {
    if (!live) return;
    let timer = 0;
    let cancelled = false;
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const tick = () => {
      if (cancelled || !liveRef.current) return;
      const hit = nextCashEvent();
      const id = addLiveEntry({
        type: hit.type,
        amountCents: hit.amountCents,
        category: hit.category,
        note: hit.note,
        date: hit.date,
      });
      const packed: InboundHit = { ...hit, id };
      setLanded((prev) => [packed, ...prev].slice(0, 6));
      setFreshIds((prev) => [id, ...prev].slice(0, 8));
      window.setTimeout(() => {
        setFreshIds((prev) => prev.filter((x) => x !== id));
      }, 2400);
      const wait = reduced ? 12000 : 3800 + Math.random() * 3200;
      timer = window.setTimeout(tick, wait);
    };

    const arm = () => {
      if (cancelled) return;
      timer = window.setTimeout(tick, reduced ? 1800 : 700);
    };

    let armed = false;
    const armOnce = () => {
      if (armed) return;
      armed = true;
      arm();
    };

    const persistApi = useLedger.persist;
    let unsub: (() => void) | undefined;
    if (persistApi.hasHydrated()) armOnce();
    else {
      unsub = persistApi.onFinishHydration(armOnce);
      timer = window.setTimeout(armOnce, 500);
    }

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      unsub?.();
    };
  }, [live, addLiveEntry]);

  const range = useMemo(() => periodRange(period, now), [period, now]);
  const prev = useMemo(() => previousRange(period, now), [period, now]);
  const current = useMemo(() => totals(entries, range), [entries, range]);
  const previous = useMemo(
    () => (prev ? totals(entries, prev) : null),
    [entries, prev],
  );
  const series = useMemo(() => weekSeries(entries, range), [entries, range]);
  const inMix = useMemo(() => mixFor(entries, range, "in"), [entries, range]);
  const outMix = useMemo(() => mixFor(entries, range, "out"), [entries, range]);
  const insights = useMemo(
    () => insightsFor(entries, range, prev, goal, period, now, currency, taxPercent),
    [entries, range, prev, goal, period, now, currency, taxPercent],
  );
  const rangedEntries = useMemo(
    () => entries.filter((e) => e.date >= toIso(range.start) && e.date <= toIso(range.end)),
    [entries, range],
  );

  const keep = useMemo(() => takeHome(current, taxPercent), [current, taxPercent]);
  const prevKeep = useMemo(
    () => (previous ? takeHome(previous, taxPercent) : null),
    [previous, taxPercent],
  );

  const delta =
    prevKeep && prevKeep.real !== 0
      ? (keep.real - prevKeep.real) / Math.abs(prevKeep.real)
      : null;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-30 border-b border-border bg-bg/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <span className="font-display text-xl italic tracking-tight">Profits</span>
            <span className="hidden text-subtle sm:inline" aria-hidden>
              /
            </span>
            {nameEditing ? (
              <input
                autoFocus
                value={nameDraft}
                onChange={(e) => setNameDraft(e.target.value)}
                onBlur={() => {
                  setBusinessName(nameDraft);
                  setNameEditing(false);
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    setBusinessName(nameDraft);
                    setNameEditing(false);
                  }
                  if (e.key === "Escape") setNameEditing(false);
                }}
                className="min-w-0 flex-1 bg-transparent text-sm text-muted-foreground outline-none"
                aria-label="Studio name"
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setNameDraft(businessName);
                  setNameEditing(true);
                }}
                className="hidden min-w-0 truncate text-left text-sm text-muted-foreground hover:text-foreground sm:block"
              >
                {businessName}
              </button>
            )}
            {usingSample && (
              <span className="hidden rounded-full bg-foreground/5 px-2.5 py-1 text-xs text-muted-foreground md:inline">
                Sample ledger
              </span>
            )}
            <button
              type="button"
              aria-pressed={live}
              onClick={() => setLive((v) => !v)}
              className={cn(
                "inline-flex h-9 shrink-0 items-center gap-2 rounded-full px-3 text-xs font-medium transition-colors duration-[length:var(--motion-quick)]",
                live
                  ? "bg-gain/15 text-gain"
                  : "bg-foreground/5 text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "size-1.5 rounded-full bg-current",
                  live && "live-dot",
                )}
                aria-hidden
              />
              Live
            </button>
          </div>

          <Button
            size="sm"
            onClick={() => setDialog({ open: true, mode: "create" })}
            className="shrink-0"
          >
            <Plus className="size-4" />
            Add
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="secondary" size="icon-sm" aria-label="More">
                <Ellipsis className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuLabel>Currency</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={currency}
                onValueChange={(v) => setCurrency(v as Currency)}
              >
                {CURRENCIES.map((c) => (
                  <DropdownMenuRadioItem key={c} value={c}>
                    {c}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => {
                  setGoalDraft(String(goal / 100));
                  setGoalOpen(true);
                }}
              >
                <Target className="size-4" />
                Monthly goal
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => {
                  setTaxDraft(String(taxPercent));
                  setTaxOpen(true);
                }}
              >
                <Percent className="size-4" />
                Tax set-aside
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportCsv(entries)}>
                <Download className="size-4" />
                Export CSV
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setRestoreOpen(true)}>
                <RotateCcw className="size-4" />
                Restore sample
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-loss focus:text-loss"
                onClick={() => setClearOpen(true)}
              >
                <Trash2 className="size-4" />
                Clear ledger
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="mx-auto flex max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10">
        <section className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {periodCaption(period, now)}
              </p>
              <div className="mt-1">
                <ProfitFigure
                  cents={keep.real}
                  currency={currency}
                  landed={landed.map((h) => {
                    const signed = h.type === "out" ? -h.amountCents : h.amountCents;
                    return {
                      ...h,
                      amountCents: Math.round(signed * (1 - taxPercent / 100)),
                    };
                  })}
                />
              </div>
              <p className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 text-sm text-muted-foreground">
                Real profit
                {delta !== null ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-0.5 tabular-nums",
                      delta >= 0 ? "text-gain" : "text-loss",
                    )}
                  >
                    {delta >= 0 ? (
                      <ArrowUpRight className="size-3.5" />
                    ) : (
                      <ArrowDownRight className="size-3.5" />
                    )}
                    {Math.abs(Math.round(delta * 100))}% vs last period
                  </span>
                ) : (
                  <span>after tax set-aside</span>
                )}
              </p>
              <p className="mt-1 text-xs text-subtle">
                Booked {formatMoney(current.profit, currency, { digits: 0 })}
                {keep.aside > 0
                  ? ` · ${taxPercent}% still aside ${formatMoney(keep.aside, currency, { digits: 0 })}`
                  : taxPercent > 0
                    ? ` · ${taxPercent}% tax already covered`
                    : ""}
              </p>
            </div>

            <div
              role="tablist"
              aria-label="Period"
              className="flex gap-1 self-start rounded-lg bg-surface p-1"
            >
              {PERIODS.map((p) => (
                <button
                  key={p}
                  type="button"
                  role="tab"
                  aria-selected={period === p}
                  onClick={() => setPeriod(p)}
                  className={cn(
                    "h-11 rounded-md px-3 text-sm font-medium transition-colors duration-[length:var(--motion-quick)]",
                    period === p
                      ? "bg-foreground text-bg"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {PERIOD_CHIP[p]}
                </button>
              ))}
            </div>
          </div>

          <dl className="grid grid-cols-3 gap-3 sm:gap-4">
            <Stat label="In" value={formatMoney(current.revenue, currency, { digits: 0 })} />
            <Stat label="Out" value={formatMoney(current.spend, currency, { digits: 0 })} />
            <Stat
              label="Set aside"
              value={
                keep.aside === 0
                  ? "—"
                  : formatMoney(keep.aside, currency, { digits: 0 })
              }
            />
          </dl>

          {period === "month" && goal > 0 && (
            <GoalBar profit={keep.real} goal={goal} currency={currency} />
          )}

          {live && landed.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                On the wire
              </p>
              <LiveTape hits={landed} currency={currency} />
            </div>
          )}
        </section>

        <section>
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Weekly net
            </h2>
            <p className="text-xs text-subtle">{rangedEntries.length} entries</p>
          </div>
          <ProfitChart series={series} currency={currency} />
        </section>

        {insights.length > 0 && (
          <section className="grid gap-3 sm:grid-cols-3">
            {insights.map((ins) => (
              <article
                key={ins.id}
                className="rounded-xl bg-surface px-4 py-4"
              >
                <p className="text-xs font-medium tracking-wide text-subtle uppercase">
                  {ins.kicker}
                </p>
                <h3 className="mt-2 font-display text-xl leading-snug">{ins.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{ins.body}</p>
              </article>
            ))}
          </section>
        )}

        <div className="grid gap-10 lg:grid-cols-[minmax(0,1.4fr)_minmax(16rem,0.8fr)] lg:gap-12">
          <LedgerList
            entries={rangedEntries}
            currency={currency}
            query={query}
            onQuery={setQuery}
            onOpen={(entry) => setDialog({ open: true, mode: "edit", entry })}
            highlightIds={freshIds}
          />
          <aside className="flex flex-col gap-8">
            <MixPanel title="Money in" slices={inMix} currency={currency} tone="in" />
            <MixPanel title="Money out" slices={outMix} currency={currency} tone="out" />
          </aside>
        </div>

        <p className="pb-6 text-center text-xs text-subtle">
          Figures stay on this device. Nothing is uploaded.
        </p>
      </main>

      <EntryDialog
        state={dialog}
        onClose={() => setDialog({ open: false })}
        currency={currency}
      />

      <Dialog open={goalOpen} onOpenChange={setGoalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Monthly profit goal</DialogTitle>
            <DialogDescription>
              Used for the pace insight this month. Stays on this device.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="goal">Target</Label>
            <Input
              id="goal"
              inputMode="decimal"
              value={goalDraft}
              onChange={(e) => setGoalDraft(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setGoalOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const cents = parseAmountToCents(goalDraft);
                if (cents === null) {
                  toast.error("Enter a target amount");
                  return;
                }
                setGoal(cents);
                setGoalOpen(false);
                toast.success("Goal updated");
              }}
            >
              Save goal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={taxOpen} onOpenChange={setTaxOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tax set-aside</DialogTitle>
            <DialogDescription>
              Percent of operating profit held back so the hero is take-home, not booked. Tax already in the ledger is not counted twice.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            <Label htmlFor="tax">Percent</Label>
            <Input
              id="tax"
              inputMode="numeric"
              value={taxDraft}
              onChange={(e) => setTaxDraft(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {[0, 15, 20, 25, 30, 35].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTaxDraft(String(n))}
                className={cn(
                  "h-11 rounded-md px-3 text-sm font-medium transition-colors duration-[length:var(--motion-quick)]",
                  taxDraft === String(n)
                    ? "bg-foreground text-bg"
                    : "bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {n}%
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={() => setTaxOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => {
                const n = Number.parseInt(taxDraft, 10);
                if (!Number.isFinite(n) || n < 0 || n > 80) {
                  toast.error("Use a percent between 0 and 80");
                  return;
                }
                setTaxPercent(n);
                setTaxOpen(false);
                toast.success("Tax set-aside updated");
              }}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={clearOpen} onOpenChange={setClearOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear the ledger?</AlertDialogTitle>
            <AlertDialogDescription>
              Every line will be removed from this device. This cannot be undone,
              except by restoring the sample.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction
              className="bg-loss text-accent-fg hover:opacity-90"
              onClick={() => {
                clearAll();
                setLanded([]);
                setFreshIds([]);
                toast.success("Ledger cleared");
              }}
            >
              Clear
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={restoreOpen} onOpenChange={setRestoreOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Restore the sample studio?</AlertDialogTitle>
            <AlertDialogDescription>
              Replaces the current ledger with Northbound Studio’s six-month sample.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                restoreSample();
                setLanded([]);
                setFreshIds([]);
                toast.success("Sample ledger restored");
              }}
            >
              Restore
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function toIso(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface px-3 py-3 sm:px-4 sm:py-4">
      <dt className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-1 font-display text-xl tabular-nums tracking-tight sm:text-2xl">
        {value}
      </dd>
    </div>
  );
}

function GoalBar({
  profit,
  goal,
  currency,
}: {
  profit: number;
  goal: number;
  currency: Currency;
}) {
  const pct = Math.min(100, Math.max(0, Math.round((profit / goal) * 100)));
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">
          Goal {formatMoney(goal, currency, { digits: 0 })}
        </span>
        <span className="tabular-nums text-subtle">{pct}%</span>
      </div>
      <div className="h-1 overflow-hidden rounded-full bg-foreground/10">
        <div
          className="h-full rounded-full bg-gain transition-[width] duration-[length:var(--motion-slow)] ease-[var(--ease-smooth-out)]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function exportCsv(entries: { date: string; type: string; category: string; note: string; amountCents: number }[]) {
  const header = "Date,Type,Category,Note,Amount";
  const rows = [...entries]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => {
      const note = `"${e.note.replaceAll('"', '""')}"`;
      const amount = (e.amountCents / 100).toFixed(2);
      return `${e.date},${e.type},${e.category},${note},${amount}`;
    });
  const blob = new Blob([[header, ...rows].join("\n")], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "profits-ledger.csv";
  a.click();
  URL.revokeObjectURL(url);
  toast.success("CSV downloaded");
}
