ALTER TABLE "table" ADD COLUMN "author" varchar(32) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "table" ADD COLUMN "last_editor" varchar(32) DEFAULT 'system' NOT NULL;--> statement-breakpoint
ALTER TABLE "table" ADD CONSTRAINT "author_not_blank" CHECK (length(trim("author")) > 0);--> statement-breakpoint
ALTER TABLE "table" ADD CONSTRAINT "last_editor_not_blank" CHECK (length(trim("last_editor")) > 0);