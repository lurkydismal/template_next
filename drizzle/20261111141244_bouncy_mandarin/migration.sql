ALTER TABLE "tables" ADD COLUMN "repeater_field" jsonb;--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "tree_field" jsonb;--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "repeaterField_is_array" CHECK ("repeater_field" is null or jsonb_typeof("repeater_field") = 'array');--> statement-breakpoint
ALTER TABLE "tables" ADD CONSTRAINT "treeField_is_array" CHECK ("tree_field" is null or jsonb_typeof("tree_field") = 'array');