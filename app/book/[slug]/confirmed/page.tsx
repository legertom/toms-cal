import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { LocalTime, LocalTimeShort } from "./LocalTime";

export const dynamic = "force-dynamic";

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
      meetingTypeName: schema.meetingTypes.name,
      meetingTypeSlug: schema.meetingTypes.slug,
    })
    .from(schema.bookings)
    .innerJoin(
      schema.meetingTypes,
      eq(schema.bookings.meetingTypeId, schema.meetingTypes.id)
    )
    .where(eq(schema.bookings.id, id))
    .limit(1);

  if (!booking || booking.meetingTypeSlug !== slug) notFound();

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
          <div className="mt-1">
            <LocalTime iso={booking.startTime.toISOString()} />
          </div>
          <div className="mt-2 text-xs text-muted-foreground">
            until <LocalTimeShort iso={booking.endTime.toISOString()} />
          </div>
          <div className="mt-3 rounded-[8px] bg-white px-3 py-2 text-xs text-muted-foreground">
            <strong className="text-navy">Zoom link coming.</strong> Tom will
            add the video link to your calendar invite shortly — you&apos;ll
            get an updated invite from Google when that happens.
          </div>
        </div>

        <Link
          href={`/book/${slug}`}
          className="mt-8 inline-block text-sm font-medium text-blue hover:text-blue-hover"
        >
          ← back to booking page
        </Link>
      </div>
    </main>
  );
}
