import { integer, serial, text } from "drizzle-orm/pg-core";
import { metadataColumns } from "./helpers";

export const table = {
    id: serial().primaryKey(),
    textField: text("text_field"),
    content: text().notNull(),
    markdownField: text("markdown_field"),
    customField: text("custom_field"),
    autocompleteField: text("autocomplete_field"),
    dateField: text("date_field"),
    timeField: text("time_field"),
    datetimeField: text("datetime_field"),
    numberField: integer("number_field"),
    uuidField: text("uuid_field"),
    hexField: text("hex_field"),
    inetField: text("inet_field"),
    tableLookupField: text("table_lookup_field"),
    fileField: text("file_field"),
    ...metadataColumns,
};
