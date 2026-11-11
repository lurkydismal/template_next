import { isBlob } from "@/utils/stdfunc";

import { FieldConfig } from "../types";
import { toFieldValue } from "./fieldValues";
import { serializeRepeaterValue } from "./repeater";

/**
 * Appends an editable field value to the form payload expected by update actions.
 */
function setFormDataField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    fd: FormData,
    field: FieldConfig<R, RI>,
    sourceValues: Partial<RI>,
) {
    const key = String(field.key);
    const name = field.name ?? key;

    // Form controls may use a presentation-specific name. Send the canonical
    // schema property key to the server, where it is checked against Drizzle.
    if (name !== key) fd.delete(name);

    if (field.type === "repeater") {
        // Inputs inside a repeater are native controls named after their nested
        // form paths ("list.0.title"). They are not columns, so drop them and
        // send the whole list as one JSON value below.
        for (const entryName of [...fd.keys()]) {
            if (entryName.startsWith(`${name}.`) || entryName.startsWith(`${key}.`)) {
                fd.delete(entryName);
            }
        }
    }

    if (field.readOnly && !field.interconnected) {
        fd.delete(key);
        return;
    }

    const value = toFieldValue(
        field as FieldConfig<Record<string, unknown>, Record<string, unknown>>,
        (sourceValues as Record<string, unknown>)[key],
    );

    if (field.toFormValue) {
        const mappedValue = field.toFormValue(value);
        if (mappedValue !== undefined) {
            fd.set(key, mappedValue);
        } else {
            fd.delete(key);
        }
    } else if (field.type === "repeater") {
        fd.set(
            key,
            JSON.stringify(
                serializeRepeaterValue(
                    field as unknown as Parameters<typeof serializeRepeaterValue>[0],
                    value,
                ),
            ),
        );
    } else if (value === null || value === undefined) {
        // Always overwrite a possible native form-control value (for example,
        // "on" from an unchecked/partially initialized checkbox).
        fd.set(key, "");
    } else if (isBlob(value)) {
        fd.set(key, value);
    } else if (field.type === "radio-group") {
        // FormData is string-only. JSON encoding preserves numeric option values
        // instead of converting them to strings before the JSONB column parser.
        fd.set(key, JSON.stringify(value));
    } else {
        fd.set(key, String(value));
    }
}

/**
 * Builds the update form payload from the currently edited row values.
 */
export function buildUpdateFormData<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(form: HTMLFormElement | null, fields: FieldConfig<R, RI>[], values: Partial<RI>) {
    const fd = new FormData(form ?? undefined);

    for (const field of fields) {
        setFormDataField(fd, field, values);
    }

    return fd;
}
