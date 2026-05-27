CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY,
	"type" varchar(16) DEFAULT 'default' NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false NOT NULL,
	"read_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "notification_message_not_blank" CHECK (length(trim("message")) > 0)
);
--> statement-breakpoint
CREATE INDEX "notifications_is_read_index" ON "notifications" ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_index" ON "notifications" ("created_at");