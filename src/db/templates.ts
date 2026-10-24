import { boolean, integer, serial, text } from "drizzle-orm/pg-core";
import { metadataColumns } from "./helpers";

export const table = {
    id: serial().primaryKey(),
    text_field: text(),
    multiline_field: text().notNull(),
    markdown_field: text(),
    custom_field: text(),
    autocomplete_field: text(),
    date_field: text(),
    time_field: text(),
    datetime_field: text(),
    number_field: integer(),
    uuid_field: text(),
    hex_field: text(),
    inet_field: text(),
    table_lookup_field: text(),
    file_field: text(),
    checkbox_field: boolean(),
    checkbox_icon_field: boolean(),
    switch_field: boolean(),
    radio_group_field: boolean(),
    ...metadataColumns,
};
