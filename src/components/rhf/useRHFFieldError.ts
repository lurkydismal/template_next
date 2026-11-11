import type { Control, FieldError, FieldPath, FieldValues } from "react-hook-form";

import { useFormState } from "react-hook-form";

function getNestedFieldError<TFieldValues extends FieldValues>(
    errors: unknown,
    name: FieldPath<TFieldValues>,
): FieldError | undefined {
    let value: unknown = errors;

    for (const segment of name.split(".")) {
        if (value === null || typeof value !== "object") return undefined;
        value = (value as Record<string, unknown>)[segment];
    }

    return value as FieldError | undefined;
}

/**
 * Subscribes to validation state for one dynamically named field and returns its nested error.
 */
export function useRHFFieldError<TFieldValues extends FieldValues>(
    control: Control<TFieldValues>,
    name: string,
): FieldError | undefined {
    const fieldName = name as FieldPath<TFieldValues>;
    const { errors } = useFormState({ control, name: fieldName, exact: true });
    return getNestedFieldError(errors, fieldName);
}
