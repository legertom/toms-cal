# toms-cal — Workspace OAuth diagnostic

A minimal Next.js 16 app that confirms whether your company's Google Workspace
will let you build a Calendly-style booking tool against your work calendar.

**Sign in once, see green checkmarks, you're clear to build.**

---

## What it checks

1. **OAuth sign-in itself** — your admin hasn't blocked the consent screen
2. **Calendar scopes** — they were actually granted (not silently stripped)
3. **A live Google Calendar API call** — `freebusy.query` against your primary
   calendar, proving the access token works end-to-end

---

## Setup (≈ 10 minutes)

### 1. Create a Google Cloud project

Sign in to [console.cloud.google.com](https://console.cloud.google.com) with
your **work** account.

- New project → name it `toms-cal-diagnostic` (or whatever)
- If you get "Your administrator has disabled Google Cloud" — **stop here**,
  you'll need admin to enable it

### 2. Enable the Calendar API

- APIs & Services → **Library** → search "Google Calendar API" → **Enable**

### 3. Configure the OAuth consent screen

- APIs & Services → **OAuth consent screen**
- User Type: **Internal** ← this is the magic setting. It restricts the app to
  your Workspace org, which means **no Google verification needed** and **no
  scary unverified-app warning** for coworkers.
- App name: `toms-cal`
- Support email: yours
- Scopes: add
  - `.../auth/userinfo.email`
  - `.../auth/userinfo.profile`
  - `openid`
  - `.../auth/calendar`
  - `.../auth/calendar.events`

> If "Internal" is greyed out, your Google Cloud project isn't under a
> Workspace org. Either ask IT to create one for you under the org, or proceed
> with "External" (you'll see an unverified-app warning, which is fine for
> testing).

### 4. Create OAuth credentials

- APIs & Services → **Credentials** → Create Credentials → **OAuth client ID**
- Application type: **Web application**
- Authorized redirect URIs: `http://localhost:3000/api/auth/callback/google`
- Copy the **Client ID** and **Client secret**

### 5. Create a Neon database

- Sign up at [console.neon.tech](https://console.neon.tech) (free tier is fine)
- New Project → name it `toms-cal`
- On the project dashboard, copy the **Pooled connection string** (it ends with
  `-pooler.<region>.aws.neon.tech`). That's your `DATABASE_URL`.

### 6. Configure this app

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```
AUTH_SECRET=...           # openssl rand -base64 32
AUTH_GOOGLE_ID=...        # from step 4
AUTH_GOOGLE_SECRET=...    # from step 4
AUTH_URL=http://localhost:3000
DATABASE_URL=...          # from step 5 (pooled connection string)
OWNER_EMAIL=you@yourcompany.com   # your work email, gates /admin access
```

### 7. Run the database migration

```bash
npm run db:migrate
```

This creates all tables (Auth.js + booking domain) in your Neon database.

### 8. Run the app

```bash
npm run dev
```

Open <http://localhost:3000>, click **Sign in with Google**, use your work
account. You'll see a "Run calendar diagnostic" button and, since you're the
owner, an "Admin" link.

---

## Reading the diagnostic result

| Result | What it means |
| --- | --- |
| All 3 green checks | Workspace allows everything. Build the full app. |
| Sign-in blocked with "Access blocked: [App] has not completed verification" | Admin restricts unverified apps. Move consent screen to Internal or have admin allowlist your client ID. |
| Sign-in works but scopes missing | Admin has scope-level restrictions on Calendar API. Talk to them. |
| Sign-in + scopes OK but API call returns 403 | Calendar API isn't enabled for your user, or admin has API-level restrictions. |

---

## Architecture

- **Next.js 16** App Router, deployed to Vercel
- **Neon Postgres** via `@neondatabase/serverless` (HTTP, edge-friendly)
- **Drizzle ORM** with migrations in `db/migrations/`
- **Auth.js v5** with the Drizzle adapter — DB-backed sessions, so refresh
  tokens persist across deploys and can be looked up by `userId` when we need
  to make Calendar API calls
- **Single-owner gating** — `OWNER_EMAIL` env var controls who can access
  `/admin`. The OAuth consent screen being **Internal** already restricts
  sign-in to your Workspace org.

### Useful scripts

```bash
npm run dev           # local dev server
npm run db:generate   # generate a new migration after editing db/schema.ts
npm run db:migrate    # apply migrations to DATABASE_URL
npm run db:studio     # browse the DB visually
npm run db:push       # quick schema sync without migrations (dev only)
```

---

## What's next

- `/admin` for managing meeting types & weekly availability
- Public `/book/[slug]` pages
- `events.insert` server actions that create the meeting on your calendar with
  the attendee → Google handles the invite email
- Vercel AI SDK chat for the AI-enablement booking flow
