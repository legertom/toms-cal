"use server";

import { revalidatePath } from "next/cache";
import { and, eq } from "drizzle-orm";
import { db, schema } from "@/db";
import { requireOwner } from "@/lib/auth-guard";
import { deleteCalendarEvent } from "@/lib/google-calendar";
import { deleteZoomMeeting } from "@/lib/zoom";

export type CancelResult =
  | { ok: true; googleDeleted: boolean; zoomDeleted: boolean }
  | { ok: false; error: string };

/**
 * Cancel a confirmed booking:
 *   - Delete the Google Calendar event with sendUpdates=all → Google emails
 *     the attendee a cancellation notice automatically.
 *   - Delete the Zoom meeting if one was created (so it's gone from the
 *     dashboard and doesn't tie up a meeting slot).
 *   - Mark the booking 'cancelled' in our DB regardless of external delete
 *     outcomes — so the slot reopens and the row reflects reality.
 */
export async function cancelBooking(bookingId: string): Promise<CancelResult> {
  const session = await requireOwner();

  const [booking] = await db
    .select()
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.id, bookingId),
        eq(schema.bookings.ownerId, session.user.id)
      )
    )
    .limit(1);

  if (!booking) return { ok: false, error: "Booking not found" };
  if (booking.status === "cancelled") {
    return { ok: true, googleDeleted: false, zoomDeleted: false };
  }

  let googleDeleted = false;
  if (booking.googleEventId) {
    googleDeleted = await deleteCalendarEvent({
      userId: session.user.id,
      eventId: booking.googleEventId,
    });
  }

  let zoomDeleted = false;
  if (booking.zoomMeetingId) {
    zoomDeleted = await deleteZoomMeeting(booking.zoomMeetingId);
  }

  await db
    .update(schema.bookings)
    .set({ status: "cancelled", cancelledAt: new Date() })
    .where(eq(schema.bookings.id, bookingId));

  revalidatePath("/admin/bookings");
  revalidatePath("/admin");
  return { ok: true, googleDeleted, zoomDeleted };
}
