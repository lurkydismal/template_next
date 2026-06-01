import { FieldError, FieldErrors } from "react-hook-form";
import CustomFieldInput from "../../CustomFieldInput";
import MarkdownFieldInput from "../../MarkdownFieldInput";
import MultilineFieldInput from "../../MultilineFieldInput";
import AutocompleteFieldInput from "../../AutocompleteFieldInput";
import DateTimeFieldInput from "../../DateTimeFieldInput";
import NumberSpinnerInput from "../../NumberSpinnerInput";
import TextFieldInput from "../../TextFieldInput";
import FileFieldInput from "../../FileFieldInput";
import { isFieldReadOnly } from "../interconnected";
import {
    getFilteredAutocompleteOptions,
    getPackedValuesFromAutocomplete,
} from "./autocompleteUtils";
import { RenderFieldParams } from "./types";

/**
 * Renders a field input based on the configured field type and behavior.
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
                        getPackedValuesFromAutocomplete(nextValue);

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
            <NumberSpinnerInput
                key={`${key}-${idx}`}
                fieldKey={key}
                label={field.label}
                name={name}
                required={!!field.required}
                readOnly={readOnly}
                value={value}
                min={field.min}
                max={field.max}
                onValueChange={(nextValue) =>
                    handleFieldValueChange(field, nextValue)
                }
                control={form.control}
                error={error}
                rules={rules}
            />
        );
    }

    if (field.type === "file") {
        return (
            <FileFieldInput
                key={`${key}-${idx}`}
                fieldKey={key}
                label={field.label}
                name={name}
                required={!!field.required}
                readOnly={readOnly}
                value={value}
                accept={field.fileAccept}
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
