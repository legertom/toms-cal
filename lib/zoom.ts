/**
 * Zoom Server-to-Server OAuth client.
 *
 * Setup:
 * 1. Go to https://marketplace.zoom.us/develop/create
 * 2. Create a "Server-to-Server OAuth" app
 * 3. Note the Account ID, Client ID, Client Secret
 * 4. Under "Scopes" add: meeting:write:admin, meeting:read:admin
 * 5. Activate the app
 * 6. Set these env vars in Vercel:
 *    - ZOOM_ACCOUNT_ID
 *    - ZOOM_CLIENT_ID
 *    - ZOOM_CLIENT_SECRET
 */

const TOKEN_URL = "https://zoom.us/oauth/token";
const API_BASE = "https://api.zoom.us/v2";

type CachedToken = { token: string; expiresAt: number };
let cachedToken: CachedToken | null = null;

export function zoomEnabled(): boolean {
  return (
    !!process.env.ZOOM_ACCOUNT_ID &&
    !!process.env.ZOOM_CLIENT_ID &&
    !!process.env.ZOOM_CLIENT_SECRET
  );
}

async function getAccessToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
    return cachedToken.token;
  }

  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;
  if (!accountId || !clientId || !clientSecret) {
    throw new Error("Zoom credentials not configured");
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString(
    "base64"
  );
  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "account_credentials",
      account_id: accountId,
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Zoom token request failed: ${res.status} ${await res.text()}`
    );
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
  };
  cachedToken = {
    token: data.access_token,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  return data.access_token;
}

export type ZoomMeeting = {
  id: string;
  joinUrl: string;
  startUrl: string;
  password?: string;
};

export async function createZoomMeeting(args: {
  topic: string;
  agenda?: string;
  start: Date;
  durationMinutes: number;
  attendeeEmail: string;
}): Promise<ZoomMeeting> {
  const token = await getAccessToken();
  const res = await fetch(`${API_BASE}/users/me/meetings`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      topic: args.topic,
      type: 2, // scheduled
      start_time: args.start.toISOString(),
      duration: args.durationMinutes,
      timezone: "UTC",
      agenda: args.agenda,
      settings: {
        join_before_host: true,
        jbh_time: 5,
        approval_type: 2, // no registration
        audio: "both",
        auto_recording: "none",
        waiting_room: false,
        meeting_invitees: [{ email: args.attendeeEmail }],
      },
    }),
  });
  if (!res.ok) {
    throw new Error(
      `Zoom meeting create failed: ${res.status} ${await res.text()}`
    );
  }
  const data = (await res.json()) as {
    id: number;
    join_url: string;
    start_url: string;
    password?: string;
  };
  return {
    id: String(data.id),
    joinUrl: data.join_url,
    startUrl: data.start_url,
    password: data.password,
  };
}

/** Best-effort delete. Logs and returns false on failure instead of throwing. */
export async function deleteZoomMeeting(meetingId: string): Promise<boolean> {
  try {
    const token = await getAccessToken();
    const res = await fetch(`${API_BASE}/meetings/${meetingId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    // 204 = success, 404 = already gone (also OK)
    if (res.ok || res.status === 404) return true;
    console.error(
      `Zoom delete failed: ${res.status} ${await res.text().catch(() => "")}`
    );
    return false;
  } catch (err) {
    console.error("Zoom delete threw:", err);
    return false;
  }
}
