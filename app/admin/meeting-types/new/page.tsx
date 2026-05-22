import Link from "next/link";
import { requireOwner } from "@/lib/auth-guard";
import { MeetingTypeForm } from "../MeetingTypeForm";
import { createMeetingType } from "../actions";

export default async function NewMeetingTypePage() {
  await requireOwner();
  return (
    <div className="mx-auto max-w-2xl">
      <Link
        href="/admin/meeting-types"
        className="text-sm font-medium text-blue hover:text-blue-hover"
      >
        ← back
      </Link>
      <h1 className="mt-4 font-serif text-3xl font-black tracking-tight text-navy">
        New meeting type
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Coworkers will be able to book this at{" "}
        <code className="rounded bg-muted px-1.5 py-0.5 text-xs">
          /book/&lt;slug&gt;
        </code>
        .
      </p>

      <div className="mt-8 rounded-[12px] border border-border bg-white p-6">
        <MeetingTypeForm action={createMeetingType} submitLabel="Create" />
      </div>
    </div>
  );
}
