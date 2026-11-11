import { boolean, integer, jsonb, serial, text } from "drizzle-orm/pg-core";

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
    checkbox_field: boolean(),
    checkbox_icon_field: boolean(),
    switch_field: boolean(),
    // Radio-group options may be strings or numbers; JSONB preserves either type.
    radio_group_field: jsonb().$type<string | number>(),
    // Repeater entries: array of objects keyed by sub-field key. Blank entries are never stored.
    repeater_field: jsonb().$type<Record<string, unknown>[]>(),
    tree_field: jsonb().$type<Record<string, unknown>[]>(),
    ...metadataColumns,
};
