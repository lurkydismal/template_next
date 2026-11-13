import { Grid } from "@mui/material";
import { type ComponentType, memo, useCallback, useMemo } from "react";
import { FieldError, useFormState } from "react-hook-form";

import AutocompleteFieldInput from "../../AutocompleteFieldInput";
import BooleanFieldInput from "../../BooleanFieldInput";
import CustomFieldInput from "../../CustomFieldInput";
import DateTimeFieldInput from "../../DateTimeFieldInput";
import MarkdownFieldInput from "../../MarkdownFieldInput";
import NumberSpinnerInput from "../../NumberSpinnerInput";
import RadioGroupFieldInput from "../../RadioGroupFieldInput";
import { MultilineFieldInput, TextFieldInput } from "../../TextFieldInput";
import { isFieldReadOnly } from "../interconnected";
import { getFieldRules } from "../validation";
import {
    getFilteredAutocompleteOptions,
    getPackedValuesFromAutocomplete,
} from "./autocompleteUtils";
import { RenderFieldParams } from "./types";

/**
 * Renders one row field and its grid item. Memoization prevents edits to an
 * unrelated field from re-rendering this input.
 */
function RowDialogField<R extends Record<string, unknown>, RI extends Record<string, unknown>>({
    field,
    idx,
    row,
    values,
    form,
    fields,
    handleFieldValueChange,
}: RenderFieldParams<R, RI>) {
    const key = String(field.key);
    const name = key;
    const value = values[key];
    const readOnly = isFieldReadOnly(field);
    const { errors } = useFormState({
        control: form.control,
        name,
        exact: true,
    });
    const error = errors[name] as FieldError | undefined;

    // Validation reads current values from RHF at validation time, so the
    // rules object does not need to be recreated after every field change.
    const rules = useMemo(
        () => getFieldRules(field, fields, form, row),
        [field, fields, form, row],
    );

    const handleChange = useCallback(
        (nextValue: unknown, packedValues?: Record<string, unknown>) => {
            handleFieldValueChange(field, nextValue, packedValues);
        },
        [field, handleFieldValueChange],
    );

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

    let input: React.ReactNode;

    if (field.type === "custom" && typeof field.render === "function") {
        input = (
            <CustomFieldInput
                field={field}
                value={value}
                row={row}
                onValueChange={(nextValue) => handleChange(nextValue)}
            />
        );
    } else {
        switch (field.type) {
            case "multiline":
                input = (
                    <MultilineFieldInput
                        {...commonProps}
                        onValueChange={(nextValue) => handleChange(nextValue)}
                    />
                );
                break;

            case "markdown":
                input = (
                    <MarkdownFieldInput
                        {...commonProps}
                        toggleCorner={field.toggleCorner}
                        onValueChange={(nextValue) => handleChange(nextValue)}
                    />
                );
                break;

            case "autocomplete": {
                const filteredOptions = getFilteredAutocompleteOptions(field, values);

                input = (
                    <AutocompleteFieldInput
                        {...commonProps}
                        options={filteredOptions}
                        loading={field.autocompleteLoading}
                        open={field.autocompleteOpen}
                        onOpen={field.onAutocompleteOpen}
                        onClose={field.onAutocompleteClose}
                        onValueChange={(nextValue) =>
                            handleChange(nextValue, getPackedValuesFromAutocomplete(nextValue))
                        }
                    />
                );
                break;
            }

            case "boolean":
                input = (
                    <BooleanFieldInput
                        {...commonProps}
                        variant={field.variant}
                        color={field.color}
                        size={field.scale}
                        icon={field.variant === "icon" ? field.icon : undefined}
                        checkedIcon={field.variant === "icon" ? field.checkedIcon : undefined}
                        onValueChange={handleChange}
                    />
                );
                break;

            case "radio-group":
                input = (
                    <RadioGroupFieldInput
                        {...commonProps}
                        options={field.options}
                        row={field.row}
                        color={field.color}
                        size={field.scale}
                        defaultValue={field.default}
                        onValueChange={handleChange}
                    />
                );
                break;

            case "number":
                input = (
                    <NumberSpinnerInput
                        {...commonProps}
                        min={field.min}
                        max={field.max}
                        onValueChange={(nextValue) => handleChange(nextValue)}
                    />
                );
                break;

            case "date":
            case "time":
            case "datetime":
                input = (
                    <DateTimeFieldInput
                        {...commonProps}
                        type={field.type}
                        onValueChange={(nextValue) => handleChange(nextValue)}
                    />
                );
                break;

            default:
                input = (
                    <TextFieldInput
                        {...commonProps}
                        onValueChange={(nextValue) => handleChange(nextValue)}
                    />
                );
        }
    }

    return <Grid size={{ xs: 12, sm: field.size ?? 6 }}>{input}</Grid>;
}

/**
 * The values object changes on every edit, but most fields only depend on
 * their own value. Autocomplete fields additionally depend on the selected
 * values of their mutually-exclusive siblings.
 */
function areFieldPropsEqual<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    previous: RenderFieldParams<R, RI>,
    next: RenderFieldParams<R, RI>,
): boolean {
    if (
        previous.field !== next.field ||
        previous.idx !== next.idx ||
        previous.row !== next.row ||
        previous.fields !== next.fields ||
        previous.form !== next.form ||
        previous.handleFieldValueChange !== next.handleFieldValueChange
    ) {
        return false;
    }

    const key = String(previous.field.key);
    if (!Object.is(previous.values[key], next.values[key])) return false;

    if (previous.field.type !== "autocomplete") return true;

    return (previous.field.mutuallyExclusiveWith ?? []).every((siblingKey) =>
        Object.is(previous.values[siblingKey], next.values[siblingKey]),
    );
}

const MemoizedRowDialogField = memo(RowDialogField, areFieldPropsEqual) as typeof RowDialogField;

/**
 * Creates the memoized field element used by the row dialog form.
 */
export function renderField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    params: RenderFieldParams<R, RI>,
) {
    // memo() erases the generics; restore them so R/RI are not collapsed to R.
    const Field = MemoizedRowDialogField as unknown as ComponentType<RenderFieldParams<R, RI>>;
    return <Field {...params} />;
}
