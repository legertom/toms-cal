import { redirect } from "next/navigation";
import { auth } from "@/auth";

export async function requireOwner() {
  const session = await auth();
  const ownerEmail = process.env.OWNER_EMAIL;
  if (!session?.user?.email) {
    redirect("/");
  }
  if (!ownerEmail || session.user.email !== ownerEmail) {
    redirect("/");
  }
  return session as typeof session & {
    user: { id: string; email: string; name?: string | null; image?: string | null };
  };
}
