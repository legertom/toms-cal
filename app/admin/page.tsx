import Link from "next/link";
import { count, eq, gte, sql } from "drizzle-orm";
import { requireOwner } from "@/lib/auth-guard";
import { db, schema } from "@/db";

export default async function AdminOverview() {
  const session = await requireOwner();

  const [meetingTypeStats] = await db
    .select({
      total: count(),
      active: sql<number>`count(*) filter (where ${schema.meetingTypes.isActive} = true)`,
    })
    .from(schema.meetingTypes)
    .where(eq(schema.meetingTypes.ownerId, session.user.id));

  const [availabilityCount] = await db
    .select({ total: count() })
    .from(schema.availabilityRules)
    .where(eq(schema.availabilityRules.ownerId, session.user.id));

  const now = new Date();
  const [upcomingBookings] = await db
    .select({ total: count() })
    .from(schema.bookings)
    .where(
      sql`${schema.bookings.ownerId} = ${session.user.id} and ${schema.bookings.startTime} >= ${now.toISOString()} and ${schema.bookings.status} = 'confirmed'`
    );

  const setupComplete =
    Number(meetingTypeStats.active) > 0 && Number(availabilityCount.total) > 0;

  return (
    <div>
      <h1 className="font-serif text-3xl font-black tracking-tight text-navy">
        Overview
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Manage what people can book and when you&apos;re available.
      </p>

      {!setupComplete && (
        <div className="mt-6 rounded-[12px] border border-orange/40 bg-orange/5 p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-navy">
            <span className="inline-block h-2 w-2 rounded-full bg-orange" />
            Finish setup
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Your booking pages will be empty until you have at least one
            active meeting type and one weekly availability rule.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {Number(meetingTypeStats.active) === 0 && (
              <Link
                href="/admin/meeting-types/new"
                className="rounded-[8px] bg-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-hover"
              >
                Create your first meeting type
              </Link>
            )}
            {Number(availabilityCount.total) === 0 && (
              <Link
                href="/admin/availability"
                className="rounded-[8px] border border-navy bg-white px-4 py-2 text-sm font-medium text-navy hover:bg-sky"
              >
                Set your availability
              </Link>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Meeting types" value={`${meetingTypeStats.active} / ${meetingTypeStats.total}`} sub="active / total" href="/admin/meeting-types" />
        <Stat label="Weekly availability rules" value={String(availabilityCount.total)} sub="windows defined" href="/admin/availability" />
        <Stat label="Upcoming bookings" value={String(upcomingBookings.total)} sub="from now on" href="/admin/bookings" />
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
  href,
}: {
  label: string;
  value: string;
  sub: string;
  href?: string;
}) {
  const body = (
    <div className="rounded-[12px] border border-border bg-white p-5 transition hover:border-blue/40">
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 font-serif text-3xl font-black text-navy">
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
  return href ? <Link href={href}>{body}</Link> : body;
}
