CREATE TABLE "table" (
	"id" serial PRIMARY KEY,
	"content" text NOT NULL,
	"author" varchar(32) DEFAULT 'system' NOT NULL,
	"last_editor" varchar(32) DEFAULT 'system' NOT NULL,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "content_not_blank" CHECK (length(trim("content")) > 0),
	CONSTRAINT "author_not_blank" CHECK (length(trim("author")) > 0),
	CONSTRAINT "last_editor_not_blank" CHECK (length(trim("last_editor")) > 0)
);
--> statement-breakpoint
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
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
-- Register triggers
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON "table"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_updated_at
BEFORE UPDATE ON "users"
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();