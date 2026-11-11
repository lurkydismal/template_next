import { isBlob } from "@/utils/stdfunc";

import type { FieldConfig } from "../types";

import { toFieldValue } from "./helpers";

function setMappedFieldValue(
    formData: FormData,
    fieldKey: string,
    field: FieldConfig<Record<string, unknown>, Record<string, unknown>>,
    value: unknown,
): boolean {
    if (!field.toFormValue) return false;

    const mappedValue = field.toFormValue(value);
    if (mappedValue === undefined) {
        formData.delete(fieldKey);
    } else {
        formData.set(fieldKey, mappedValue);
    }

    return true;
}

function setDefaultFieldValue(
    formData: FormData,
    fieldKey: string,
    field: FieldConfig<Record<string, unknown>, Record<string, unknown>>,
    value: unknown,
): void {
    if (value === null || value === undefined) {
        // Replace possible native form-control values such as "on" for unchecked checkboxes.
        formData.set(fieldKey, "");
        return;
    }

    if (isBlob(value)) {
        formData.set(fieldKey, value);
        return;
    }

    if (field.type === "radio-group") {
        // Preserve numeric JSONB options instead of coercing them to strings.
        formData.set(fieldKey, JSON.stringify(value));
        return;
    }

    formData.set(fieldKey, String(value));
}

/** Appends an editable field value to the update payload expected by server actions. */
function setFormDataField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    formData: FormData,
    field: FieldConfig<R, RI>,
    sourceValues: Partial<RI>,
): void {
    const key = String(field.key);
    const name = field.name ?? key;

    if (name !== key) formData.delete(name);
    if (field.readOnly && !field.interconnected) {
        formData.delete(key);
        return;
    }

    const value = toFieldValue(
        field as FieldConfig<Record<string, unknown>, Record<string, unknown>>,
        (sourceValues as Record<string, unknown>)[key],
    );

    if (
        setMappedFieldValue(
            formData,
            key,
            field as FieldConfig<Record<string, unknown>, Record<string, unknown>>,
            value,
        )
    ) {
        return;
    }

    setDefaultFieldValue(
        formData,
        key,
        field as FieldConfig<Record<string, unknown>, Record<string, unknown>>,
        value,
    );
}

/** Builds the update form payload from the currently edited row values. */
export function buildUpdateFormData<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(form: HTMLFormElement | null, fields: FieldConfig<R, RI>[], values: Partial<RI>): FormData {
    const formData = new FormData(form ?? undefined);
    for (const field of fields) setFormDataField(formData, field, values);
    return formData;
}
