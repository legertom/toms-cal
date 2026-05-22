"use client";

import { useActionState, useMemo, useState } from "react";
import { createBooking, type BookingFormState } from "./actions";

type SlotISO = { start: string; end: string };

export function BookingFlow({
  meetingType,
  slotsISO,
}: {
  meetingType: {
    id: string;
    slug: string;
    name: string;
    durationMinutes: number;
    locationType: string;
  };
  slotsISO: SlotISO[];
}) {
  const localTimezone = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  }, []);

  const slotsByDay = useMemo(() => {
    const map = new Map<string, SlotISO[]>();
    const dayFmt = new Intl.DateTimeFormat("en-CA", {
      timeZone: localTimezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
    for (const s of slotsISO) {
      const ymd = dayFmt.format(new Date(s.start));
      const arr = map.get(ymd) ?? [];
      arr.push(s);
      map.set(ymd, arr);
    }
    return map;
  }, [slotsISO, localTimezone]);

  const days = useMemo(
    () =>
      [...slotsByDay.keys()].sort().map((ymd) => ({
        ymd,
        count: slotsByDay.get(ymd)!.length,
      })),
    [slotsByDay]
  );

  const [selectedDay, setSelectedDay] = useState<string | null>(
    days[0]?.ymd ?? null
  );
  const [selectedSlot, setSelectedSlot] = useState<SlotISO | null>(null);

  if (slotsISO.length === 0) {
    return (
      <div className="mt-6 rounded-[12px] border border-dashed border-border bg-white p-10 text-center">
        <p className="font-serif text-lg text-navy">
          No open slots in the booking window
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Try again later or reach out to the owner directly.
        </p>
      </div>
    );
  }

  if (selectedSlot) {
    return (
      <BookingForm
        meetingType={meetingType}
        slot={selectedSlot}
        timezone={localTimezone}
        onBack={() => setSelectedSlot(null)}
      />
    );
  }

  const slotsForDay = selectedDay ? slotsByDay.get(selectedDay) ?? [] : [];

  return (
    <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-[260px_1fr]">
      <div className="rounded-[12px] border border-border bg-white p-2">
        <div className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Pick a day
        </div>
        <div className="max-h-[420px] overflow-y-auto">
          {days.map((d) => (
            <button
              key={d.ymd}
              type="button"
              onClick={() => setSelectedDay(d.ymd)}
              className={`flex w-full items-center justify-between rounded-[8px] px-3 py-2.5 text-left text-sm transition ${
                selectedDay === d.ymd
                  ? "bg-sky text-navy"
                  : "hover:bg-muted"
              }`}
            >
              <span className="font-medium">{formatDayLabel(d.ymd)}</span>
              <span className="text-xs text-muted-foreground">
                {d.count} {d.count === 1 ? "slot" : "slots"}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-[12px] border border-border bg-white p-5">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {selectedDay ? "Available times" : "Pick a day"}
            </div>
            {selectedDay && (
              <div className="font-serif text-lg font-bold text-navy">
                {formatDayHeader(selectedDay)}
              </div>
            )}
          </div>
          <div className="text-right text-xs text-muted-foreground">
            <div>Times in</div>
            <div className="font-medium text-navy">{localTimezone}</div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {slotsForDay.map((s) => (
            <button
              key={s.start}
              type="button"
              onClick={() => setSelectedSlot(s)}
              className="rounded-[8px] border border-border bg-white px-3 py-2.5 text-sm font-medium text-navy transition hover:border-blue hover:bg-sky/50"
            >
              {formatSlotTime(s.start, localTimezone)}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function BookingForm({
  meetingType,
  slot,
  timezone,
  onBack,
}: {
  meetingType: { id: string; durationMinutes: number; locationType: string };
  slot: SlotISO;
  timezone: string;
  onBack: () => void;
}) {
  const [state, formAction, pending] = useActionState<
    BookingFormState | undefined,
    FormData
  >(createBooking, undefined);
  const errors = state?.ok === false ? state.fieldErrors : {};
  const formError = state?.ok === false ? state.formError : undefined;

  return (
    <form
      action={formAction}
      className="mt-6 rounded-[12px] border border-border bg-white p-6 sm:p-8"
    >
      <button
        type="button"
        onClick={onBack}
        className="text-sm font-medium text-blue hover:text-blue-hover"
      >
        ← change time
      </button>

      <div className="mt-4 rounded-[8px] bg-sky/50 px-4 py-3">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          Booking
        </div>
        <div className="font-serif text-lg font-bold text-navy">
          {formatSlotFull(slot.start, timezone)}
        </div>
        <div className="text-xs text-muted-foreground">
          {meetingType.durationMinutes} min · {timezone}
        </div>
      </div>

      <input type="hidden" name="meetingTypeId" value={meetingType.id} />
      <input type="hidden" name="slotStart" value={slot.start} />

      <div className="mt-6 space-y-4">
        <div>
          <label
            htmlFor="attendeeName"
            className="text-sm font-medium text-navy"
          >
            Your name
          </label>
          <input
            id="attendeeName"
            name="attendeeName"
            type="text"
            required
            className="mt-1.5 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
          {errors.attendeeName?.[0] && (
            <p className="mt-1 text-xs text-danger">{errors.attendeeName[0]}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="attendeeEmail"
            className="text-sm font-medium text-navy"
          >
            Email
          </label>
          <input
            id="attendeeEmail"
            name="attendeeEmail"
            type="email"
            required
            placeholder="you@clever.com"
            className="mt-1.5 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
          {errors.attendeeEmail?.[0] && (
            <p className="mt-1 text-xs text-danger">{errors.attendeeEmail[0]}</p>
          )}
        </div>
        <div>
          <label htmlFor="notes" className="text-sm font-medium text-navy">
            What do you want to talk about?
          </label>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Optional — helps Tom prep.
          </p>
          <textarea
            id="notes"
            name="notes"
            rows={4}
            className="mt-1.5 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
          {errors.notes?.[0] && (
            <p className="mt-1 text-xs text-danger">{errors.notes[0]}</p>
          )}
        </div>
      </div>

      {formError && (
        <p className="mt-4 rounded-[8px] border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
          {formError}
        </p>
      )}

      <div className="mt-6 flex items-center justify-end gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={pending}
          className="rounded-[8px] bg-blue px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-hover disabled:opacity-60"
        >
          {pending ? "Booking…" : "Confirm booking"}
        </button>
      </div>
    </form>
  );
}

function formatDayLabel(ymd: string): string {
  // ymd is in the local tz already (we grouped by it)
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatDayHeader(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatSlotTime(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
}

function formatSlotFull(iso: string, timezone: string): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: timezone,
  }).format(new Date(iso));
}
