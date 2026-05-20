import { FieldConfig } from "../types";

/**
 * Checks whether any editable row field differs from its original row value.
 */
export function rowHasChanges<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(row: R, values: Partial<RI>, fields: FieldConfig<R, RI>[]) {
    return fields.some((field) => {
        if (field.readOnly) return false;

        const key = String(field.key);
        const rowVal = (row as Record<string, unknown>)[key];
        const newVal = (values as Record<string, unknown>)[key];

        if (typeof field.isChanged === "function") {
            return field.isChanged(rowVal, newVal);
        }

        return (
            String((rowVal ?? "").toString()).trim() !==
            String((newVal ?? "").toString()).trim()
        );
    });
}

/**
 * Checks whether the row has a persisted identifier value.
 */
export function rowHasId<R extends Record<string, unknown>>(
    row: R,
    idKey: keyof R,
) {
    return ((row as Record<string, unknown>)[String(idKey)] ?? null) !== null;
}
