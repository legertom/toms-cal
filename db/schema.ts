import {
  pgTable,
  text,
  integer,
  timestamp,
  primaryKey,
  boolean,
  uuid,
  time,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------- Auth.js required tables ----------

export const users = pgTable("user", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("emailVerified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "account",
  {
    userId: text("userId")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("providerAccountId").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (a) => [primaryKey({ columns: [a.provider, a.providerAccountId] })]
);

export const sessions = pgTable("session", {
  sessionToken: text("sessionToken").primaryKey(),
  userId: text("userId")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verificationToken",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })]
);

// ---------- Booking domain ----------

export const meetingTypes = pgTable(
  "meeting_type",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    description: text("description"),
    durationMinutes: integer("duration_minutes").notNull(),
    bufferBeforeMinutes: integer("buffer_before_minutes").notNull().default(0),
    bufferAfterMinutes: integer("buffer_after_minutes").notNull().default(0),
    // How far in advance bookings are allowed (days)
    advanceWindowDays: integer("advance_window_days").notNull().default(14),
    // Minimum notice required before a booking can start (minutes)
    minNoticeMinutes: integer("min_notice_minutes").notNull().default(60),
    locationType: text("location_type").notNull().default("google_meet"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("meeting_type_owner_slug_idx").on(t.ownerId, t.slug),
    index("meeting_type_active_idx").on(t.isActive),
  ]
);

// Weekly recurring availability windows. day_of_week is 0–6 with 0 = Sunday.
export const availabilityRules = pgTable(
  "availability_rule",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    dayOfWeek: integer("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    // IANA timezone the start/end times are interpreted in
    timezone: text("timezone").notNull().default("America/New_York"),
  },
  (t) => [index("availability_owner_idx").on(t.ownerId)]
);

export const bookings = pgTable(
  "booking",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    meetingTypeId: uuid("meeting_type_id")
      .notNull()
      .references(() => meetingTypes.id, { onDelete: "restrict" }),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    attendeeName: text("attendee_name").notNull(),
    attendeeEmail: text("attendee_email").notNull(),
    startTime: timestamp("start_time", { mode: "date", withTimezone: true })
      .notNull(),
    endTime: timestamp("end_time", { mode: "date", withTimezone: true })
      .notNull(),
    notes: text("notes"),
    // AI-drafted agenda for the meeting (nullable until AI flow is wired up)
    aiAgenda: text("ai_agenda"),
    googleEventId: text("google_event_id"),
    googleMeetLink: text("google_meet_link"),
    status: text("status").notNull().default("confirmed"),
    createdAt: timestamp("created_at", { mode: "date" })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("booking_owner_start_idx").on(t.ownerId, t.startTime),
    index("booking_meeting_type_idx").on(t.meetingTypeId),
  ]
);
