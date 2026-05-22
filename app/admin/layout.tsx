import Link from "next/link";
import { requireOwner } from "@/lib/auth-guard";
import { signOut } from "@/auth";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireOwner();

  return (
    <div className="min-h-screen bg-muted">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <Link
              href="/admin"
              className="flex items-center gap-2 text-sm font-semibold text-navy"
            >
              <span className="inline-block h-2 w-2 rounded-full bg-blue" />
              toms-cal admin
            </Link>
            <nav className="flex items-center gap-5 text-sm font-medium text-muted-foreground">
              <Link href="/admin/meeting-types" className="hover:text-navy">
                Meeting types
              </Link>
              <Link href="/admin/availability" className="hover:text-navy">
                Availability
              </Link>
              <Link href="/diagnostic" className="hover:text-navy">
                Diagnostic
              </Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">
              {session.user.email}
            </span>
            <form
              action={async () => {
                "use server";
                await signOut({ redirectTo: "/" });
              }}
            >
              <button
                type="submit"
                className="rounded-[8px] border border-border bg-white px-3 py-1.5 text-xs font-medium hover:bg-muted"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-6 py-10">{children}</main>
    </div>
  );
}
