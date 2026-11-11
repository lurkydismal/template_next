import dayjs from "dayjs";

import type { FieldConfig } from "../types";

const toFormattedValue = (value: unknown, format: string): unknown => {
    if (dayjs.isDayjs(value)) return value.format(format);
    if (value instanceof Date) return dayjs(value).format(format);
    return value;
};

const toIsoValue = (value: unknown): unknown => {
    if (dayjs.isDayjs(value)) return value.toISOString();
    if (value instanceof Date) return value.toISOString();
    return value;
};

/**
 * Converts input into field value.
 */
export const toFieldValue = (
    field: FieldConfig<Record<string, unknown>, Record<string, unknown>>,
    value: unknown,
): unknown => {
    if (value === null || value === undefined) return value;

    switch (field.type) {
        case "date":
            return toFormattedValue(value, "YYYY-MM-DD");
        case "time":
            return toFormattedValue(value, "HH:mm:ss");
        case "datetime":
        default:
            return toIsoValue(value);
    }
};

/**
 * Builds initial values.
 */
function getDefaultFieldValue<R extends Record<string, unknown>, RI>(
    field: FieldConfig<R, RI>,
): unknown {
    if (field.type === "boolean") return field.default ?? false;
    if (field.type === "radio-group") return field.default ?? null;
    return null;
}

/**
 * Builds initial values from row data, using field defaults only for missing values.
 */
export function buildInitialValues<R extends Record<string, unknown>, RI>(
    row: R,
    fields: FieldConfig<R, RI>[],
): Record<string, unknown> {
    return Object.fromEntries(
        fields.map((field) => {
            const key = String(field.key);
            const value = (row as Record<string, unknown>)[key] ?? getDefaultFieldValue(field);
            return [key, field.formatValue ? field.formatValue(value) : value];
        }),
    );
}
