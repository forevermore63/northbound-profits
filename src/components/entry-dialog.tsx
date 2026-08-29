import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { formatMoney, parseAmountToCents, type Currency } from "@/lib/money";
import {
  categoriesFor,
  isoDate,
  type Category,
  type Entry,
  type EntryType,
} from "@/lib/ledger";
import { defaultCategory } from "@/lib/seed";
import { useLedger } from "@/store/ledger";

export type EntryDialogState =
  | { open: false }
  | { open: true; mode: "create" }
  | { open: true; mode: "edit"; entry: Entry };

type Props = {
  state: EntryDialogState;
  onClose: () => void;
  currency: Currency;
};

export function EntryDialog({ state, onClose, currency }: Props) {
  const addEntry = useLedger((s) => s.addEntry);
  const updateEntry = useLedger((s) => s.updateEntry);
  const removeEntry = useLedger((s) => s.removeEntry);

  const open = state.open;
  const editing = state.open && state.mode === "edit" ? state.entry : null;

  const [type, setType] = useState<EntryType>("in");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(isoDate(new Date()));
  const [category, setCategory] = useState<Category>("Projects");
  const [note, setNote] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!state.open) return;
    if (state.mode === "edit") {
      setType(state.entry.type);
      setAmount((state.entry.amountCents / 100).toString());
      setDate(state.entry.date);
      setCategory(state.entry.category);
      setNote(state.entry.note);
    } else {
      setType("in");
      setAmount("");
      setDate(isoDate(new Date()));
      setCategory(defaultCategory("in"));
      setNote("");
    }
    setConfirmDelete(false);
  }, [state]);

  const cats = useMemo(() => categoriesFor(type), [type]);

  function onType(next: EntryType) {
    setType(next);
    if (!cats.includes(category as never)) {
      setCategory(defaultCategory(next));
    } else if (next !== type) {
      setCategory(defaultCategory(next));
    }
  }

  function save() {
    const cents = parseAmountToCents(amount);
    if (cents === null || cents === 0) {
      toast.error("Enter an amount");
      return;
    }
    if (!date) {
      toast.error("Pick a date");
      return;
    }
    const payload = {
      type,
      amountCents: cents,
      date,
      category,
      note: note.trim(),
    };
    if (editing) {
      updateEntry(editing.id, payload);
      toast.success("Entry updated");
    } else {
      addEntry(payload);
      toast.success(type === "in" ? "Money in recorded" : "Money out recorded");
    }
    onClose();
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
        <DialogContent className="rounded-xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit entry" : "New entry"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Adjust the line. Changes stay on this device."
                : "Log money in or out. Nothing leaves this device."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Direction</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg bg-surface-2 p-1">
                <button
                  type="button"
                  onClick={() => onType("in")}
                  className={cn(
                    "h-10 rounded-md text-sm font-medium transition-colors duration-[length:var(--motion-quick)]",
                    type === "in"
                      ? "bg-gain text-accent-fg"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  In
                </button>
                <button
                  type="button"
                  onClick={() => onType("out")}
                  className={cn(
                    "h-10 rounded-md text-sm font-medium transition-colors duration-[length:var(--motion-quick)]",
                    type === "out"
                      ? "bg-loss text-accent-fg"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Out
                </button>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-2">
                <Label htmlFor="date">Date</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="category">Category</Label>
                <select
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Category)}
                  className="flex h-11 w-full rounded-md bg-surface-2 px-3 text-sm text-foreground shadow-[var(--shadow-border)] outline-none focus-visible:ring-2 focus-visible:ring-ring/40"
                >
                  {cats.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="note">Note</Label>
              <Input
                id="note"
                placeholder="Client, tool, or what it was for"
                value={note}
                onChange={(e) => setNote(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="sm:items-center sm:justify-between">
            {editing ? (
              <Button
                type="button"
                variant="ghost"
                className="text-loss hover:text-loss"
                onClick={() => setConfirmDelete(true)}
              >
                Delete
              </Button>
            ) : (
              <span />
            )}
            <div className="flex gap-2">
              <Button type="button" variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button type="button" onClick={save}>
                Save
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this line?</AlertDialogTitle>
            <AlertDialogDescription>
              {editing
                ? `${editing.note || editing.category} · ${formatMoney(editing.amountCents, currency)} will be removed.`
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep it</AlertDialogCancel>
            <AlertDialogAction
              className="bg-loss text-accent-fg hover:opacity-90"
              onClick={() => {
                if (editing) {
                  removeEntry(editing.id);
                  toast.success("Entry deleted");
                }
                setConfirmDelete(false);
                onClose();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
