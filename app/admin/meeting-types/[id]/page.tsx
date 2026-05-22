import Link from "next/link";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { requireOwner } from "@/lib/auth-guard";
import { db, schema } from "@/db";
import { MeetingTypeForm } from "../MeetingTypeForm";
import { updateMeetingType, deleteMeetingType } from "../actions";

export default async function EditMeetingTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireOwner();

  const [type] = await db
    .select()
    .from(schema.meetingTypes)
    .where(
      and(
        eq(schema.meetingTypes.id, id),
        eq(schema.meetingTypes.ownerId, session.user.id)
      )
    )
    .limit(1);

  if (!type) notFound();

  const update = updateMeetingType.bind(null, id);
  const del = deleteMeetingType.bind(null, id);

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/meeting-types"
        className="text-sm font-medium text-blue hover:text-blue-hover"
      >
        ← back
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-black tracking-tight text-navy">
        {type.name}
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Bookable at{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          /book/{type.slug}
        </code>
      </p>

      <div className="mt-8 rounded-[12px] border border-border bg-white p-6">
        <MeetingTypeForm
          action={update}
          submitLabel="Save changes"
          initial={{
            id: type.id,
            slug: type.slug,
            name: type.name,
            description: type.description,
            durationMinutes: type.durationMinutes,
            bufferBeforeMinutes: type.bufferBeforeMinutes,
            bufferAfterMinutes: type.bufferAfterMinutes,
            advanceWindowDays: type.advanceWindowDays,
            minNoticeMinutes: type.minNoticeMinutes,
            locationType: type.locationType,
            isActive: type.isActive,
          }}
        />
      </div>

      <div className="mt-6 rounded-[12px] border border-danger/30 bg-white p-6">
        <h2 className="text-sm font-semibold text-danger">Danger zone</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Deleting a meeting type is permanent. Past bookings (if any) will
          prevent deletion.
        </p>
        <form action={del} className="mt-4">
          <button
            type="submit"
            className="rounded-[8px] border border-danger bg-white px-4 py-2 text-sm font-medium text-danger hover:bg-danger/5"
          >
            Delete meeting type
          </button>
        </form>
      </div>
    </div>
  );
}
