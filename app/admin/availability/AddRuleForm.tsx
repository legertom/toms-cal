"use client";

import { useActionState, useRef, useEffect } from "react";
import { createAvailabilityRule, type AvailabilityFormState } from "./actions";

const DAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

const COMMON_TZS = [
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
  "UTC",
];

export function AddRuleForm({ defaultTimezone }: { defaultTimezone: string }) {
  const [state, formAction, pending] = useActionState<
    AvailabilityFormState | undefined,
    FormData
  >(createAvailabilityRule, undefined);
  const formRef = useRef<HTMLFormElement>(null);
  const errors = state?.ok === false ? state.fieldErrors : {};

  useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form
      ref={formRef}
      action={formAction}
      className="rounded-[12px] border border-border bg-white p-5"
    >
      <h2 className="text-sm font-semibold text-navy">Add a window</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Pick a day and the hours you&apos;re bookable. Repeat for each day.
      </p>

      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_1fr_1.4fr_auto]">
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Day
          </label>
          <select
            name="dayOfWeek"
            defaultValue={1}
            className="mt-1 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          >
            {DAYS.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Start
          </label>
          <input
            type="time"
            name="startTime"
            defaultValue="09:00"
            required
            className="mt-1 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
          {errors.startTime?.[0] && (
            <p className="mt-1 text-xs text-danger">{errors.startTime[0]}</p>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            End
          </label>
          <input
            type="time"
            name="endTime"
            defaultValue="17:00"
            required
            className="mt-1 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
          {errors.endTime?.[0] && (
            <p className="mt-1 text-xs text-danger">{errors.endTime[0]}</p>
          )}
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Timezone
          </label>
          <select
            name="timezone"
            defaultValue={defaultTimezone}
            className="mt-1 w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          >
            {COMMON_TZS.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </div>
        <div className="self-end">
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-[8px] bg-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-hover disabled:opacity-60 sm:w-auto"
          >
            {pending ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </form>
  );
}
