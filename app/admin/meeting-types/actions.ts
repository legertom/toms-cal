"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireOwner } from "@/lib/auth-guard";

const slugRegex = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;

const meetingTypeSchema = z.object({
  slug: z
    .string()
    .min(2, "Slug must be at least 2 characters")
    .max(60, "Slug too long")
    .regex(slugRegex, "Use lowercase letters, digits, and hyphens only"),
  name: z.string().min(2, "Name must be at least 2 characters").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  durationMinutes: z.coerce.number().int().min(5).max(480),
  bufferBeforeMinutes: z.coerce.number().int().min(0).max(120),
  bufferAfterMinutes: z.coerce.number().int().min(0).max(120),
  advanceWindowDays: z.coerce.number().int().min(1).max(180),
  minNoticeMinutes: z.coerce.number().int().min(0).max(10080),
  locationType: z.enum(["google_meet", "zoom", "in_person", "phone"]),
  isActive: z
    .union([z.literal("on"), z.literal("true"), z.boolean()])
    .optional()
    .transform((v) => v === "on" || v === "true" || v === true),
});

export type MeetingTypeFormState =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]>; formError?: string };

function parseFormData(formData: FormData) {
  return meetingTypeSchema.safeParse({
    slug: formData.get("slug"),
    name: formData.get("name"),
    description: formData.get("description"),
    durationMinutes: formData.get("durationMinutes"),
    bufferBeforeMinutes: formData.get("bufferBeforeMinutes"),
    bufferAfterMinutes: formData.get("bufferAfterMinutes"),
    advanceWindowDays: formData.get("advanceWindowDays"),
    minNoticeMinutes: formData.get("minNoticeMinutes"),
    locationType: formData.get("locationType"),
    isActive: formData.get("isActive"),
  });
}

export async function createMeetingType(
  _prev: MeetingTypeFormState | undefined,
  formData: FormData
): Promise<MeetingTypeFormState> {
  const session = await requireOwner();
  const parsed = parseFormData(formData);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const data = parsed.data;

  const existing = await db
    .select({ id: schema.meetingTypes.id })
    .from(schema.meetingTypes)
    .where(
      and(
        eq(schema.meetingTypes.ownerId, session.user.id),
        eq(schema.meetingTypes.slug, data.slug)
      )
    )
    .limit(1);
  if (existing.length > 0) {
    return {
      ok: false,
      fieldErrors: { slug: ["You already have a meeting type with this slug"] },
    };
  }

  await db.insert(schema.meetingTypes).values({
    ownerId: session.user.id,
    slug: data.slug,
    name: data.name,
    description: data.description || null,
    durationMinutes: data.durationMinutes,
    bufferBeforeMinutes: data.bufferBeforeMinutes,
    bufferAfterMinutes: data.bufferAfterMinutes,
    advanceWindowDays: data.advanceWindowDays,
    minNoticeMinutes: data.minNoticeMinutes,
    locationType: data.locationType,
    isActive: data.isActive,
  });

  revalidatePath("/admin/meeting-types");
  revalidatePath("/admin");
  redirect("/admin/meeting-types");
}

export async function updateMeetingType(
  id: string,
  _prev: MeetingTypeFormState | undefined,
  formData: FormData
): Promise<MeetingTypeFormState> {
  const session = await requireOwner();
  const parsed = parseFormData(formData);

  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const data = parsed.data;

  const slugClash = await db
    .select({ id: schema.meetingTypes.id })
    .from(schema.meetingTypes)
    .where(
      and(
        eq(schema.meetingTypes.ownerId, session.user.id),
        eq(schema.meetingTypes.slug, data.slug)
      )
    )
    .limit(1);
  if (slugClash.length > 0 && slugClash[0].id !== id) {
    return {
      ok: false,
      fieldErrors: { slug: ["Another meeting type already uses this slug"] },
    };
  }

  await db
    .update(schema.meetingTypes)
    .set({
      slug: data.slug,
      name: data.name,
      description: data.description || null,
      durationMinutes: data.durationMinutes,
      bufferBeforeMinutes: data.bufferBeforeMinutes,
      bufferAfterMinutes: data.bufferAfterMinutes,
      advanceWindowDays: data.advanceWindowDays,
      minNoticeMinutes: data.minNoticeMinutes,
      locationType: data.locationType,
      isActive: data.isActive,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(schema.meetingTypes.id, id),
        eq(schema.meetingTypes.ownerId, session.user.id)
      )
    );

  revalidatePath("/admin/meeting-types");
  revalidatePath(`/admin/meeting-types/${id}`);
  redirect("/admin/meeting-types");
}

export async function toggleMeetingTypeActive(id: string) {
  const session = await requireOwner();
  const [existing] = await db
    .select({ isActive: schema.meetingTypes.isActive })
    .from(schema.meetingTypes)
    .where(
      and(
        eq(schema.meetingTypes.id, id),
        eq(schema.meetingTypes.ownerId, session.user.id)
      )
    )
    .limit(1);
  if (!existing) return;
  await db
    .update(schema.meetingTypes)
    .set({ isActive: !existing.isActive, updatedAt: new Date() })
    .where(
      and(
        eq(schema.meetingTypes.id, id),
        eq(schema.meetingTypes.ownerId, session.user.id)
      )
    );
  revalidatePath("/admin/meeting-types");
  revalidatePath("/admin");
}

export async function deleteMeetingType(id: string) {
  const session = await requireOwner();
  await db
    .delete(schema.meetingTypes)
    .where(
      and(
        eq(schema.meetingTypes.id, id),
        eq(schema.meetingTypes.ownerId, session.user.id)
      )
    );
  revalidatePath("/admin/meeting-types");
  revalidatePath("/admin");
  redirect("/admin/meeting-types");
}
