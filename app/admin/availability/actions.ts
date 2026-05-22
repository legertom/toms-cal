"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { requireOwner } from "@/lib/auth-guard";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const ruleSchema = z
  .object({
    dayOfWeek: z.coerce.number().int().min(0).max(6),
    startTime: z.string().regex(timeRegex, "Use HH:MM (24-hour)"),
    endTime: z.string().regex(timeRegex, "Use HH:MM (24-hour)"),
    timezone: z.string().min(1).max(64),
  })
  .refine((d) => d.startTime < d.endTime, {
    message: "Start time must be before end time",
    path: ["endTime"],
  });

export type AvailabilityFormState =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]>; formError?: string };

export async function createAvailabilityRule(
  _prev: AvailabilityFormState | undefined,
  formData: FormData
): Promise<AvailabilityFormState> {
  const session = await requireOwner();
  const parsed = ruleSchema.safeParse({
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  await db.insert(schema.availabilityRules).values({
    ownerId: session.user.id,
    dayOfWeek: parsed.data.dayOfWeek,
    startTime: parsed.data.startTime,
    endTime: parsed.data.endTime,
    timezone: parsed.data.timezone,
  });
  revalidatePath("/admin/availability");
  revalidatePath("/admin");
  return { ok: true };
}

export async function deleteAvailabilityRule(id: string) {
  const session = await requireOwner();
  await db
    .delete(schema.availabilityRules)
    .where(
      and(
        eq(schema.availabilityRules.id, id),
        eq(schema.availabilityRules.ownerId, session.user.id)
      )
    );
  revalidatePath("/admin/availability");
  revalidatePath("/admin");
}
