import { asc, eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth-guard";
import { db, schema } from "@/db";
import { AddRuleForm } from "./AddRuleForm";
import { deleteAvailabilityRule } from "./actions";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default async function AvailabilityPage() {
  const session = await requireOwner();
  const rules = await db
    .select()
    .from(schema.availabilityRules)
    .where(eq(schema.availabilityRules.ownerId, session.user.id))
    .orderBy(
      asc(schema.availabilityRules.dayOfWeek),
      asc(schema.availabilityRules.startTime)
    );

  const defaultTz =
    rules[0]?.timezone ?? "America/New_York";

  return (
    <div>
      <h1 className="font-serif text-3xl font-black tracking-tight text-navy">
        Availability
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Weekly recurring windows when coworkers can book you. Bookings still
        have to clear your Google Calendar — these are just the outer bounds.
      </p>

      <div className="mt-6">
        <AddRuleForm defaultTimezone={defaultTz} />
      </div>

      <div className="mt-6">
        {rules.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-border bg-white p-10 text-center">
            <p className="font-serif text-lg text-navy">
              No availability windows yet
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Add your first one above. A typical setup is Mon–Fri 9:00–17:00.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-white">
            {rules.map((r) => (
              <div
                key={r.id}
                className="flex items-center gap-4 px-5 py-3 text-sm"
              >
                <div className="w-24 font-semibold text-navy">
                  {DAY_NAMES[r.dayOfWeek]}
                </div>
                <div className="flex-1 font-medium tabular-nums">
                  {formatTime(r.startTime)} – {formatTime(r.endTime)}
                </div>
                <div className="text-xs text-muted-foreground">
                  {r.timezone}
                </div>
                <form
                  action={async () => {
                    "use server";
                    await deleteAvailabilityRule(r.id);
                  }}
                >
                  <button
                    type="submit"
                    className="rounded-[8px] border border-border bg-white px-3 py-1 text-xs font-medium hover:bg-danger/5 hover:text-danger"
                  >
                    Remove
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(t: string) {
  // t is "HH:MM:SS" from Postgres time; trim to HH:MM
  return t.slice(0, 5);
}
