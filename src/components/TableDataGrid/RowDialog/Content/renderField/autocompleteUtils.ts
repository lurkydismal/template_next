import { AutocompleteOption, FieldConfig } from "../types";

/**
 * Converts an autocomplete value into a stable primitive used for comparisons.
 */
export const getAutocompleteComparableValue = (value: unknown): unknown => {
    if (value && typeof value === "object" && "label" in value) {
        return (value as { label?: unknown }).label;
    }

    return value;
};

/**
 * Removes mutually exclusive autocomplete options already selected by sibling fields.
 */
export const getFilteredAutocompleteOptions = <
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(
    field: FieldConfig<R, RI>,
    values: Record<string, unknown>,
): readonly AutocompleteOption[] => {
    const options = field.autocompleteOptions ?? [];
    const excludedFieldKeys = field.mutuallyExclusiveWith ?? [];

    if (excludedFieldKeys.length === 0) return options;

    const currentComparableValue = getAutocompleteComparableValue(
        values[String(field.key)],
    );

    const excludedValues = new Set<unknown>(
        excludedFieldKeys
            .map((excludedFieldKey) =>
                getAutocompleteComparableValue(values[excludedFieldKey]),
            )
            .filter(
                (optionValue) =>
                    optionValue !== null && optionValue !== undefined,
            ),
    );

    return options.filter((option) => {
        const optionComparableValue = getAutocompleteComparableValue(option);
        if (optionComparableValue === currentComparableValue) return true;
        return !excludedValues.has(optionComparableValue);
    }) as readonly AutocompleteOption[];
};

/**
 * Extracts packed field values sent by autocomplete options for interconnected updates.
 */
export const getPackedValuesFromAutocomplete = (
    nextValue: unknown,
): Record<string, unknown> | undefined => {
    if (
        nextValue &&
        typeof nextValue === "object" &&
        "packedValues" in nextValue &&
        nextValue.packedValues &&
        typeof nextValue.packedValues === "object"
    ) {
        return nextValue.packedValues as Record<string, unknown>;
    }

    return undefined;
};
