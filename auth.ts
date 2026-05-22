import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { eq, and } from "drizzle-orm";
import { db, schema } from "@/db";

const GOOGLE_SCOPES = [
  "openid",
  "email",
  "profile",
  "https://www.googleapis.com/auth/calendar",
  "https://www.googleapis.com/auth/calendar.events",
].join(" ");

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: DrizzleAdapter(db, {
    usersTable: schema.users,
    accountsTable: schema.accounts,
    sessionsTable: schema.sessions,
    verificationTokensTable: schema.verificationTokens,
  }),
  providers: [
    Google({
      authorization: {
        params: {
          scope: GOOGLE_SCOPES,
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: "true",
        },
      },
    }),
  ],
  session: { strategy: "database" },
  callbacks: {
    async session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
    };
  }
}

// ---------- Google token helpers (used by server actions / pages) ----------

type GoogleAccount = typeof schema.accounts.$inferSelect;

async function refreshGoogleAccessToken(account: GoogleAccount) {
  if (!account.refresh_token) {
    throw new Error("No refresh token on file — owner must re-authenticate");
  }
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.AUTH_GOOGLE_ID!,
      client_secret: process.env.AUTH_GOOGLE_SECRET!,
      grant_type: "refresh_token",
      refresh_token: account.refresh_token,
    }),
  });
  if (!res.ok) {
    throw new Error(`Token refresh failed: ${res.status} ${await res.text()}`);
  }
  const data = (await res.json()) as {
    access_token: string;
    expires_in: number;
    scope?: string;
  };
  const expiresAt = Math.floor(Date.now() / 1000) + data.expires_in;

  await db
    .update(schema.accounts)
    .set({ access_token: data.access_token, expires_at: expiresAt })
    .where(
      and(
        eq(schema.accounts.provider, account.provider),
        eq(schema.accounts.providerAccountId, account.providerAccountId)
      )
    );

  return data.access_token;
}

/**
 * Returns a valid Google access token for the given user, refreshing if
 * the stored one has expired (or is within 60s of expiring).
 */
export async function getGoogleAccessToken(userId: string): Promise<string> {
  const [account] = await db
    .select()
    .from(schema.accounts)
    .where(
      and(
        eq(schema.accounts.userId, userId),
        eq(schema.accounts.provider, "google")
      )
    )
    .limit(1);

  if (!account) {
    throw new Error("No Google account linked for this user");
  }

  const expiresAt = account.expires_at ?? 0;
  if (account.access_token && Date.now() < expiresAt * 1000 - 60_000) {
    return account.access_token;
  }
  return refreshGoogleAccessToken(account);
}
