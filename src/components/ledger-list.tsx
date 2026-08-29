import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { formatMoney, type Currency } from "@/lib/money";
import {
  formatShortDate,
  groupByDate,
  type Entry,
} from "@/lib/ledger";
import { cn } from "@/lib/utils";

type Props = {
  entries: Entry[];
  currency: Currency;
  query: string;
  onQuery: (q: string) => void;
  onOpen: (entry: Entry) => void;
  highlightIds?: string[];
};

export function LedgerList({
  entries,
  currency,
  query,
  onQuery,
  onOpen,
  highlightIds = [],
}: Props) {
  const filtered = query.trim()
    ? entries.filter((e) => {
        const q = query.toLowerCase();
        return (
          e.note.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.date.includes(q)
        );
      })
    : entries;

  const groups = groupByDate(filtered);

  return (
    <section className="min-w-0">
      <div className="mb-4 flex items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl tracking-tight">Ledger</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "line" : "lines"}
          </p>
        </div>
        <div className="relative w-40 sm:w-56">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-subtle" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Search"
            aria-label="Search ledger"
            className="h-11 pl-9"
          />
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="rounded-xl bg-surface px-5 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {query
              ? "No lines match that search."
              : "The ledger is empty. Add money in or out to start."}
          </p>
        </div>
      ) : (
        <ol className="flex flex-col gap-6">
          {groups.map((g) => (
            <li key={g.date}>
              <p className="mb-2 text-xs font-medium tracking-wide text-subtle uppercase">
                {formatShortDate(g.date)}
              </p>
              <ul className="overflow-hidden rounded-xl bg-surface">
                {g.rows.map((row, i) => (
                  <li key={row.id}>
                    <button
                      type="button"
                      onClick={() => onOpen(row)}
                      className={cn(
                        "flex min-h-14 w-full items-center gap-3 px-4 py-3 text-left transition-colors duration-[length:var(--motion-quick)] hover:bg-foreground/5",
                        i !== 0 && "border-t border-border",
                        highlightIds.includes(row.id) &&
                          (row.type === "out" ? "ledger-land-out" : "ledger-land"),
                      )}
                    >
                      <span
                        className={cn(
                          "size-1.5 shrink-0 rounded-full",
                          row.type === "in" ? "bg-gain" : "bg-loss",
                        )}
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-foreground">
                          {row.note || row.category}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {row.note ? row.category : row.type === "in" ? "In" : "Out"}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 font-medium tabular-nums",
                          row.type === "in" ? "text-gain" : "text-foreground",
                        )}
                      >
                        {row.type === "in" ? "+" : "−"}
                        {formatMoney(row.amountCents, currency)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
