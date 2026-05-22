ALTER TABLE "booking" ADD COLUMN "meeting_url" text;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "zoom_meeting_id" text;--> statement-breakpoint
ALTER TABLE "booking" ADD COLUMN "cancelled_at" timestamp with time zone;