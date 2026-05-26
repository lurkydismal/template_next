import {
    FieldError,
    FieldErrors,
    RegisterOptions,
    UseFormReturn,
} from "react-hook-form";
import { FieldConfig } from "../types";
import { AutocompleteOption } from "../types";
import CustomFieldInput from "../CustomFieldInput";
import MarkdownFieldInput from "../MarkdownFieldInput";
import MultilineFieldInput from "../MultilineFieldInput";
import AutocompleteFieldInput from "../AutocompleteFieldInput";
import DateTimeFieldInput from "../DateTimeFieldInput";
import NumberFieldInput from "../NumberFieldInput";
import TextFieldInput from "../TextFieldInput";
import { isFieldReadOnly } from "./interconnected";

type RenderFieldParams<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
> = {
    field: FieldConfig<R, RI>;
    idx: number;
    row: R;
    values: Record<string, unknown>;
    form: UseFormReturn<Record<string, unknown>>;
    getRules: (
        field: FieldConfig<R, RI>,
    ) => RegisterOptions<Record<string, unknown>, string>;
    handleFieldValueChange: (
        field: FieldConfig<R, RI>,
        value: unknown,
        packedValues?: Record<string, unknown>,
    ) => void;
};

/**
 * Returns the primitive value used to compare two autocomplete options.
 */
const getAutocompleteComparableValue = (value: unknown): unknown => {
    if (value && typeof value === "object" && "label" in value) {
        return (value as { label?: unknown }).label;
    }

    return value;
};

/**
 * Filters autocomplete options by removing values currently selected by sibling fields.
 */
const getFilteredAutocompleteOptions = <
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
            .filter((value) => value !== null && value !== undefined),
    );

    return options.filter((option) => {
        const optionComparableValue = getAutocompleteComparableValue(option);
        if (optionComparableValue === currentComparableValue) return true;
        return !excludedValues.has(optionComparableValue);
    }) as readonly AutocompleteOption[];
};

/**
 * Renders field.
 */
export const renderField = <
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>({
    field,
    idx,
    row,
    values,
    form,
    getRules,
    handleFieldValueChange,
}: RenderFieldParams<R, RI>) => {
    const key = String(field.key);
    const name = field.name ?? key;
    const value = values[key];
    const readOnly = isFieldReadOnly(field);
    const error = (
        form.formState.errors as FieldErrors<Record<string, unknown>>
    )[name] as FieldError | undefined;
    const rules = getRules(field);

    if (typeof field.render === "function") {
        return (
            <CustomFieldInput
                key={`${key}-${idx}`}
                field={field}
                value={value}
                row={row}
                onValueChange={(nextValue) =>
                    handleFieldValueChange(field, nextValue)
                }
            />
        );
    }

    if (field.type === "multiline") {
        return (
            <MultilineFieldInput
                key={`${key}-${idx}`}
                fieldKey={key}
                label={field.label}
                name={name}
                required={!!field.required}
                readOnly={readOnly}
                value={value}
                onValueChange={(nextValue) =>
                    handleFieldValueChange(field, nextValue)
                }
                control={form.control}
                error={error}
                rules={rules}
            />
        );
    }
    if (field.type === "markdown") {
        return (
            <MarkdownFieldInput
                key={`${key}-${idx}`}
                fieldKey={key}
                label={field.label}
                name={name}
                required={!!field.required}
                readOnly={readOnly}
                value={value}
                toggleCorner={field.markdownToggleCorner}
                onValueChange={(nextValue) =>
                    handleFieldValueChange(field, nextValue)
                }
                control={form.control}
                error={error}
                rules={rules}
            />
        );
    }

    if (field.type === "autocomplete") {
        const filteredOptions = getFilteredAutocompleteOptions(field, values);

        return (
            <AutocompleteFieldInput
                key={`${key}-${idx}`}
                fieldKey={key}
                label={field.label}
                name={name}
                required={!!field.required}
                readOnly={readOnly}
                value={value}
                options={filteredOptions}
                loading={field.autocompleteLoading}
                open={field.autocompleteOpen}
                onOpen={field.onAutocompleteOpen}
                onClose={field.onAutocompleteClose}
                onValueChange={(nextValue) => {
                    const packedValues =
                        nextValue &&
                        typeof nextValue === "object" &&
                        "packedValues" in nextValue &&
                        nextValue.packedValues &&
                        typeof nextValue.packedValues === "object"
                            ? (nextValue.packedValues as Record<
                                  string,
                                  unknown
                              >)
                            : {};

                    handleFieldValueChange(field, nextValue, packedValues);
                }}
                control={form.control}
                error={error}
                rules={rules}
            />
        );
    }

    if (field.type === "number") {
        return (
            <NumberFieldInput
                key={`${key}-${idx}`}
                fieldKey={key}
                label={field.label}
                name={name}
                required={!!field.required}
                readOnly={readOnly}
                value={value}
                onValueChange={(nextValue) =>
                    handleFieldValueChange(field, nextValue)
                }
                control={form.control}
                error={error}
                rules={rules}
            />
        );
    }

    if (
        field.type === "date" ||
        field.type === "time" ||
        field.type === "datetime"
    ) {
        return (
            <DateTimeFieldInput
                key={`${key}-${idx}`}
                fieldKey={key}
                label={field.label}
                name={name}
                required={!!field.required}
                readOnly={readOnly}
                type={field.type}
                value={value}
                onValueChange={(nextValue) =>
                    handleFieldValueChange(field, nextValue)
                }
                control={form.control}
                error={error}
                rules={rules}
            />
        );
    }

    return (
        <TextFieldInput
            key={`${key}-${idx}`}
            fieldKey={key}
            label={field.label}
            name={name}
            required={!!field.required}
            readOnly={readOnly}
            value={value}
            onValueChange={(nextValue) =>
                handleFieldValueChange(field, nextValue)
            }
            control={form.control}
            error={error}
            rules={rules}
        />
    );
};
