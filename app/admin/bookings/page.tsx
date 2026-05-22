import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { requireOwner } from "@/lib/auth-guard";
import { db, schema } from "@/db";
import { CancelButton } from "./CancelButton";

export const dynamic = "force-dynamic";

export default async function BookingsAdminPage() {
  const session = await requireOwner();
  const now = new Date();

  const upcoming = await db
    .select({
      id: schema.bookings.id,
      attendeeName: schema.bookings.attendeeName,
      attendeeEmail: schema.bookings.attendeeEmail,
      startTime: schema.bookings.startTime,
      endTime: schema.bookings.endTime,
      notes: schema.bookings.notes,
      meetingUrl: schema.bookings.meetingUrl,
      googleEventId: schema.bookings.googleEventId,
      zoomMeetingId: schema.bookings.zoomMeetingId,
      status: schema.bookings.status,
      meetingTypeName: schema.meetingTypes.name,
      locationType: schema.meetingTypes.locationType,
    })
    .from(schema.bookings)
    .innerJoin(
      schema.meetingTypes,
      eq(schema.bookings.meetingTypeId, schema.meetingTypes.id)
    )
    .where(
      and(
        eq(schema.bookings.ownerId, session.user.id),
        gte(schema.bookings.endTime, now)
      )
    )
    .orderBy(asc(schema.bookings.startTime));

  const past = await db
    .select({
      id: schema.bookings.id,
      attendeeName: schema.bookings.attendeeName,
      attendeeEmail: schema.bookings.attendeeEmail,
      startTime: schema.bookings.startTime,
      endTime: schema.bookings.endTime,
      status: schema.bookings.status,
      meetingTypeName: schema.meetingTypes.name,
    })
    .from(schema.bookings)
    .innerJoin(
      schema.meetingTypes,
      eq(schema.bookings.meetingTypeId, schema.meetingTypes.id)
    )
    .where(
      and(
        eq(schema.bookings.ownerId, session.user.id),
        lt(schema.bookings.endTime, now)
      )
    )
    .orderBy(desc(schema.bookings.startTime))
    .limit(20);

  return (
    <div>
      <h1 className="font-serif text-3xl font-black tracking-tight text-navy">
        Bookings
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage what&apos;s on your calendar. Cancelling emails the attendee a
        Google notice automatically.
      </p>

      <h2 className="mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Upcoming
      </h2>
      <div className="mt-3">
        {upcoming.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-border bg-white p-8 text-center text-sm text-muted-foreground">
            No upcoming bookings.
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-white">
            {upcoming.map((b) => (
              <div
                key={b.id}
                className="flex flex-wrap items-start gap-4 px-5 py-4"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-navy">
                      {b.attendeeName}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {b.attendeeEmail}
                    </span>
                    <StatusPill status={b.status} />
                  </div>
                  <div className="mt-1 text-sm text-navy">
                    {formatDateTime(b.startTime)} – {formatTime(b.endTime)}
                  </div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {b.meetingTypeName} · {formatLocation(b.locationType)}
                  </div>
                  {b.notes && (
                    <div className="mt-2 rounded-[8px] bg-muted px-3 py-2 text-xs text-muted-foreground">
                      {b.notes}
                    </div>
                  )}
                  {b.meetingUrl && b.status === "confirmed" && (
                    <a
                      href={b.meetingUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-2 inline-block text-xs font-medium text-blue hover:text-blue-hover"
                    >
                      {b.locationType === "zoom"
                        ? "Open Zoom →"
                        : "Open Meet →"}
                    </a>
                  )}
                </div>
                {b.status === "confirmed" && (
                  <CancelButton
                    bookingId={b.id}
                    attendeeName={b.attendeeName}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <h2 className="mt-10 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Past (last 20)
      </h2>
      <div className="mt-3">
        {past.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-border bg-white p-6 text-center text-xs text-muted-foreground">
            No past bookings yet.
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-white">
            {past.map((b) => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3 text-sm">
                <div className="flex-1 truncate">
                  <span className="font-medium text-navy">
                    {b.attendeeName}
                  </span>
                  <span className="ml-2 text-xs text-muted-foreground">
                    {b.meetingTypeName}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground">
                  {formatDateTime(b.startTime)}
                </div>
                <StatusPill status={b.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const styles =
    status === "cancelled"
      ? "bg-danger/10 text-danger"
      : "bg-success/10 text-success";
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${styles}`}
    >
      {status}
    </span>
  );
}

function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
    timeZoneName: "short",
  }).format(d);
}

function formatTime(d: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(d);
}

function formatLocation(t: string) {
  if (t === "google_meet") return "Google Meet";
  if (t === "zoom") return "Zoom";
  if (t === "in_person") return "In person";
  if (t === "phone") return "Phone";
  return t;
}
