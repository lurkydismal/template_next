CREATE TABLE "tables" (
	"id" serial PRIMARY KEY,
	"content" text NOT NULL,
	"author_id" integer,
	"last_editor_id" integer,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_not_blank" CHECK (length(trim("content")) > 0)
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" serial PRIMARY KEY,
	"username" varchar(32) NOT NULL UNIQUE,
	"username_normalized" varchar(32) NOT NULL UNIQUE,
	"password_hash" text NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "username_not_blank" CHECK (length(trim("username")) > 0),
	CONSTRAINT "username_normalized_not_blank" CHECK (length(trim("username_normalized")) > 0),
	CONSTRAINT "username_normalized_lowercase" CHECK ("username_normalized" = lower("username_normalized"))
);
--> statement-breakpoint
CREATE INDEX "tables_author_id_index" ON "tables" ("author_id");--> statement-breakpoint
CREATE INDEX "tables_last_editor_id_index" ON "tables" ("last_editor_id");--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_author_id_users_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "tables_last_editor_id_users_id_fkey" FOREIGN KEY ("last_editor_id") REFERENCES "users"("id") ON DELETE SET NULL;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint
-- Register triggers
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON "tables"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();