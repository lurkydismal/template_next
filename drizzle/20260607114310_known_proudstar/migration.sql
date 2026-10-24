ALTER TABLE "tables" RENAME COLUMN "text_field" TO "textField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "content" TO "multilineField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "markdown_field" TO "markdownField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "custom_field" TO "customField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "autocomplete_field" TO "autocompleteField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "date_field" TO "dateField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "time_field" TO "timeField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "datetime_field" TO "datetimeField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "number_field" TO "numberField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "uuid_field" TO "uuidField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "hex_field" TO "hexField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "inet_field" TO "inetField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "table_lookup_field" TO "tableLookupField";--> statement-breakpoint
ALTER TABLE "tables" RENAME COLUMN "file_field" TO "fileField";--> statement-breakpoint
ALTER TABLE "tables" RENAME CONSTRAINT "content_not_blank" TO "multilineField_not_blank";--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "checkboxField" boolean;--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "checkboxIconField" boolean;--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "switchField" boolean;--> statement-breakpoint
ALTER TABLE "tables" ADD COLUMN "radioGroupField" boolean;--> statement-breakpoint
ALTER TABLE "tables" DROP CONSTRAINT "multilineField_not_blank", ADD CONSTRAINT "multilineField_not_blank" CHECK (length(trim("multilineField")) > 0);