import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatMoney, type Currency } from "@/lib/money";
import type { WeekPoint } from "@/lib/ledger";

type Props = {
  series: WeekPoint[];
  currency: Currency;
};

function ChartTooltip({
  active,
  payload,
  currency,
}: {
  active?: boolean;
  payload?: Array<{ payload: WeekPoint }>;
  currency: Currency;
}) {
  if (!active || !payload?.[0]) return null;
  const p = payload[0].payload;
  return (
    <div className="rounded-md bg-popover px-3 py-2 text-xs shadow-[var(--shadow-float)]">
      <p className="mb-1.5 text-muted-foreground">Week of {p.label}</p>
      <p className="tabular-nums text-gain">In {formatMoney(p.inflow, currency)}</p>
      <p className="tabular-nums text-loss">Out {formatMoney(p.outflow, currency)}</p>
      <p className="mt-1 tabular-nums text-foreground">
        Net {formatMoney(p.net, currency, { signed: true })}
      </p>
    </div>
  );
}

export function ProfitChart({ series, currency }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const data = useMemo(
    () =>
      series.map((p) => ({
        ...p,
        netDollars: p.net / 100,
      })),
    [series],
  );

  const hasSignal = series.some((p) => p.inflow !== 0 || p.outflow !== 0);

  if (!hasSignal) {
    return (
      <div className="flex h-52 items-center justify-center rounded-xl bg-surface px-6 text-center">
        <p className="max-w-xs text-sm text-muted-foreground">
          Profit by week will plot here once there is activity in this period.
        </p>
      </div>
    );
  }

  if (!mounted) {
    return <div className="h-52 w-full sm:h-64" />;
  }

  return (
    <div className="h-52 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="profitFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#b7c4a8" stopOpacity={0.28} />
              <stop offset="100%" stopColor="#b7c4a8" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            vertical={false}
            stroke="rgba(242,239,230,0.06)"
            strokeDasharray="0"
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#9c9789", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tick={{ fill: "#6e6a60", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={56}
            tickFormatter={(v: number) =>
              formatMoney(Math.round(v * 100), currency, { compact: true })
            }
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ stroke: "rgba(242,239,230,0.16)", strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="netDollars"
            stroke="#b7c4a8"
            strokeWidth={1.75}
            fill="url(#profitFill)"
            activeDot={{ r: 3.5, fill: "#b7c4a8", stroke: "#0b0b0a", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
