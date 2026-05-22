import { fromZonedTime } from "date-fns-tz";

export type MeetingTypeForSlots = {
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
  advanceWindowDays: number;
  minNoticeMinutes: number;
};

export type AvailabilityRuleForSlots = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  timezone: string;
};

export type BusyBlock = { start: Date; end: Date };

export type Slot = { start: Date; end: Date };

const MS_PER_MIN = 60 * 1000;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseHHMM(time: string): { hour: number; minute: number } {
  const [h, m] = time.split(":");
  return { hour: parseInt(h, 10), minute: parseInt(m, 10) };
}

function formatYMD(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * For a given date (interpreted in `timezone`) and wall-clock HH:MM,
 * return the UTC instant of that wall-clock time in that timezone.
 * Handles DST correctly via date-fns-tz.
 */
function zonedDateTimeToUtc(
  ymd: string,
  time: string,
  timezone: string
): Date {
  const { hour, minute } = parseHHMM(time);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return fromZonedTime(`${ymd}T${hh}:${mm}:00`, timezone);
}

function dayOfWeekInTz(d: Date, timezone: string): number {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
  });
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[formatter.format(d)] ?? 0;
}

function dateYmdInTz(d: Date, timezone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(d);
  const m: Record<string, string> = {};
  for (const p of parts) m[p.type] = p.value;
  return `${m.year}-${m.month}-${m.day}`;
}

function overlaps(
  aStart: Date,
  aEnd: Date,
  bStart: Date,
  bEnd: Date
): boolean {
  return aStart.getTime() < bEnd.getTime() && bStart.getTime() < aEnd.getTime();
}

export function computeAvailableSlots(args: {
  meetingType: MeetingTypeForSlots;
  rules: AvailabilityRuleForSlots[];
  busyBlocks: BusyBlock[];
  existingBookings: BusyBlock[];
  now: Date;
}): Slot[] {
  const { meetingType, rules, busyBlocks, existingBookings, now } = args;
  if (rules.length === 0) return [];

  const slotMs = meetingType.durationMinutes * MS_PER_MIN;
  const bufBeforeMs = meetingType.bufferBeforeMinutes * MS_PER_MIN;
  const bufAfterMs = meetingType.bufferAfterMinutes * MS_PER_MIN;
  const minNoticeMs = meetingType.minNoticeMinutes * MS_PER_MIN;
  const earliestStart = new Date(now.getTime() + minNoticeMs);

  const horizon = new Date(
    now.getTime() + meetingType.advanceWindowDays * MS_PER_DAY
  );

  const conflicts = [...busyBlocks, ...existingBookings];
  const slots: Slot[] = [];

  // Walk day-by-day in UTC; convert each day to the rule's timezone to check
  // day-of-week and compute the wall-clock window.
  const startDay = new Date(now);
  startDay.setUTCHours(0, 0, 0, 0);

  for (
    let dayCursor = startDay.getTime();
    dayCursor <= horizon.getTime();
    dayCursor += MS_PER_DAY
  ) {
    const dayDate = new Date(dayCursor);

    for (const rule of rules) {
      const ruleDow = dayOfWeekInTz(dayDate, rule.timezone);
      if (ruleDow !== rule.dayOfWeek) continue;

      const ymd = dateYmdInTz(dayDate, rule.timezone);
      const windowStart = zonedDateTimeToUtc(ymd, rule.startTime, rule.timezone);
      const windowEnd = zonedDateTimeToUtc(ymd, rule.endTime, rule.timezone);

      for (
        let slotStart = windowStart.getTime();
        slotStart + slotMs <= windowEnd.getTime();
        slotStart += slotMs
      ) {
        const start = new Date(slotStart);
        const end = new Date(slotStart + slotMs);

        if (start < earliestStart) continue;
        if (end > horizon) continue;

        const bufferedStart = new Date(start.getTime() - bufBeforeMs);
        const bufferedEnd = new Date(end.getTime() + bufAfterMs);

        const conflicted = conflicts.some((c) =>
          overlaps(bufferedStart, bufferedEnd, c.start, c.end)
        );
        if (conflicted) continue;

        slots.push({ start, end });
      }
    }
  }

  // Sort and dedupe (rules in different timezones could overlap)
  slots.sort((a, b) => a.start.getTime() - b.start.getTime());
  const deduped: Slot[] = [];
  for (const s of slots) {
    const last = deduped[deduped.length - 1];
    if (!last || last.start.getTime() !== s.start.getTime()) {
      deduped.push(s);
    }
  }
  return deduped;
}

/** Group slots by their UTC date in the given timezone. */
export function groupSlotsByDay(
  slots: Slot[],
  timezone: string
): Map<string, Slot[]> {
  const map = new Map<string, Slot[]>();
  for (const s of slots) {
    const ymd = dateYmdInTz(s.start, timezone);
    const arr = map.get(ymd) ?? [];
    arr.push(s);
    map.set(ymd, arr);
  }
  return map;
}

export function formatYmd(d: Date): string {
  return formatYMD(d);
}
