import { FieldConfig } from "../types";
import { buildFieldInitialValue } from "./repeater";

export { toFieldValue } from "./fieldValues";

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
        out[key] = buildFieldInitialValue(
            field as unknown as FieldConfig<Record<string, unknown>, Record<string, unknown>>,
            (row as Record<string, unknown>)[key],
        );
    }

    return out;
};
