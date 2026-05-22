import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";

export const dynamic = "force-dynamic";

const HYDRATE_SCRIPT = `
  (function(){
    document.querySelectorAll('time[data-iso]').forEach(function(el){
      var d = new Date(el.getAttribute('data-iso'));
      var timeOnly = el.getAttribute('data-time-only') === '1';
      el.textContent = new Intl.DateTimeFormat(undefined, {
        weekday: timeOnly ? undefined : 'long',
        month: timeOnly ? undefined : 'long',
        day: timeOnly ? undefined : 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        timeZoneName: 'short',
      }).format(d);
    });
  })();
`;

export default async function ConfirmedPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ id?: string }>;
}) {
  const { slug } = await params;
  const { id } = await searchParams;
  if (!id) notFound();

  const [booking] = await db
    .select({
      id: schema.bookings.id,
      attendeeName: schema.bookings.attendeeName,
      attendeeEmail: schema.bookings.attendeeEmail,
      startTime: schema.bookings.startTime,
      endTime: schema.bookings.endTime,
      meetLink: schema.bookings.googleMeetLink,
      meetingTypeName: schema.meetingTypes.name,
      meetingTypeSlug: schema.meetingTypes.slug,
      locationType: schema.meetingTypes.locationType,
    })
    .from(schema.bookings)
    .innerJoin(
      schema.meetingTypes,
      eq(schema.bookings.meetingTypeId, schema.meetingTypes.id)
    )
    .where(eq(schema.bookings.id, id))
    .limit(1);

  if (!booking || booking.meetingTypeSlug !== slug) notFound();

  const startISO = booking.startTime.toISOString();
  const endISO = booking.endTime.toISOString();

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <div className="rounded-[12px] border border-border bg-white p-8 text-center sm:p-10">
        <div className="mx-auto inline-flex h-12 w-12 items-center justify-center rounded-full bg-success text-2xl font-bold text-white">
          ✓
        </div>
        <h1 className="mt-5 font-serif text-3xl font-black tracking-tight text-navy">
          You&apos;re booked.
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          A calendar invite has been sent to{" "}
          <strong className="text-navy">{booking.attendeeEmail}</strong>.
        </p>

        <div className="mt-8 rounded-[8px] bg-sky/50 px-5 py-4 text-left">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {booking.meetingTypeName}
          </div>
          <div className="mt-1 font-serif text-lg font-bold text-navy">
            <ClientTime iso={startISO} />
          </div>
          <div className="text-xs text-muted-foreground">
            until <ClientTime iso={endISO} timeOnly />
          </div>
          {booking.meetLink && (
            <a
              href={booking.meetLink}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-sm font-medium text-blue hover:text-blue-hover"
            >
              Google Meet link →
            </a>
          )}
        </div>

        <Link
          href={`/book/${slug}`}
          className="mt-8 inline-block text-sm font-medium text-blue hover:text-blue-hover"
        >
          ← back to booking page
        </Link>
      </div>
      <script dangerouslySetInnerHTML={{ __html: HYDRATE_SCRIPT }} />
    </main>
  );
}

function ClientTime({ iso, timeOnly }: { iso: string; timeOnly?: boolean }) {
  const fallback = new Intl.DateTimeFormat("en-US", {
    weekday: timeOnly ? undefined : "long",
    month: timeOnly ? undefined : "long",
    day: timeOnly ? undefined : "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
    timeZoneName: "short",
  }).format(new Date(iso));
  return (
    <time
      data-iso={iso}
      data-time-only={timeOnly ? "1" : "0"}
      suppressHydrationWarning
    >
      {fallback}
    </time>
  );
}
