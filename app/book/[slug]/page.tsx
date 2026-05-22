import { notFound } from "next/navigation";
import { and, eq, gte, lte } from "drizzle-orm";
import { db, schema } from "@/db";
import { computeAvailableSlots } from "@/lib/slots";
import { getBusyBlocks } from "@/lib/google-calendar";
import { BookingFlow } from "./BookingFlow";

export const dynamic = "force-dynamic";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export default async function BookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  const [meetingType] = await db
    .select()
    .from(schema.meetingTypes)
    .where(
      and(
        eq(schema.meetingTypes.slug, slug),
        eq(schema.meetingTypes.isActive, true)
      )
    )
    .limit(1);

  if (!meetingType) notFound();

  const [owner] = await db
    .select({ name: schema.users.name, email: schema.users.email })
    .from(schema.users)
    .where(eq(schema.users.id, meetingType.ownerId))
    .limit(1);

  const rules = await db
    .select()
    .from(schema.availabilityRules)
    .where(eq(schema.availabilityRules.ownerId, meetingType.ownerId));

  const now = new Date();
  const horizon = new Date(
    now.getTime() + meetingType.advanceWindowDays * MS_PER_DAY
  );

  const existingBookings = await db
    .select({
      startTime: schema.bookings.startTime,
      endTime: schema.bookings.endTime,
    })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.ownerId, meetingType.ownerId),
        eq(schema.bookings.status, "confirmed"),
        gte(schema.bookings.endTime, now),
        lte(schema.bookings.startTime, horizon)
      )
    );

  let busyBlocks: Array<{ start: Date; end: Date }> = [];
  let calendarError: string | null = null;
  try {
    busyBlocks = await getBusyBlocks({
      userId: meetingType.ownerId,
      timeMin: now,
      timeMax: horizon,
    });
  } catch (err) {
    console.error("Booking page freeBusy failed:", err);
    calendarError =
      "The owner needs to reconnect Google Calendar before bookings can resume.";
  }

  const slots = calendarError
    ? []
    : computeAvailableSlots({
        meetingType,
        rules,
        busyBlocks,
        existingBookings: existingBookings.map((b) => ({
          start: b.startTime,
          end: b.endTime,
        })),
        now,
      });

  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <div className="flex items-center gap-2 text-sm font-medium text-blue">
        <span className="inline-block h-2 w-2 rounded-full bg-blue" />
        toms-cal
      </div>
      <div className="mt-6 rounded-[12px] border border-border bg-white p-6 sm:p-8">
        <p className="text-sm font-medium uppercase tracking-wider text-muted-foreground">
          Book with {owner?.name ?? owner?.email ?? "Tom"}
        </p>
        <h1 className="mt-2 font-serif text-3xl font-black tracking-tight text-navy">
          {meetingType.name}
        </h1>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          <span className="font-medium">{meetingType.durationMinutes} min</span>
          <span className="opacity-40">·</span>
          <span>Video call — link added after confirmation</span>
        </div>
        {meetingType.description && (
          <p className="mt-4 max-w-prose text-sm leading-relaxed text-foreground">
            {meetingType.description}
          </p>
        )}
      </div>

      {calendarError ? (
        <div className="mt-6 rounded-[12px] border border-danger/30 bg-white p-6">
          <p className="font-semibold text-danger">Calendar unavailable</p>
          <p className="mt-1 text-sm text-muted-foreground">{calendarError}</p>
        </div>
      ) : (
        <BookingFlow
          meetingType={{
            id: meetingType.id,
            slug: meetingType.slug,
            name: meetingType.name,
            durationMinutes: meetingType.durationMinutes,
            locationType: meetingType.locationType,
          }}
          slotsISO={slots.map((s) => ({
            start: s.start.toISOString(),
            end: s.end.toISOString(),
          }))}
        />
      )}
    </main>
  );
}

