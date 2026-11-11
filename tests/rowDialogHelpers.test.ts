import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import type { FieldConfig } from "../src/components/TableDataGrid/RowDialog/types";

import {
    buildInitialValues,
    toFieldValue,
} from "../src/components/TableDataGrid/RowDialog/Content/helpers";

type Row = Record<string, unknown>;
type Insert = Record<string, unknown>;

const fields: FieldConfig<Row, Insert>[] = [
    { key: "enabled", label: "Enabled", type: "boolean", variant: "switch", default: true },
    { key: "role", label: "Role", type: "radio-group", options: ["member"], default: "member" },
    { key: "title", label: "Title", type: "text" },
];

describe("row dialog value helpers", () => {
    it("builds defaults for boolean, radio, and ordinary fields", () => {
        expect(buildInitialValues({}, fields)).toEqual({
            enabled: true,
            role: "member",
            title: null,
        });
    });

    it("prefers existing row values over field defaults", () => {
        expect(
            buildInitialValues({ enabled: false, role: "admin", title: "Existing" }, fields),
        ).toEqual({
            enabled: false,
            role: "admin",
            title: "Existing",
        });
    });

    it("formats dayjs date and time values for form controls", () => {
        const date = dayjs("2026-11-11T14:15:16.000Z");
        const dateField = { key: "date", label: "Date", type: "date" } as FieldConfig<Row, Insert>;
        const timeField = { key: "time", label: "Time", type: "time" } as FieldConfig<Row, Insert>;

        expect(toFieldValue(dateField, date)).toBe(date.format("YYYY-MM-DD"));
        expect(toFieldValue(timeField, date)).toBe(date.format("HH:mm:ss"));
    });

    it("serializes Date values to ISO strings", () => {
        const field = { key: "timestamp", label: "Timestamp", type: "datetime" } as FieldConfig<
            Row,
            Insert
        >;
        const date = new Date("2026-11-11T14:15:16.000Z");

        expect(toFieldValue(field, date)).toBe(date.toISOString());
    });
});
