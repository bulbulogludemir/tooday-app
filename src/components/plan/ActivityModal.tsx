"use client";

import { useState } from "react";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { Check, Sparkles, Trash2 } from "lucide-react";
import { hhmmToMinutes, minutesToHHmm } from "@/lib/time";
import type { Activity } from "@/stores/usePlanStore";
import { hasOverlap, usePlanStore } from "@/stores/usePlanStore";
import { findFreeSlot } from "@/lib/schedule";
import { useToastStore } from "@/stores/useToastStore";
import Modal from "@/components/ui/Modal";
import ColorDot from "@/components/ui/ColorDot";

interface ActivityModalProps {
  open: boolean;
  day: string; // YYYY-MM-DD
  editing: Activity | null; // null => create
  /** prefilled times when creating from a timeline click */
  initial?: { start: number; end: number } | null;
  onClose: () => void;
}

export default function ActivityModal({
  open,
  day,
  editing,
  initial = null,
  onClose,
}: ActivityModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={(v) => !v && onClose()}
      title={editing ? "Update Activity" : "New Activity"}
      width={440}
      footer={<FormFooterPortalTarget />}
    >
      {open && (
        <ModalForm
          key={editing?.id ?? "new"}
          day={day}
          editing={editing}
          initial={initial}
          onClose={onClose}
        />
      )}
    </Modal>
  );
}

/**
 * The footer buttons need the form's state, so the form renders them into
 * this placeholder via a simple portal-free trick: the form draws its own
 * footer and the Modal's footer slot stays empty. To keep the Modal API
 * simple we just render nothing here.
 */
function FormFooterPortalTarget() {
  return null;
}

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

function ModalForm({
  day,
  editing,
  initial,
  onClose,
}: {
  day: string;
  editing: Activity | null;
  initial: { start: number; end: number } | null;
  onClose: () => void;
}) {
  const {
    addActivityWithRepeat,
    updateActivity,
    removeActivity,
    categories,
    plans,
  } = usePlanStore();

  const [name, setName] = useState(editing?.name ?? "");
  const [categoryId, setCategoryId] = useState<string | null>(
    editing?.category ?? null
  );
  const [startText, setStartText] = useState(
    editing
      ? minutesToHHmm(editing.start)
      : initial
        ? minutesToHHmm(initial.start)
        : ""
  );
  const [endText, setEndText] = useState(
    editing
      ? minutesToHHmm(editing.start + editing.duration)
      : initial
        ? minutesToHHmm(initial.end)
        : ""
  );
  const [repeat, setRepeat] = useState<number[]>(editing?.repeat ?? []);
  const [touched, setTouched] = useState(false);

  const start = hhmmToMinutes(startText);
  const end = hhmmToMinutes(endText);
  const nameValid = name.trim().length > 0;
  const timesValid = start !== null && end !== null && end > start;
  // an activity owns its time slot — no overlapping with others on this day
  const conflicts =
    timesValid &&
    hasOverlap(plans[day] ?? [], start!, end! - start!, editing?.id);

  const selectedCat = categories.find((c) => c.id === categoryId) ?? null;

  /** ✨ on the start field: continue right after the day's last activity */
  const suggestStart = () => {
    const dayActivities = plans[day] ?? [];
    const lastEnd = dayActivities.reduce(
      (max, a) => Math.max(max, a.start + a.duration),
      480 // default day starts at 08:00 when empty
    );
    setStartText(minutesToHHmm(Math.min(lastEnd, 1380)));
  };

  /** ✨ on the end field: one hour after the start */
  const suggestEnd = () => {
    const s = hhmmToMinutes(startText) ?? 480;
    setEndText(minutesToHHmm(Math.min(s + 60, 1439)));
  };

  const toggleRepeatDay = (i: number) =>
    setRepeat((r) => (r.includes(i) ? r.filter((x) => x !== i) : [...r, i]));

  const save = () => {
    setTouched(true);
    if (!nameValid || !timesValid || conflicts) return;
    const payload = {
      name: name.trim(),
      category: categoryId,
      start: start!,
      duration: end! - start!,
      repeat,
    };
    if (editing) updateActivity(day, { ...payload, id: editing.id });
    else addActivityWithRepeat(day, payload);
    onClose();
  };

  const remove = () => {
    if (editing) {
      removeActivity(day, editing.id);
      useToastStore.getState().show(`"${editing.name}" deleted`, {
        actionLabel: "Undo",
        onAction: () =>
          usePlanStore.getState().restoreActivity(day, editing),
      });
    }
    onClose();
  };

  /** finds the first slot of the same length that fits, preferring later slots */
  const moveToFreeSlot = () => {
    if (!timesValid) return;
    const duration = end! - start!;
    const s = findFreeSlot(plans[day] ?? [], duration, start!, editing?.id);
    if (s === null) return;
    setStartText(minutesToHHmm(s));
    setEndText(minutesToHHmm(s + duration));
  };

  const inputBase =
    "h-11 w-full rounded-lg bg-surface-2 px-3 text-sm text-foreground outline-none placeholder:text-muted/60 border transition-colors focus:border-accent/60";
  const errorBorder = "border-red-400/70";
  const okBorder = "border-transparent";

  return (
    <div
      className="flex flex-col gap-4"
      onKeyDown={(e) => {
        // Enter anywhere in the form saves (dropdowns handle their own keys)
        if (e.key === "Enter" && (e.target as HTMLElement).tagName === "INPUT")
          save();
      }}
    >
      {/* name + category */}
      <div>
        <div className="mb-1.5 flex items-center justify-between">
          <label className="text-xs text-muted">Name</label>
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-muted">Category</span>
            <DropdownMenu.Root>
              <DropdownMenu.Trigger asChild>
                <button className="flex items-center gap-1.5 rounded-full bg-surface-2 px-2.5 py-1 text-xs transition-colors hover:bg-white/10">
                  <ColorDot color={selectedCat?.color} size={5} />
                  {selectedCat?.name ?? "None"}
                </button>
              </DropdownMenu.Trigger>
              <DropdownMenu.Portal>
                <DropdownMenu.Content
                  align="end"
                  sideOffset={4}
                  className="z-[70] min-w-40 rounded-lg bg-surface-2 p-1 shadow-xl"
                >
                  <CategoryItem
                    label="None"
                    color={null}
                    selected={categoryId === null}
                    onSelect={() => setCategoryId(null)}
                  />
                  {categories.map((c) => (
                    <CategoryItem
                      key={c.id}
                      label={c.name}
                      color={c.color}
                      selected={categoryId === c.id}
                      onSelect={() => setCategoryId(c.id)}
                    />
                  ))}
                </DropdownMenu.Content>
              </DropdownMenu.Portal>
            </DropdownMenu.Root>
          </div>
        </div>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Activity Name"
          className={`${inputBase} ${
            touched && !nameValid ? errorBorder : okBorder
          }`}
        />
      </div>

      {/* time */}
      <div>
        <label className="mb-1.5 block text-xs text-muted">Time</label>
        <div className="flex items-center gap-3">
          <TimeInput
            value={startText}
            onChange={setStartText}
            placeholder="00:00"
            invalid={
              (touched && (start === null || !timesValid)) || conflicts
            }
            onSuggest={suggestStart}
            inputBase={inputBase}
            errorBorder={errorBorder}
            okBorder={okBorder}
          />
          <TimeInput
            value={endText}
            onChange={setEndText}
            placeholder="07:00"
            invalid={(touched && (end === null || !timesValid)) || conflicts}
            onSuggest={suggestEnd}
            inputBase={inputBase}
            errorBorder={errorBorder}
            okBorder={okBorder}
          />
        </div>
        {conflicts && (
          <p className="mt-1.5 flex items-center gap-2 text-[11px] text-red-400/90">
            This time overlaps another activity.
            <button
              onClick={moveToFreeSlot}
              className="rounded-full bg-surface-2 px-2.5 py-0.5 font-medium text-foreground transition-colors hover:bg-white/10"
            >
              Move to free slot
            </button>
          </p>
        )}
      </div>

      {/* repeat weekdays */}
      <div>
        <label className="mb-1.5 block text-xs text-muted">Repeat</label>
        <div className="flex items-center gap-1.5">
          {WEEKDAYS.map((d, i) => {
            const on = repeat.includes(i);
            return (
              <button
                key={i}
                onClick={() => toggleRepeatDay(i)}
                className={`h-8 w-8 rounded-full text-xs font-medium transition-colors ${
                  on
                    ? "bg-[var(--accent-strong)] text-white"
                    : "bg-surface-2 text-muted hover:text-foreground"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
        {repeat.length > 0 && !editing && (
          <p className="mt-1.5 text-[10px] text-muted/70">
            Copies onto the selected weekdays for the next 4 weeks.
          </p>
        )}
      </div>

      {/* footer */}
      <div className="-mx-6 -mb-5 mt-1 flex items-center justify-between rounded-b-2xl bg-surface-2/50 px-6 py-4">
        {editing ? (
          <button
            onClick={remove}
            className="flex items-center gap-1.5 rounded-lg border border-white/10 px-4 py-2 text-sm text-neutral-300 transition-colors hover:border-red-400/40 hover:text-red-400"
          >
            <Trash2 size={13} /> Delete
          </button>
        ) : (
          <span />
        )}
        <button
          onClick={save}
          className="rounded-lg bg-[var(--accent-strong)] px-5 py-2 text-sm font-medium text-white transition-colors hover:brightness-110"
        >
          Save
        </button>
      </div>
    </div>
  );
}

function TimeInput({
  value,
  onChange,
  placeholder,
  invalid,
  onSuggest,
  inputBase,
  errorBorder,
  okBorder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  invalid: boolean;
  onSuggest: () => void;
  inputBase: string;
  errorBorder: string;
  okBorder: string;
}) {
  return (
    <div className="relative flex-1">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // arrow keys nudge the time by 15 minutes
          if (e.key !== "ArrowUp" && e.key !== "ArrowDown") return;
          e.preventDefault();
          const mins = hhmmToMinutes(value) ?? 480;
          const next = Math.min(
            1439,
            Math.max(0, mins + (e.key === "ArrowUp" ? 15 : -15))
          );
          onChange(minutesToHHmm(next));
        }}
        placeholder={placeholder}
        className={`${inputBase} pr-9 ${invalid ? errorBorder : okBorder}`}
      />
      <button
        aria-label="Suggest time"
        onClick={onSuggest}
        className="absolute right-2 top-1/2 -translate-y-1/2 text-muted transition-colors hover:text-accent"
      >
        <Sparkles size={15} />
      </button>
    </div>
  );
}

function CategoryItem({
  label,
  color,
  selected,
  onSelect,
}: {
  label: string;
  color: string | null;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <DropdownMenu.Item
      onSelect={onSelect}
      className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-xs outline-none data-[highlighted]:bg-white/5"
    >
      <span className="w-3">
        {selected && <Check size={12} className="text-foreground" />}
      </span>
      <ColorDot color={color} size={5} />
      <span className="flex-1">{label}</span>
    </DropdownMenu.Item>
  );
}
