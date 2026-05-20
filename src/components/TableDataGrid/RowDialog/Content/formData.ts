import { isBlob } from "@/utils/stdfunc";
import { FieldConfig } from "../types";
import { toFieldValue } from "./helpers";

/**
 * Appends an editable field value to the form payload expected by update actions.
 */
function setFormDataField<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(fd: FormData, field: FieldConfig<R, RI>, sourceValues: Partial<RI>) {
    const name = field.name ?? String(field.key);
    if (field.readOnly) {
        fd.delete(name);
        return;
    }
    const key = String(field.key);
    const value = toFieldValue(
        field as FieldConfig<Record<string, unknown>, Record<string, unknown>>,
        (sourceValues as Record<string, unknown>)[key],
    );

    if (field.toFormValue) {
        const mappedValue = field.toFormValue(value);
        if (mappedValue !== undefined) fd.set(name, mappedValue);
    } else if (value === null || value === undefined) {
        if (!fd.has(name)) fd.set(name, "");
    } else if (isBlob(value)) {
        fd.set(name, value);
    } else {
        fd.set(name, String(value));
    }
}

/**
 * Builds the update form payload from the currently edited row values.
 */
export function buildUpdateFormData<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(
    form: HTMLFormElement | null,
    fields: FieldConfig<R, RI>[],
    values: Partial<RI>,
) {
    const fd = new FormData(form ?? undefined);

    for (const field of fields) {
        setFormDataField(fd, field, values);
    }

    return fd;
}
