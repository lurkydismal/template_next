import {
    FieldError,
    FieldErrors,
    RegisterOptions,
    UseFormReturn,
} from "react-hook-form";
import { FieldConfig } from "../types";
import CustomFieldInput from "../CustomFieldInput";
import MultilineFieldInput from "../MultilineFieldInput";
import AutocompleteFieldInput from "../AutocompleteFieldInput";
import DateTimeFieldInput from "../DateTimeFieldInput";
import TextFieldInput from "../TextFieldInput";

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
                readOnly={!!field.readOnly}
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

    if (field.type === "autocomplete") {
        return (
            <AutocompleteFieldInput
                key={`${key}-${idx}`}
                fieldKey={key}
                label={field.label}
                name={name}
                required={!!field.required}
                readOnly={!!field.readOnly}
                value={value}
                options={field.autocompleteOptions ?? []}
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
                readOnly={!!field.readOnly}
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
            readOnly={!!field.readOnly}
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
