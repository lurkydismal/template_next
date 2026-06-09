import { FieldError, FieldErrors } from "react-hook-form";
import CustomFieldInput from "../../CustomFieldInput";
import MarkdownFieldInput from "../../MarkdownFieldInput";
import AutocompleteFieldInput from "../../AutocompleteFieldInput";
import DateTimeFieldInput from "../../DateTimeFieldInput";
import NumberSpinnerInput from "../../NumberSpinnerInput";
import { MultilineFieldInput, TextFieldInput } from "../../TextFieldInput";
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
    getFileAction,
    width,
    height,
}: RenderFieldParams<R, RI>) => {
    const key = String(field.key);
    const name = field.name ?? key;
    const value = values[key];
    const readOnly = isFieldReadOnly(field);
    const error = (
        form.formState.errors as FieldErrors<Record<string, unknown>>
    )[name] as FieldError | undefined;
    const rules = getRules(field);

    const handleChange = (
        nextValue: unknown,
        packedValues?: Record<string, unknown>,
    ) => {
        handleFieldValueChange(field, nextValue, packedValues);
    };

    const commonProps = {
        fieldKey: key,
        label: field.label,
        name,
        required: !!field.required,
        readOnly,
        value,
        control: form.control,
        error,
        rules,
    };

    if (field.type === "custom" && typeof field.render === "function") {
        return (
            <CustomFieldInput
                key={`${key}-${idx}`}
                field={field}
                value={value}
                row={row}
                onValueChange={(nextValue) => handleChange(nextValue)}
            />
        );
    }

    switch (field.type) {
        case "multiline":
            return (
                <MultilineFieldInput
                    {...commonProps}
                    key={`${key}-${idx}`}
                    onValueChange={(nextValue) => handleChange(nextValue)}
                />
            );

        case "markdown":
            return (
                <MarkdownFieldInput
                    {...commonProps}
                    key={`${key}-${idx}`}
                    toggleCorner={field.toggleCorner}
                    onValueChange={(nextValue) => handleChange(nextValue)}
                />
            );

        case "autocomplete": {
            const filteredOptions = getFilteredAutocompleteOptions(
                field,
                values,
            );

            return (
                <AutocompleteFieldInput
                    {...commonProps}
                    key={`${key}-${idx}`}
                    options={filteredOptions}
                    loading={field.autocompleteLoading}
                    open={field.autocompleteOpen}
                    onOpen={field.onAutocompleteOpen}
                    onClose={field.onAutocompleteClose}
                    onValueChange={(nextValue) =>
                        handleChange(
                            nextValue,
                            getPackedValuesFromAutocomplete(nextValue),
                        )
                    }
                />
            );
        }

        case "number":
            return (
                <NumberSpinnerInput
                    {...commonProps}
                    key={`${key}-${idx}`}
                    min={field.min}
                    max={field.max}
                    onValueChange={(nextValue) => handleChange(nextValue)}
                />
            );

        case "file":
            return (
                <FileFieldInput
                    {...commonProps}
                    key={`${key}-${idx}`}
                    accept={field.fileAccept}
                    onValueChange={(nextValue) => handleChange(nextValue)}
                    getFileAction={getFileAction}
                    width={width}
                    height={height}
                />
            );

        case "date":
        case "time":
        case "datetime":
            return (
                <DateTimeFieldInput
                    {...commonProps}
                    key={`${key}-${idx}`}
                    type={field.type}
                    onValueChange={(nextValue) => handleChange(nextValue)}
                />
            );

        default:
            return (
                <TextFieldInput
                    {...commonProps}
                    key={`${key}-${idx}`}
                    onValueChange={(nextValue) => handleChange(nextValue)}
                />
            );
    }
};
