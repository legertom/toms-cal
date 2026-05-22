"use server";

import { redirect } from "next/navigation";
import { and, eq, gte, lte, or, asc } from "drizzle-orm";
import { z } from "zod";
import { db, schema } from "@/db";
import { createCalendarEvent, getBusyBlocks } from "@/lib/google-calendar";
import { createZoomMeeting, zoomEnabled } from "@/lib/zoom";
import { computeAvailableSlots } from "@/lib/slots";

const bookingSchema = z.object({
  meetingTypeId: z.string().uuid(),
  slotStart: z.string().datetime(),
  attendeeName: z.string().min(1, "Required").max(120),
  attendeeEmail: z.string().email("Enter a valid email").max(200),
  notes: z.string().max(2000).optional().or(z.literal("")),
});

export type BookingFormState =
  | { ok: true }
  | { ok: false; fieldErrors: Record<string, string[]>; formError?: string };

export async function createBooking(
  _prev: BookingFormState | undefined,
  formData: FormData
): Promise<BookingFormState> {
  const parsed = bookingSchema.safeParse({
    meetingTypeId: formData.get("meetingTypeId"),
    slotStart: formData.get("slotStart"),
    attendeeName: formData.get("attendeeName"),
    attendeeEmail: formData.get("attendeeEmail"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) {
    return {
      ok: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }
  const { meetingTypeId, slotStart, attendeeName, attendeeEmail, notes } =
    parsed.data;

  const [meetingType] = await db
    .select()
    .from(schema.meetingTypes)
    .where(eq(schema.meetingTypes.id, meetingTypeId))
    .limit(1);
  if (!meetingType || !meetingType.isActive) {
    return { ok: false, fieldErrors: {}, formError: "Meeting type not found" };
  }

  const slotStartDate = new Date(slotStart);
  const slotEndDate = new Date(
    slotStartDate.getTime() + meetingType.durationMinutes * 60_000
  );

  // Re-validate that the slot is still available — racing bookings, calendar
  // changes between page load and submit can invalidate the selection.
  const horizonStart = new Date();
  const horizonEnd = new Date(
    horizonStart.getTime() +
      meetingType.advanceWindowDays * 24 * 60 * 60 * 1000
  );

  const rules = await db
    .select()
    .from(schema.availabilityRules)
    .where(eq(schema.availabilityRules.ownerId, meetingType.ownerId));

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
        gte(schema.bookings.endTime, horizonStart),
        lte(schema.bookings.startTime, horizonEnd)
      )
    );

  let busyBlocks: Array<{ start: Date; end: Date }>;
  try {
    busyBlocks = await getBusyBlocks({
      userId: meetingType.ownerId,
      timeMin: horizonStart,
      timeMax: horizonEnd,
    });
  } catch (err) {
    console.error("freeBusy failed:", err);
    return {
      ok: false,
      fieldErrors: {},
      formError:
        "Couldn't read the owner's calendar right now. Please try again in a moment.",
    };
  }

  const validSlots = computeAvailableSlots({
    meetingType,
    rules,
    busyBlocks,
    existingBookings: existingBookings.map((b) => ({
      start: b.startTime,
      end: b.endTime,
    })),
    now: horizonStart,
  });
  const stillValid = validSlots.some(
    (s) => s.start.getTime() === slotStartDate.getTime()
  );
  if (!stillValid) {
    return {
      ok: false,
      fieldErrors: {},
      formError:
        "That slot was just taken or is no longer available — please pick a different time.",
    };
  }

  // 1) If Zoom is the requested location, create the Zoom meeting first so
  //    the join URL can be included in the Google Calendar event description.
  let zoomMeetingId: string | null = null;
  let zoomJoinUrl: string | null = null;
  if (meetingType.locationType === "zoom") {
    if (!zoomEnabled()) {
      return {
        ok: false,
        fieldErrors: {},
        formError:
          "Zoom isn't configured for this app yet. Pick another time or contact the owner.",
      };
    }
    try {
      const zm = await createZoomMeeting({
        topic: meetingType.name,
        agenda: notes || undefined,
        start: slotStartDate,
        durationMinutes: meetingType.durationMinutes,
        attendeeEmail,
      });
      zoomMeetingId = zm.id;
      zoomJoinUrl = zm.joinUrl;
    } catch (err) {
      console.error("Zoom create failed:", err);
      return {
        ok: false,
        fieldErrors: {},
        formError:
          "Couldn't create the Zoom meeting. Try again, or contact the owner directly.",
      };
    }
  }

  // 2) Create the Google Calendar event with the attendee. Google sends the
  //    invite email automatically via sendUpdates=all.
  let event;
  try {
    event = await createCalendarEvent({
      userId: meetingType.ownerId,
      summary: meetingType.name,
      description: buildDescription({
        meetingTypeName: meetingType.name,
        attendeeName,
        attendeeEmail,
        notes: notes || undefined,
        zoomJoinUrl,
      }),
      location: zoomJoinUrl ?? undefined,
      start: slotStartDate,
      end: slotEndDate,
      attendeeEmail,
      attendeeName,
      withGoogleMeet: meetingType.locationType === "google_meet",
    });
  } catch (err) {
    console.error("events.insert failed:", err);
    return {
      ok: false,
      fieldErrors: {},
      formError:
        "Couldn't create the calendar event. Try again, or contact the owner directly.",
    };
  }

  const meetingUrl = zoomJoinUrl ?? event.hangoutLink ?? null;

  const [inserted] = await db
    .insert(schema.bookings)
    .values({
      meetingTypeId: meetingType.id,
      ownerId: meetingType.ownerId,
      attendeeName,
      attendeeEmail,
      startTime: slotStartDate,
      endTime: slotEndDate,
      notes: notes || null,
      googleEventId: event.id,
      googleMeetLink: event.hangoutLink ?? null,
      meetingUrl,
      zoomMeetingId,
      status: "confirmed",
    })
    .returning({ id: schema.bookings.id });

  redirect(`/book/${meetingType.slug}/confirmed?id=${inserted.id}`);
}

function buildDescription(args: {
  meetingTypeName: string;
  attendeeName: string;
  attendeeEmail: string;
  notes?: string;
  zoomJoinUrl?: string | null;
}): string {
  const lines = [
    `${args.meetingTypeName} with ${args.attendeeName} (${args.attendeeEmail})`,
  ];
  if (args.zoomJoinUrl) {
    lines.push("", `Join Zoom: ${args.zoomJoinUrl}`);
  }
  if (args.notes) {
    lines.push("", "Notes from attendee:", args.notes);
  }
  lines.push("", "Booked via toms-cal");
  return lines.join("\n");
}

export async function getUpcomingBookingsForOwner(ownerId: string) {
  const now = new Date();
  const inAYear = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  return db
    .select({
      startTime: schema.bookings.startTime,
      endTime: schema.bookings.endTime,
    })
    .from(schema.bookings)
    .where(
      and(
        eq(schema.bookings.ownerId, ownerId),
        eq(schema.bookings.status, "confirmed"),
        gte(schema.bookings.endTime, now),
        lte(schema.bookings.startTime, inAYear)
      )
    )
    .orderBy(asc(schema.bookings.startTime));
}
