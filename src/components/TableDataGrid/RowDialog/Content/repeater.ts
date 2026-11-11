import type { FieldConfig, RepeaterFieldConfig, RepeaterItem, RepeaterSubField } from "../types";

import { toFieldValue } from "./fieldValues";
import { getAutocompleteComparableValue } from "./renderField/autocompleteUtils";

type AnyField = FieldConfig<Record<string, unknown>, Record<string, unknown>>;
type AnyRepeater = RepeaterFieldConfig<Record<string, unknown>, Record<string, unknown>>;

const resolvedFieldsCache = new WeakMap<object, readonly RepeaterSubField[]>();

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Returns the sub-fields of a repeater. `fields` may be a thunk so a repeater can
 * contain itself (`const tree = { type: "repeater", fields: () => [..., tree] }`).
 * The result is cached per config object so it stays referentially stable.
 */
export function resolveRepeaterFields(field: AnyRepeater): readonly RepeaterSubField[] {
    const cached = resolvedFieldsCache.get(field);
    if (cached) return cached;

    const resolved = typeof field.fields === "function" ? field.fields() : field.fields;
    resolvedFieldsCache.set(field, resolved);
    return resolved;
}

/**
 * Value of a field that has not been touched yet.
 */
export function getFieldDefaultValue(field: AnyField): unknown {
    switch (field.type) {
        case "boolean":
            return field.default ?? false;
        case "radio-group":
            return field.default ?? null;
        case "repeater":
            return [];
        default:
            return null;
    }
}

/**
 * True when a value equals what a freshly created, untouched field holds.
 */
export function isBlankValue(field: AnyField, value: unknown): boolean {
    switch (field.type) {
        case "boolean":
            return value == null || value === getFieldDefaultValue(field);
        case "radio-group":
            return value == null || value === "" || value === getFieldDefaultValue(field);
        case "repeater":
            return (
                !Array.isArray(value) ||
                value.every((item) => isBlankItem(resolveRepeaterFields(field), item))
            );
        default:
            if (value == null) return true;
            if (typeof value === "string") return value.trim() === "";
            if (Array.isArray(value)) return value.length === 0;
            return false;
    }
}

/**
 * True when every sub-field of an item is blank. Blank items are never persisted.
 */
export function isBlankItem(subFields: readonly RepeaterSubField[], item: unknown): boolean {
    if (!isRecord(item)) return true;
    return subFields.every((sub) => isBlankValue(sub, item[String(sub.key)]));
}

/**
 * Number of non-blank items in a repeater value.
 */
export function countFilledItems(field: AnyRepeater, value: unknown): number {
    if (!Array.isArray(value)) return 0;
    const subFields = resolveRepeaterFields(field);
    return value.filter((item) => !isBlankItem(subFields, item)).length;
}

/**
 * A fresh, untouched entry: every sub-field at its default value.
 */
export function createBlankItem(subFields: readonly RepeaterSubField[]): RepeaterItem {
    const out: RepeaterItem = {};
    for (const sub of subFields) out[String(sub.key)] = getFieldDefaultValue(sub);
    return out;
}

/**
 * Prepares an edited list for state: every entry gets an explicit value for every
 * sub-field (react-hook-form falls back to stale initial values for missing keys),
 * and blank entries are dropped from the end, recursively for nested repeaters.
 * The dialog always shows one extra blank row, which is therefore never stored.
 */
export function normalizeRepeaterItems(
    field: AnyRepeater,
    items: readonly unknown[],
): RepeaterItem[] {
    const subFields = resolveRepeaterFields(field);

    const normalized = items.map((raw) => {
        const item = isRecord(raw) ? raw : {};
        const out: RepeaterItem = {};

        for (const sub of subFields) {
            const key = String(sub.key);
            const value = item[key];

            out[key] =
                sub.type === "repeater"
                    ? normalizeRepeaterItems(sub, Array.isArray(value) ? value : [])
                    : (value ?? getFieldDefaultValue(sub));
        }

        return out;
    });

    let end = normalized.length;
    while (end > 0 && isBlankItem(subFields, normalized[end - 1])) end--;

    return end === normalized.length ? normalized : normalized.slice(0, end);
}

function buildItemValues(subFields: readonly RepeaterSubField[], item: RepeaterItem): RepeaterItem {
    const out: RepeaterItem = {};
    for (const sub of subFields) {
        const key = String(sub.key);
        out[key] = buildFieldInitialValue(sub, item[key]);
    }
    return out;
}

/**
 * Initial dialog value for any field (including repeaters) from a stored value.
 */
export function buildFieldInitialValue(field: AnyField, rowValue: unknown): unknown {
    const value =
        field.type === "repeater"
            ? Array.isArray(rowValue)
                ? rowValue
                      .filter(isRecord)
                      .map((item) => buildItemValues(resolveRepeaterFields(field), item))
                : []
            : (rowValue ?? getFieldDefaultValue(field));

    return field.formatValue ? field.formatValue(value) : value;
}

function serializeFieldValue(field: AnyField, value: unknown): unknown {
    if (field.type === "repeater") return serializeRepeaterValue(field, value);

    const source = field.type === "autocomplete" ? getAutocompleteComparableValue(value) : value;
    const converted = toFieldValue(field, source);

    if (converted === undefined) return null;
    if (typeof converted === "string" && converted.trim() === "") return null;
    return converted;
}

/**
 * Canonical JSON-safe form of a repeater value: blank items removed, keys in
 * config order, empty strings as null. This is what gets stored.
 */
export function serializeRepeaterValue(field: AnyRepeater, value: unknown): RepeaterItem[] {
    if (!Array.isArray(value)) return [];

    const subFields = resolveRepeaterFields(field);

    return value
        .filter((item): item is RepeaterItem => !isBlankItem(subFields, item))
        .map((item) => {
            const out: RepeaterItem = {};
            for (const sub of subFields) {
                const key = String(sub.key);
                out[key] = serializeFieldValue(sub, item[key] ?? getFieldDefaultValue(sub));
            }
            return out;
        });
}

/**
 * Replaces repeater values with their stored form; other values are untouched.
 */
export function serializeRepeaterFields<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(fields: readonly FieldConfig<R, RI>[], values: Record<string, unknown>): Record<string, unknown> {
    const out = { ...values };

    for (const field of fields) {
        if (field.type !== "repeater" || field.readOnly) continue;

        const key = String(field.key);
        out[key] = serializeRepeaterValue(field as unknown as AnyRepeater, values[key]);
    }

    return out;
}

/**
 * Compares two repeater values by what would be stored.
 */
export function repeaterValuesEqual(field: AnyRepeater, a: unknown, b: unknown): boolean {
    return (
        JSON.stringify(serializeRepeaterValue(field, a)) ===
        JSON.stringify(serializeRepeaterValue(field, b))
    );
}

function formatSummaryValue(field: AnyField, value: unknown): string {
    if (field.type === "repeater") return formatRepeaterSummary(field, value);
    if (field.type === "boolean") return value === true ? field.label : "";
    return String(getAutocompleteComparableValue(value) ?? "");
}

/**
 * One-line summary for grid cells and exports, e.g. "Ann / ann@x.com, Bob / bob@x.com".
 */
export function formatRepeaterSummary(field: AnyRepeater, value: unknown): string {
    const subFields = resolveRepeaterFields(field);

    return serializeRepeaterValue(field, value)
        .map((item) =>
            subFields
                .map((sub) => formatSummaryValue(sub, item[String(sub.key)]))
                .filter((part) => part !== "")
                .join(" / "),
        )
        .filter((part) => part !== "")
        .join(", ");
}
