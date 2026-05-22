import Link from "next/link";
import { eq, desc } from "drizzle-orm";
import { requireOwner } from "@/lib/auth-guard";
import { db, schema } from "@/db";
import { toggleMeetingTypeActive } from "./actions";

export default async function MeetingTypesPage() {
  const session = await requireOwner();
  const types = await db
    .select()
    .from(schema.meetingTypes)
    .where(eq(schema.meetingTypes.ownerId, session.user.id))
    .orderBy(desc(schema.meetingTypes.createdAt));

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-serif text-3xl font-black tracking-tight text-navy">
            Meeting types
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Each one is bookable at <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/book/&lt;slug&gt;</code>.
          </p>
        </div>
        <Link
          href="/admin/meeting-types/new"
          className="rounded-[8px] bg-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-hover"
        >
          + New meeting type
        </Link>
      </div>

      {types.length === 0 ? (
        <div className="mt-8 rounded-[12px] border border-dashed border-border bg-white p-10 text-center">
          <p className="font-serif text-lg text-navy">No meeting types yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one to let coworkers book time with you.
          </p>
          <Link
            href="/admin/meeting-types/new"
            className="mt-4 inline-block rounded-[8px] bg-blue px-4 py-2 text-sm font-medium text-white hover:bg-blue-hover"
          >
            Create your first
          </Link>
        </div>
      ) : (
        <div className="mt-6 divide-y divide-border overflow-hidden rounded-[12px] border border-border bg-white">
          {types.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <Link
                    href={`/admin/meeting-types/${t.id}`}
                    className="font-semibold text-navy hover:underline"
                  >
                    {t.name}
                  </Link>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                      t.isActive
                        ? "bg-success/10 text-success"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {t.isActive ? "Active" : "Off"}
                  </span>
                </div>
                <div className="mt-0.5 flex flex-wrap gap-x-4 text-xs text-muted-foreground">
                  <span>
                    <code className="rounded bg-muted px-1 py-0.5">/book/{t.slug}</code>
                  </span>
                  <span>{t.durationMinutes} min</span>
                  <span>{formatLocation(t.locationType)}</span>
                  {(t.bufferBeforeMinutes > 0 || t.bufferAfterMinutes > 0) && (
                    <span>
                      Buffer {t.bufferBeforeMinutes}/{t.bufferAfterMinutes} min
                    </span>
                  )}
                </div>
              </div>
              <form
                action={async () => {
                  "use server";
                  await toggleMeetingTypeActive(t.id);
                }}
              >
                <button
                  type="submit"
                  className="rounded-[8px] border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  {t.isActive ? "Disable" : "Enable"}
                </button>
              </form>
              <Link
                href={`/admin/meeting-types/${t.id}`}
                className="rounded-[8px] border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Edit
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function formatLocation(t: string) {
  if (t === "google_meet") return "Google Meet";
  if (t === "in_person") return "In person";
  if (t === "phone") return "Phone";
  return t;
}
