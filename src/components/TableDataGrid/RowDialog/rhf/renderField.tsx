import type { ComponentType, ReactNode } from "react";

import { Grid } from "@mui/material";
import { createElement, memo, useCallback, useMemo } from "react";

import { useRHFFieldError } from "@/components/rhf";

import type { FieldConfig } from "../types";
import type { RenderFieldParams, RHFRowFieldControlProps } from "./types";

import { isFieldReadOnly } from "../Content/interconnected";
import CustomFieldInput from "../CustomFieldInput";
import AutocompleteFieldInput from "./AutocompleteFieldInput";
import {
    getFilteredAutocompleteOptions,
    getPackedValuesFromAutocomplete,
} from "./autocompleteUtils";
import BooleanFieldInput from "./BooleanFieldInput";
import DateTimeFieldInput from "./DateTimeFieldInput";
import MarkdownFieldInput from "./MarkdownFieldInput";
import NumberSpinnerInput from "./NumberSpinnerInput";
import RadioGroupFieldInput from "./RadioGroupFieldInput";
import { MultilineFieldInput, TextFieldInput } from "./TextFieldInput";
import { getFieldRules } from "./validation";

type CommonFieldProps = RHFRowFieldControlProps & {
    fieldKey: string;
    label: string;
    required: boolean;
    readOnly: boolean;
};

type FieldRenderContext<R extends Record<string, unknown>, RI extends Record<string, unknown>> = {
    field: FieldConfig<R, RI>;
    row: R;
    values: Record<string, unknown>;
    value: unknown;
    commonProps: CommonFieldProps;
    handleChange: (value: unknown, packedValues?: Record<string, unknown>) => void;
};

function renderCustomField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    context: FieldRenderContext<R, RI>,
): ReactNode {
    const { field, row, value, handleChange } = context;
    if (field.type !== "custom" || typeof field.render !== "function") return null;

    return (
        <CustomFieldInput
            field={field}
            value={value}
            row={row}
            onValueChange={(nextValue) => handleChange(nextValue)}
        />
    );
}

function renderAutocompleteField<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(context: FieldRenderContext<R, RI>): ReactNode {
    const { field, values, commonProps, handleChange } = context;
    if (field.type !== "autocomplete") return null;

    return (
        <AutocompleteFieldInput
            {...commonProps}
            options={getFilteredAutocompleteOptions(field, values)}
            loading={field.autocompleteLoading}
            open={field.autocompleteOpen}
            onOpen={field.onAutocompleteOpen}
            onClose={field.onAutocompleteClose}
            onValueChange={(nextValue) =>
                handleChange(nextValue, getPackedValuesFromAutocomplete(nextValue))
            }
        />
    );
}

function renderBooleanField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    context: FieldRenderContext<R, RI>,
): ReactNode {
    const { field, commonProps, handleChange } = context;
    if (field.type !== "boolean") return null;

    return (
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
}

function renderRadioGroupField<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(context: FieldRenderContext<R, RI>): ReactNode {
    const { field, commonProps, handleChange } = context;
    if (field.type !== "radio-group") return null;

    return (
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
}

function renderDateTimeField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    context: FieldRenderContext<R, RI>,
): ReactNode {
    const { field, commonProps, handleChange } = context;
    if (field.type !== "date" && field.type !== "time" && field.type !== "datetime") {
        return null;
    }

    return <DateTimeFieldInput {...commonProps} type={field.type} onValueChange={handleChange} />;
}

function renderMarkdownField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    context: FieldRenderContext<R, RI>,
): ReactNode {
    const { field, commonProps, handleChange } = context;
    if (field.type !== "markdown") return null;

    return (
        <MarkdownFieldInput
            {...commonProps}
            toggleCorner={field.toggleCorner}
            onValueChange={handleChange}
        />
    );
}

function renderNumberField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    context: FieldRenderContext<R, RI>,
): ReactNode {
    const { field, commonProps, handleChange } = context;
    if (field.type !== "number") return null;

    return (
        <NumberSpinnerInput
            {...commonProps}
            min={field.min}
            max={field.max}
            onValueChange={handleChange}
        />
    );
}

function renderTextField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    context: FieldRenderContext<R, RI>,
): ReactNode {
    const { field, commonProps, handleChange } = context;
    const onValueChange = (nextValue: string) => handleChange(nextValue);

    return field.type === "multiline" ? (
        <MultilineFieldInput {...commonProps} onValueChange={onValueChange} />
    ) : (
        <TextFieldInput {...commonProps} onValueChange={onValueChange} />
    );
}

/** Resolves a field configuration to its matching RHF input component. */
function renderFieldInput<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    context: FieldRenderContext<R, RI>,
): ReactNode {
    if (context.field.type === "custom" && typeof context.field.render === "function") {
        return renderCustomField(context);
    }

    switch (context.field.type) {
        case "autocomplete":
            return renderAutocompleteField(context);
        case "boolean":
            return renderBooleanField(context);
        case "radio-group":
            return renderRadioGroupField(context);
        case "date":
        case "time":
        case "datetime":
            return renderDateTimeField(context);
        case "markdown":
            return renderMarkdownField(context);
        case "number":
            return renderNumberField(context);
        default:
            return renderTextField(context);
    }
}

/** Renders one row field and its grid item. */
function RowDialogField<R extends Record<string, unknown>, RI extends Record<string, unknown>>({
    field,
    row,
    values,
    form,
    fields,
    handleFieldValueChange,
}: RenderFieldParams<R, RI>) {
    const key = String(field.key);
    const name = field.name ?? key;
    const value = values[key];
    const readOnly = isFieldReadOnly(field);
    const error = useRHFFieldError(form.control, name);
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

    const context: FieldRenderContext<R, RI> = {
        field,
        row,
        values,
        value,
        commonProps: {
            fieldKey: key,
            label: field.label,
            name,
            required: !!field.required,
            readOnly,
            value,
            control: form.control,
            error,
            rules,
        },
        handleChange,
    };

    return <Grid size={{ xs: 12, sm: field.size ?? 6 }}>{renderFieldInput(context)}</Grid>;
}

function areFieldPropsEqual<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    previous: RenderFieldParams<R, RI>,
    next: RenderFieldParams<R, RI>,
): boolean {
    const sameStableProps =
        previous.field === next.field &&
        previous.row === next.row &&
        previous.fields === next.fields &&
        previous.form === next.form &&
        previous.handleFieldValueChange === next.handleFieldValueChange;

    if (!sameStableProps) return false;

    const key = String(previous.field.key);
    if (!Object.is(previous.values[key], next.values[key])) return false;
    if (previous.field.type !== "autocomplete") return true;

    return (previous.field.mutuallyExclusiveWith ?? []).every((siblingKey) =>
        Object.is(previous.values[siblingKey], next.values[siblingKey]),
    );
}

const MemoizedRowDialogField = memo(RowDialogField, areFieldPropsEqual);

/** Creates the memoized field element used by the row dialog form. */
export function renderField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    params: RenderFieldParams<R, RI>,
) {
    return createElement(
        MemoizedRowDialogField as unknown as ComponentType<RenderFieldParams<R, RI>>,
        params,
    );
}
