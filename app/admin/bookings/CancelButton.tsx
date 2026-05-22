"use client";

import { useState, useTransition } from "react";
import { cancelBooking } from "./actions";

export function CancelButton({
  bookingId,
  attendeeName,
}: {
  bookingId: string;
  attendeeName: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="rounded-[8px] border border-border bg-white px-3 py-1 text-xs font-medium hover:bg-danger/5 hover:text-danger"
      >
        Cancel
      </button>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Cancel & notify {attendeeName}?
        </span>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            setError(null);
            startTransition(async () => {
              const res = await cancelBooking(bookingId);
              if (!res.ok) setError(res.error);
              else setConfirming(false);
            });
          }}
          className="rounded-[8px] bg-danger px-3 py-1 text-xs font-medium text-white hover:opacity-90 disabled:opacity-60"
        >
          {pending ? "Cancelling…" : "Yes, cancel"}
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          disabled={pending}
          className="rounded-[8px] border border-border bg-white px-3 py-1 text-xs font-medium hover:bg-muted"
        >
          Keep
        </button>
      </div>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
