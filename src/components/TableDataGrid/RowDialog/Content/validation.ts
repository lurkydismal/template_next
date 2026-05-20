import { RegisterOptions, UseFormReturn } from "react-hook-form";
import { FieldConfig } from "../types";

/**
 * Builds react-hook-form rules for an editable row dialog field.
 */
export function getFieldRules<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(
    field: FieldConfig<R, RI>,
    fields: FieldConfig<R, RI>[],
    form: UseFormReturn<Record<string, unknown>>,
    row: R,
    values: Record<string, unknown>,
): RegisterOptions<Record<string, unknown>, string> {
    if (field.readOnly) return {};

    return {
        required: field.required ? `${field.label} is required` : false,
        validate: async (value) => {
            const allValues = form.getValues();
            const groupError = validateRequiredGroup(
                field,
                fields,
                allValues,
                values,
            );

            if (groupError) return groupError;
            if (field.validate) {
                return (await field.validate(value, row, allValues)) ?? true;
            }

            return true;
        },
    };
}

/**
 * Validates a grouped requirement for fields where at least N values are needed.
 */
function validateRequiredGroup<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(
    field: FieldConfig<R, RI>,
    fields: FieldConfig<R, RI>[],
    allValues: Record<string, unknown>,
    values: Record<string, unknown>,
) {
    if (!field.requiredGroup) return null;

    const minCount = field.requiredGroupMin ?? 1;
    const groupFields = fields.filter(
        (candidate) => candidate.requiredGroup === field.requiredGroup,
    );
    const providedCount = groupFields.reduce((count, candidate) => {
        const candidateValue =
            allValues[String(candidate.key)] ?? values[String(candidate.key)];
        const isProvided =
            candidateValue !== null &&
            candidateValue !== undefined &&
            String(candidateValue).trim() !== "";

        return count + (isProvided ? 1 : 0);
    }, 0);

    if (providedCount < minCount) {
        return `Enter at least ${minCount} of: ${groupFields
            .map((candidate) => candidate.label)
            .join(", ")}`;
    }

    return null;
}
