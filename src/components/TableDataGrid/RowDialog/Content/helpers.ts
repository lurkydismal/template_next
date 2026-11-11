import dayjs from "dayjs";

import { FieldConfig } from "../types";

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
export const buildInitialValues = <R extends Record<string, unknown>, RI>(
    row: R,
    fields: FieldConfig<R, RI>[],
) => {
    const out: Record<string, unknown> = {};

    for (const field of fields) {
        const key = String(field.key);
        const rowValue = (row as Record<string, unknown>)[key];
        const defaultValue =
            field.type === "boolean"
                ? (field.default ?? false)
                : field.type === "radio-group"
                  ? (field.default ?? null)
                  : null;
        const value = rowValue ?? defaultValue;
        out[key] = field.formatValue ? field.formatValue(value) : value;
    }

    return out;
};
