CREATE TABLE "record_changes" (
	"id" serial PRIMARY KEY,
	"target" varchar(64) NOT NULL,
	"record_key" jsonb NOT NULL,
	"operation" varchar(6) NOT NULL,
	"actor_id" text,
	"changes" jsonb NOT NULL,
	"created_at" timestamp(0) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "record_changes_operation_valid" CHECK ("operation" in ('insert', 'update', 'delete')),
	CONSTRAINT "record_changes_changes_array" CHECK (jsonb_typeof("changes") = 'array')
);
--> statement-breakpoint
CREATE INDEX "record_changes_record_idx" ON "record_changes" ("target","record_key","created_at");--> statement-breakpoint
CREATE INDEX "record_changes_actor_idx" ON "record_changes" ("actor_id");--> statement-breakpoint
CREATE INDEX "record_changes_created_at_idx" ON "record_changes" ("created_at");--> statement-breakpoint
ALTER TABLE "record_changes" ADD CONSTRAINT "record_changes_actor_id_user_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "user"("id") ON DELETE SET NULL;