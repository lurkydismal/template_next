CREATE TABLE "categories" (
	"id" serial PRIMARY KEY,
	"name" varchar(50) NOT NULL UNIQUE,
	"updated_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "name_not_blank" CHECK (length(trim("name")) > 0)
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
