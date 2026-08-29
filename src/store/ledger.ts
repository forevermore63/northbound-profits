import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { Currency } from "@/lib/money";
import type { Entry } from "@/lib/ledger";
import { buildSample, buildSeed, defaultCategory } from "@/lib/seed";

type LedgerState = {
  entries: Entry[];
  currency: Currency;
  monthlyGoalCents: number;
  businessName: string;
  usingSample: boolean;
  cleared: boolean;
  taxPercent: number;
  seedIfEmpty: () => void;
  setCurrency: (currency: Currency) => void;
  setGoal: (cents: number) => void;
  setTaxPercent: (percent: number) => void;
  setBusinessName: (name: string) => void;
  addEntry: (entry: Omit<Entry, "id">) => string;
  addLiveEntry: (entry: Omit<Entry, "id">) => string;
  updateEntry: (id: string, patch: Partial<Omit<Entry, "id">>) => void;
  removeEntry: (id: string) => void;
  restoreSample: () => void;
  restoreReal: () => void;
  clearAll: () => void;
};

function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `e-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export const useLedger = create<LedgerState>()(
  persist(
    (set, get) => ({
      entries: buildSeed(),
      currency: "AUD",
      monthlyGoalCents: 500000,
      businessName: "Sausage Therapy",
      usingSample: false,
      cleared: false,
      taxPercent: 25,
      seedIfEmpty: () => {
        const s = get();
        if (s.entries.length === 0 && !s.cleared) {
          set({
            entries: buildSeed(),
            usingSample: false,
            businessName: s.businessName || "Sausage Therapy",
            currency: s.currency || "AUD",
          });
        }
      },
      setCurrency: (currency) => set({ currency }),
      setGoal: (cents) => set({ monthlyGoalCents: Math.max(0, cents) }),
      setTaxPercent: (percent) =>
        set({ taxPercent: Math.min(80, Math.max(0, Math.round(percent))) }),
      setBusinessName: (name) => set({ businessName: name.trim() || "Untitled studio" }),
      addEntry: (entry) => {
        const id = uid();
        set((s) => ({
          entries: [...s.entries, { ...entry, id }],
          usingSample: false,
          cleared: false,
        }));
        return id;
      },
      addLiveEntry: (entry) => {
        const id = `live-${Date.now()}-${Math.random().toString(16).slice(2)}`;
        set((s) => {
          const next = [...s.entries, { ...entry, id }];
          const live = next.filter((e) => e.id.startsWith("live-"));
          if (live.length <= 30) {
            return { entries: next, cleared: false };
          }
          const drop = new Set(live.slice(0, live.length - 30).map((e) => e.id));
          return {
            entries: next.filter((e) => !drop.has(e.id)),
            cleared: false,
          };
        });
        return id;
      },
      updateEntry: (id, patch) =>
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
          usingSample: false,
        })),
      removeEntry: (id) =>
        set((s) => ({
          entries: s.entries.filter((e) => e.id !== id),
          usingSample: false,
        })),
      restoreSample: () =>
        set({
          entries: buildSample(),
          usingSample: true,
          cleared: false,
          businessName: "Northbound Studio",
          currency: "USD",
          monthlyGoalCents: 1200000,
        }),
      restoreReal: () =>
        set({
          entries: buildSeed(),
          usingSample: false,
          cleared: false,
          businessName: "Sausage Therapy",
          currency: "AUD",
          monthlyGoalCents: 500000,
          taxPercent: 25,
        }),
      clearAll: () =>
        set({
          entries: [],
          usingSample: false,
          cleared: true,
          businessName: "Sausage Therapy",
        }),
    }),
    {
      name: "profits-ledger-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        entries: s.entries,
        currency: s.currency,
        monthlyGoalCents: s.monthlyGoalCents,
        businessName: s.businessName,
        usingSample: s.usingSample,
        cleared: s.cleared,
        taxPercent: s.taxPercent,
      }),
      onRehydrateStorage: () => (state) => {
        state?.seedIfEmpty();
      },
    },
  ),
);

export { defaultCategory };
