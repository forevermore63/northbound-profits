import { useEffect, useRef, useState } from "react";
import { formatMoney, type Currency } from "@/lib/money";
import { cn } from "@/lib/utils";
import type { InboundHit } from "@/lib/inbound";

function useAnimatedCents(target: number) {
  const [n, setN] = useState(target);
  const current = useRef(target);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      current.current = target;
      setN(target);
      return;
    }
    const from = current.current;
    if (from === target) return;
    const start = performance.now();
    const dur = 720;
    let raf = 0;
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - (1 - p) ** 3;
      const v = Math.round(from + (target - from) * eased);
      current.current = v;
      setN(v);
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target]);

  return n;
}

type Props = {
  cents: number;
  currency: Currency;
  landed: InboundHit[];
};

export function ProfitFigure({ cents, currency, landed }: Props) {
  const display = useAnimatedCents(cents);
  const up = cents >= 0;

  return (
    <div className="relative">
      <h1
        className={cn(
          "font-display text-display leading-none tracking-[var(--tracking-display)] italic tabular-nums",
          up ? "text-gain" : "text-loss",
        )}
      >
        {formatMoney(display, currency, { signed: true, digits: 0 })}
      </h1>
      <div className="pointer-events-none absolute top-1 hidden flex-col gap-1 sm:left-full sm:ml-5 sm:flex">
        {landed.slice(0, 3).map((hit) => (
          <span
            key={hit.id}
            className={cn(
              "land-float font-medium tabular-nums",
              hit.amountCents >= 0 ? "text-gain" : "text-loss",
            )}
          >
            {formatMoney(hit.amountCents, currency, { signed: true, digits: 0 })}
          </span>
        ))}
      </div>
    </div>
  );
}

type TapeProps = {
  hits: InboundHit[];
  currency: Currency;
};

export function LiveTape({ hits, currency }: TapeProps) {
  if (hits.length === 0) return null;
  return (
    <ul className="flex flex-col gap-2 rounded-xl bg-surface px-4 py-3">
      {hits.slice(0, 4).map((hit) => (
        <li
          key={hit.id}
          className="tape-in flex min-h-10 items-center justify-between gap-3"
        >
          <span className="min-w-0 truncate text-sm text-muted-foreground">
            {hit.note}
          </span>
          <span
            className={cn(
              "shrink-0 text-sm font-medium tabular-nums",
              hit.type === "out" ? "text-loss" : "text-gain",
            )}
          >
            {formatMoney(
              hit.type === "out" ? -hit.amountCents : hit.amountCents,
              currency,
              { signed: true },
            )}
          </span>
        </li>
      ))}
    </ul>
  );
}
