CREATE TABLE "account" (
	"id" text PRIMARY KEY,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE "session" (
	"id" text PRIMARY KEY,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL UNIQUE,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" text NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tables" (
	"id" serial PRIMARY KEY,
	"text_field" text,
	"multiline_field" text NOT NULL,
	"markdown_field" text,
	"custom_field" text,
	"autocomplete_field" text,
	"date_field" text,
	"time_field" text,
	"datetime_field" text,
	"number_field" integer,
	"uuid_field" text,
	"hex_field" text,
	"inet_field" text,
	"table_lookup_field" text,
	"checkbox_field" boolean,
	"checkbox_icon_field" boolean,
	"switch_field" boolean,
	"radio_group_field" boolean,
	"author_id" text,
	"last_editor_id" text,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "multilineField_not_blank" CHECK (length(trim("multiline_field")) > 0)
);
--> statement-breakpoint
CREATE TABLE "user" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"email" text NOT NULL UNIQUE,
	"email_verified" boolean DEFAULT false NOT NULL,
	"image" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "verification" (
	"id" text PRIMARY KEY,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "account_userId_idx" ON "account" ("user_id");--> statement-breakpoint
CREATE INDEX "notifications_is_read_index" ON "notifications" ("is_read");--> statement-breakpoint
CREATE INDEX "notifications_created_at_index" ON "notifications" ("created_at");--> statement-breakpoint
CREATE INDEX "session_userId_idx" ON "session" ("user_id");--> statement-breakpoint
CREATE INDEX "tables_author_id_index" ON "tables" ("author_id");--> statement-breakpoint
CREATE INDEX "tables_last_editor_id_index" ON "tables" ("last_editor_id");--> statement-breakpoint
CREATE INDEX "verification_identifier_idx" ON "verification" ("identifier");--> statement-breakpoint
ALTER TABLE "account" ADD CONSTRAINT "account_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "session" ADD CONSTRAINT "session_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_author_id_user_id_fkey" FOREIGN KEY ("author_id") REFERENCES "user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_last_editor_id_user_id_fkey" FOREIGN KEY ("last_editor_id") REFERENCES "user"("id") ON DELETE SET NULL;