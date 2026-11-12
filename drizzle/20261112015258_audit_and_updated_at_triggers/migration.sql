-- Custom migration: database-level guarantees the application relies on.
--   1. tables.updated_at is maintained by the database (only when a row really changes).
--   2. Every INSERT/UPDATE/DELETE on "tables" is recorded in "record_changes" in the same
--      transaction, including writes that bypass the Next.js mutation helpers.
--   3. "record_changes" is append-only for ordinary roles.
-- See docs/audit-history.md.

CREATE OR REPLACE FUNCTION "set_updated_at"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- Leave no-op UPDATE statements untouched so they do not look like edits.
    IF NEW IS DISTINCT FROM OLD THEN
        NEW."updated_at" := now();
    END IF;
    RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "tables_set_updated_at" ON "tables";
--> statement-breakpoint
CREATE TRIGGER "tables_set_updated_at"
BEFORE UPDATE ON "tables"
FOR EACH ROW
EXECUTE FUNCTION "set_updated_at"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "record_tables_field_changes"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    before_row jsonb;
    after_row jsonb;
    field_changes jsonb;
    row_id integer;
    actor_id_value text;
    operation_name varchar(6);
BEGIN
    IF TG_OP = 'INSERT' THEN
        after_row := to_jsonb(NEW);
        row_id := NEW.id;
        actor_id_value := NEW.last_editor_id;
        operation_name := 'insert';

        SELECT COALESCE(
            jsonb_agg(jsonb_build_array(fields.key, 'null'::jsonb, fields.value) ORDER BY fields.key),
            '[]'::jsonb
        )
        INTO field_changes
        FROM jsonb_each(after_row) AS fields(key, value);

    ELSIF TG_OP = 'UPDATE' THEN
        before_row := to_jsonb(OLD);
        after_row := to_jsonb(NEW);
        row_id := NEW.id;
        actor_id_value := NEW.last_editor_id;
        operation_name := 'update';

        SELECT COALESCE(
            jsonb_agg(
                jsonb_build_array(old_fields.key, old_fields.value, new_fields.value)
                ORDER BY old_fields.key
            ),
            '[]'::jsonb
        )
        INTO field_changes
        FROM jsonb_each(before_row) AS old_fields(key, value)
        JOIN jsonb_each(after_row) AS new_fields USING (key)
        WHERE old_fields.value IS DISTINCT FROM new_fields.value;

    ELSE
        before_row := to_jsonb(OLD);
        row_id := OLD.id;
        actor_id_value := OLD.last_editor_id;
        operation_name := 'delete';

        SELECT COALESCE(
            jsonb_agg(jsonb_build_array(fields.key, fields.value, 'null'::jsonb) ORDER BY fields.key),
            '[]'::jsonb
        )
        INTO field_changes
        FROM jsonb_each(before_row) AS fields(key, value);
    END IF;

    -- When an account is deleted, the foreign keys on author_id / last_editor_id are cleared by
    -- cascading UPDATEs that fire this trigger while the user row is already gone. Referencing
    -- the vanished user as actor would violate record_changes_actor_id_fkey and make account
    -- deletion fail, so only keep an actor that still exists.
    SELECT "user"."id" INTO actor_id_value FROM "user" WHERE "user"."id" = actor_id_value;

    IF jsonb_array_length(field_changes) > 0 THEN
        INSERT INTO "record_changes" ("target", "record_key", "operation", "actor_id", "changes")
        VALUES ('tables', jsonb_build_object('id', row_id), operation_name, actor_id_value, field_changes);
    END IF;

    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    END IF;
    RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "tables_record_field_changes" ON "tables";
--> statement-breakpoint
CREATE TRIGGER "tables_record_field_changes"
AFTER INSERT OR UPDATE OR DELETE ON "tables"
FOR EACH ROW
EXECUTE FUNCTION "record_tables_field_changes"();
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "reject_record_changes_mutation"()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
    -- The only permitted change is the actor foreign key being cleared (ON DELETE SET NULL
    -- when a user account is removed).
    IF TG_OP = 'UPDATE'
        AND OLD."actor_id" IS NOT NULL
        AND NEW."actor_id" IS NULL
        AND (to_jsonb(NEW) - 'actor_id') = (to_jsonb(OLD) - 'actor_id') THEN
        RETURN NEW;
    END IF;

    RAISE EXCEPTION 'record_changes is append-only' USING ERRCODE = 'insufficient_privilege';
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "record_changes_append_only" ON "record_changes";
--> statement-breakpoint
CREATE TRIGGER "record_changes_append_only"
BEFORE UPDATE OR DELETE ON "record_changes"
FOR EACH ROW
EXECUTE FUNCTION "reject_record_changes_mutation"();
