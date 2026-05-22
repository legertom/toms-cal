import { getGoogleAccessToken } from "@/auth";

export type GoogleEvent = {
  id: string;
  hangoutLink?: string;
  htmlLink?: string;
};

export async function getBusyBlocks(args: {
  userId: string;
  timeMin: Date;
  timeMax: Date;
}): Promise<Array<{ start: Date; end: Date }>> {
  const accessToken = await getGoogleAccessToken(args.userId);
  const res = await fetch(
    "https://www.googleapis.com/calendar/v3/freeBusy",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: args.timeMin.toISOString(),
        timeMax: args.timeMax.toISOString(),
        items: [{ id: "primary" }],
      }),
      cache: "no-store",
    }
  );
  if (!res.ok) {
    throw new Error(
      `Google Calendar freeBusy failed: ${res.status} ${await res.text()}`
    );
  }
  const data = (await res.json()) as {
    calendars: Record<string, { busy: Array<{ start: string; end: string }> }>;
  };
  const busy = data.calendars?.primary?.busy ?? [];
  return busy.map((b) => ({ start: new Date(b.start), end: new Date(b.end) }));
}

export async function createCalendarEvent(args: {
  userId: string;
  summary: string;
  description?: string;
  start: Date;
  end: Date;
  attendeeEmail: string;
  attendeeName?: string;
  location?: string;
  withGoogleMeet?: boolean;
}): Promise<GoogleEvent> {
  const accessToken = await getGoogleAccessToken(args.userId);

  const requestId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random()}`;

  const body: Record<string, unknown> = {
    summary: args.summary,
    description: args.description,
    start: { dateTime: args.start.toISOString() },
    end: { dateTime: args.end.toISOString() },
    attendees: [
      {
        email: args.attendeeEmail,
        displayName: args.attendeeName,
      },
    ],
    guestsCanModify: false,
    reminders: { useDefault: true },
  };
  if (args.location) body.location = args.location;
  if (args.withGoogleMeet) {
    body.conferenceData = {
      createRequest: {
        requestId,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
  }

  const url = new URL(
    "https://www.googleapis.com/calendar/v3/calendars/primary/events"
  );
  url.searchParams.set("sendUpdates", "all");
  if (args.withGoogleMeet) url.searchParams.set("conferenceDataVersion", "1");

  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(
      `Google Calendar event create failed: ${res.status} ${await res.text()}`
    );
  }
  const data = (await res.json()) as {
    id: string;
    hangoutLink?: string;
    htmlLink?: string;
  };
  return {
    id: data.id,
    hangoutLink: data.hangoutLink,
    htmlLink: data.htmlLink,
  };
}
