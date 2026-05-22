import Link from "next/link";
import { auth, signIn, signOut } from "@/auth";

export default async function Home() {
  const session = await auth();
  const ownerEmail = process.env.OWNER_EMAIL;
  const isOwner = !!session?.user?.email && session.user.email === ownerEmail;

  return (
    <main className="mx-auto max-w-2xl px-6 py-20">
      <div className="flex items-center gap-2 text-sm font-medium text-blue">
        <span className="inline-block h-2 w-2 rounded-full bg-blue" />
        toms-cal
      </div>
      <h1 className="mt-6 font-serif text-4xl font-black tracking-tight text-navy">
        Book time with Tom.
      </h1>
      <p className="mt-3 max-w-lg text-base text-muted-foreground">
        A custom booking page that syncs straight to your work calendar.
        Built for AI enablement at Clever.
      </p>

      <div className="mt-10 rounded-[12px] border border-border bg-sky/40 p-6">
        {session?.user ? (
          <>
            <p className="text-sm text-muted-foreground">Signed in as</p>
            <p className="font-medium text-navy">{session.user.email}</p>

            <div className="mt-5 flex flex-wrap gap-3">
              <Link
                href="/diagnostic"
                className="rounded-[8px] bg-blue px-4 py-2.5 text-sm font-medium text-white transition hover:bg-blue-hover"
              >
                Run calendar diagnostic →
              </Link>
              {isOwner && (
                <Link
                  href="/admin"
                  className="rounded-[8px] border border-navy bg-white px-4 py-2.5 text-sm font-medium text-navy transition hover:bg-sky"
                >
                  Admin
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-[8px] border border-border bg-white px-4 py-2.5 text-sm font-medium text-foreground transition hover:bg-muted"
                >
                  Sign out
                </button>
              </form>
            </div>

            {!isOwner && ownerEmail && (
              <p className="mt-5 text-sm text-muted-foreground">
                You&apos;re signed in but not the owner of this instance.
              </p>
            )}
          </>
        ) : (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="rounded-[8px] bg-blue px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-hover"
            >
              Sign in with Google
            </button>
            <p className="mt-3 text-xs text-muted-foreground">
              Use your <strong>@clever.com</strong> account.
            </p>
          </form>
        )}
      </div>
    </main>
  );
}
