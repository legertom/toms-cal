"use client";

import { useActionState } from "react";
import Link from "next/link";
import type { MeetingTypeFormState } from "./actions";

type MeetingTypeValues = {
  id?: string;
  slug?: string;
  name?: string;
  description?: string | null;
  durationMinutes?: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  advanceWindowDays?: number;
  minNoticeMinutes?: number;
  locationType?: string;
  isActive?: boolean;
};

export function MeetingTypeForm({
  action,
  initial,
  submitLabel,
  allowZoom = false,
}: {
  action: (
    prev: MeetingTypeFormState | undefined,
    formData: FormData
  ) => Promise<MeetingTypeFormState>;
  initial?: MeetingTypeValues;
  submitLabel: string;
  allowZoom?: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, undefined);
  const errors = state?.ok === false ? state.fieldErrors : {};

  return (
    <form action={formAction} className="space-y-6">
      <Field label="Name" htmlFor="name" error={errors.name?.[0]}>
        <input
          id="name"
          name="name"
          type="text"
          defaultValue={initial?.name ?? ""}
          placeholder="AI Enablement Session"
          required
          className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
        />
      </Field>

      <Field
        label="Slug"
        htmlFor="slug"
        hint="The path that coworkers will book at: /book/<slug>"
        error={errors.slug?.[0]}
      >
        <input
          id="slug"
          name="slug"
          type="text"
          defaultValue={initial?.slug ?? ""}
          placeholder="ai-enablement"
          required
          className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
        />
      </Field>

      <Field
        label="Description"
        htmlFor="description"
        hint="Shown on the booking page"
        error={errors.description?.[0]}
      >
        <textarea
          id="description"
          name="description"
          rows={3}
          defaultValue={initial?.description ?? ""}
          placeholder="Hands-on help integrating Claude / OpenAI into your workflow."
          className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
        />
      </Field>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Duration (minutes)"
          htmlFor="durationMinutes"
          error={errors.durationMinutes?.[0]}
        >
          <input
            id="durationMinutes"
            name="durationMinutes"
            type="number"
            min={5}
            max={480}
            defaultValue={initial?.durationMinutes ?? 30}
            required
            className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
        </Field>
        <Field
          label="Location"
          htmlFor="locationType"
          error={errors.locationType?.[0]}
        >
          <select
            id="locationType"
            name="locationType"
            defaultValue={initial?.locationType ?? "google_meet"}
            className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          >
            <option value="google_meet">Google Meet</option>
            {allowZoom && <option value="zoom">Zoom</option>}
            <option value="in_person">In person</option>
            <option value="phone">Phone</option>
          </select>
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Buffer before (min)"
          htmlFor="bufferBeforeMinutes"
          error={errors.bufferBeforeMinutes?.[0]}
        >
          <input
            id="bufferBeforeMinutes"
            name="bufferBeforeMinutes"
            type="number"
            min={0}
            max={120}
            defaultValue={initial?.bufferBeforeMinutes ?? 0}
            required
            className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
        </Field>
        <Field
          label="Buffer after (min)"
          htmlFor="bufferAfterMinutes"
          error={errors.bufferAfterMinutes?.[0]}
        >
          <input
            id="bufferAfterMinutes"
            name="bufferAfterMinutes"
            type="number"
            min={0}
            max={120}
            defaultValue={initial?.bufferAfterMinutes ?? 0}
            required
            className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Field
          label="Advance window (days)"
          htmlFor="advanceWindowDays"
          hint="How far in advance coworkers can book"
          error={errors.advanceWindowDays?.[0]}
        >
          <input
            id="advanceWindowDays"
            name="advanceWindowDays"
            type="number"
            min={1}
            max={180}
            defaultValue={initial?.advanceWindowDays ?? 14}
            required
            className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
        </Field>
        <Field
          label="Minimum notice (min)"
          htmlFor="minNoticeMinutes"
          hint="No bookings can start sooner than this"
          error={errors.minNoticeMinutes?.[0]}
        >
          <input
            id="minNoticeMinutes"
            name="minNoticeMinutes"
            type="number"
            min={0}
            max={10080}
            defaultValue={initial?.minNoticeMinutes ?? 60}
            required
            className="w-full rounded-[8px] border border-border bg-white px-3 py-2 text-sm focus:border-blue focus:outline-none"
          />
        </Field>
      </div>

      <label className="flex cursor-pointer items-center gap-3 text-sm">
        <input
          type="checkbox"
          name="isActive"
          defaultChecked={initial?.isActive ?? true}
          className="h-4 w-4 rounded border-border accent-blue"
        />
        <span>
          <strong className="text-navy">Active.</strong>{" "}
          <span className="text-muted-foreground">
            When off, this meeting type is hidden from the booking page.
          </span>
        </span>
      </label>

      <div className="flex items-center justify-end gap-3 border-t border-border pt-6">
        <Link
          href="/admin/meeting-types"
          className="rounded-[8px] border border-border bg-white px-4 py-2 text-sm font-medium hover:bg-muted"
        >
          Cancel
        </Link>
        <button
          type="submit"
          disabled={pending}
          className="rounded-[8px] bg-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-hover disabled:opacity-60"
        >
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-sm font-medium text-navy">
        {label}
      </label>
      {hint && (
        <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>
      )}
      <div className="mt-1.5">{children}</div>
      {error && <p className="mt-1 text-xs text-danger">{error}</p>}
    </div>
  );
}
