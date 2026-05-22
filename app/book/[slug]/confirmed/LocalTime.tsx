"use client";

import { useEffect, useState } from "react";

const ET = "America/New_York";
const PT = "America/Los_Angeles";

function format(iso: string, tz: string, opts: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat("en-US", { ...opts, timeZone: tz }).format(
    new Date(iso)
  );
}

function shortAbbrev(iso: string, tz: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: tz,
    timeZoneName: "short",
  }).formatToParts(new Date(iso));
  return parts.find((p) => p.type === "timeZoneName")?.value ?? "";
}

/**
 * Primary line: the booker's local time, full (weekday, date, time, zone).
 * Secondary line: ET + PT short times for quick conversion by US coworkers.
 * Server render falls back to ET so SSR matches a sensible default.
 */
export function LocalTime({ iso }: { iso: string }) {
  const [localTz, setLocalTz] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLocalTz(Intl.DateTimeFormat().resolvedOptions().timeZone || ET);
    } catch {
      setLocalTz(ET);
    }
  }, []);

  const tz = localTz ?? ET;

  const primary = format(iso, tz, {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });

  return (
    <div suppressHydrationWarning>
      <div className="font-serif text-lg font-bold text-navy">{primary}</div>
      <SecondaryTimes iso={iso} hideTz={tz} />
    </div>
  );
}

/**
 * Smaller line: shows ET + PT side-by-side, skipping whichever matches the
 * booker's local tz (so they don't see "3 PM EDT · 3 PM EDT · ...").
 */
function SecondaryTimes({ iso, hideTz }: { iso: string; hideTz: string }) {
  const showET = hideTz !== ET;
  const showPT = hideTz !== PT;
  if (!showET && !showPT) return null;

  const fmt: Intl.DateTimeFormatOptions = {
    hour: "numeric",
    minute: "2-digit",
  };
  const parts: string[] = [];
  if (showET) parts.push(`${format(iso, ET, fmt)} ${shortAbbrev(iso, ET)}`);
  if (showPT) parts.push(`${format(iso, PT, fmt)} ${shortAbbrev(iso, PT)}`);

  return (
    <div className="mt-1 text-xs text-muted-foreground">
      Also {parts.join(" · ")}
    </div>
  );
}

/**
 * Compact end-time variant, used as "until 3:30 PM EDT".
 */
export function LocalTimeShort({ iso }: { iso: string }) {
  const [localTz, setLocalTz] = useState<string | null>(null);

  useEffect(() => {
    try {
      setLocalTz(Intl.DateTimeFormat().resolvedOptions().timeZone || ET);
    } catch {
      setLocalTz(ET);
    }
  }, []);

  const tz = localTz ?? ET;
  const text = format(iso, tz, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  });
  return <span suppressHydrationWarning>{text}</span>;
}
