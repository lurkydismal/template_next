import dayjs from "dayjs";
import { FieldConfig } from "../types";

/**
 * Converts input into field value.
 */
export const toFieldValue = (
    field: FieldConfig<Record<string, unknown>, Record<string, unknown>>,
    value: unknown,
): unknown => {
    if (value === null || value === undefined) return value;

    if (field.type === "datetime") {
        if (dayjs.isDayjs(value)) return value.toISOString();
        if (value instanceof Date) return value.toISOString();
        return value;
    }

    if (field.type === "date") {
        if (dayjs.isDayjs(value)) return value.format("YYYY-MM-DD");
        if (value instanceof Date) return dayjs(value).format("YYYY-MM-DD");
        return value;
    }

    if (field.type === "time") {
        if (dayjs.isDayjs(value)) return value.format("HH:mm:ss");
        if (value instanceof Date) return dayjs(value).format("HH:mm:ss");
        return value;
    }

    if (dayjs.isDayjs(value)) return value.toISOString();
    if (value instanceof Date) return value.toISOString();

    return value;
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
        const value = (row as Record<string, unknown>)[key] ?? null;
        out[key] = field.formatValue ? field.formatValue(value) : value;
    }

    return out;
};
