import { formatMoney, type Currency } from "@/lib/money";
import type { MixSlice } from "@/lib/ledger";
import { cn } from "@/lib/utils";

type Props = {
  title: string;
  slices: MixSlice[];
  currency: Currency;
  tone: "in" | "out";
};

export function MixPanel({ title, slices, currency, tone }: Props) {
  if (slices.length === 0) {
    return (
      <div>
        <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {title}
        </h3>
        <p className="mt-3 text-sm text-subtle">Nothing in this period.</p>
      </div>
    );
  }

  return (
    <div>
      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {title}
      </h3>
      <ul className="mt-3 flex flex-col gap-3">
        {slices.slice(0, 6).map((s) => (
          <li key={s.category}>
            <div className="mb-1.5 flex items-baseline justify-between gap-3">
              <span className="text-sm text-foreground">{s.category}</span>
              <span className="tabular-nums text-sm text-muted-foreground">
                {formatMoney(s.total, currency)}
              </span>
            </div>
            <div className="h-1 overflow-hidden rounded-full bg-foreground/10">
              <div
                className={cn(
                  "h-full rounded-full",
                  tone === "in" ? "bg-gain" : "bg-loss/80",
                )}
                style={{ width: `${Math.max(4, Math.round(s.share * 100))}%` }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
