import Link from "next/link";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { auth, getGoogleAccessToken } from "@/auth";
import { db, schema } from "@/db";

const REQUIRED_SCOPES = [
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
];

type FreeBusyResult =
  | { ok: true; busyCount: number }
  | { ok: false; status: number; body: string };

async function probeFreeBusy(accessToken: string): Promise<FreeBusyResult> {
  const now = new Date();
  const inAWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const res = await fetch("https://www.googleapis.com/calendar/v3/freeBusy", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      timeMin: now.toISOString(),
      timeMax: inAWeek.toISOString(),
      items: [{ id: "primary" }],
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    return { ok: false, status: res.status, body: await res.text() };
  }

  const data = (await res.json()) as {
    calendars: Record<string, { busy: Array<{ start: string; end: string }> }>;
  };
  return { ok: true, busyCount: data.calendars?.primary?.busy?.length ?? 0 };
}

export default async function DiagnosticPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const [account] = await db
    .select({ scope: schema.accounts.scope })
    .from(schema.accounts)
    .where(
      and(
        eq(schema.accounts.userId, session.user.id),
        eq(schema.accounts.provider, "google")
      )
    )
    .limit(1);

  const grantedScopes = (account?.scope ?? "").split(" ").filter(Boolean);
  const missingScopes = REQUIRED_SCOPES.filter((s) => !grantedScopes.includes(s));

  let probe: FreeBusyResult | null = null;
  try {
    const accessToken = await getGoogleAccessToken(session.user.id);
    probe = await probeFreeBusy(accessToken);
  } catch (err) {
    probe = {
      ok: false,
      status: 0,
      body: err instanceof Error ? err.message : String(err),
    };
  }

  const allGood = missingScopes.length === 0 && probe?.ok === true;

  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <Link
        href="/"
        className="text-sm font-medium text-blue hover:text-blue-hover"
      >
        ← back
      </Link>

      <h1 className="mt-6 font-serif text-3xl font-black tracking-tight text-navy">
        Diagnostic results
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {session.user.email}
      </p>

      <div className="mt-8 overflow-hidden rounded-[12px] border border-border bg-white">
        <Check
          label="Workspace allowed OAuth sign-in"
          ok
          detail="You made it past the consent screen."
        />
        <Check
          label="Calendar scopes granted"
          ok={missingScopes.length === 0}
          detail={
            missingScopes.length === 0
              ? "Both read and write scopes are present."
              : `Missing: ${missingScopes.join(", ")}`
          }
        />
        <Check
          label="Google Calendar API call succeeded"
          ok={probe?.ok === true}
          detail={
            probe?.ok
              ? `Found ${probe.busyCount} busy block(s) in the next 7 days.`
              : probe
              ? `${probe.status ? `HTTP ${probe.status} — ` : ""}${probe.body.slice(0, 240)}`
              : "No access token."
          }
        />
      </div>

      <div
        className={`mt-8 rounded-[12px] p-5 ${
          allGood
            ? "bg-sky/60 text-navy"
            : "border border-danger/30 bg-white text-foreground"
        }`}
      >
        <div className="flex items-center gap-2 text-sm font-medium">
          <span
            className={`inline-block h-2 w-2 rounded-full ${
              allGood ? "bg-success" : "bg-danger"
            }`}
          />
          Verdict
        </div>
        {allGood ? (
          <p className="mt-2">
            <strong>Your Workspace will allow this.</strong> You have read &amp;
            write access to your calendar.
          </p>
        ) : (
          <p className="mt-2 text-danger">
            <strong>Something is blocked.</strong> See the failed check above.
          </p>
        )}
      </div>

      <details className="mt-8 text-sm text-muted-foreground">
        <summary className="cursor-pointer font-medium">Granted scopes</summary>
        <pre className="mt-2 overflow-x-auto rounded-[8px] bg-muted p-3 text-xs">
          {grantedScopes.join("\n") || "(none)"}
        </pre>
      </details>
    </main>
  );
}

function Check({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean;
  detail: string;
}) {
  return (
    <div className="flex gap-4 border-b border-border px-5 py-4 last:border-b-0">
      <span
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
          ok ? "bg-success" : "bg-danger"
        }`}
      >
        {ok ? "✓" : "✕"}
      </span>
      <div>
        <div className="font-medium text-navy">{label}</div>
        <div className="mt-0.5 text-sm text-muted-foreground">{detail}</div>
      </div>
    </div>
  );
}
