import { useMemo } from "react";
import { FieldError, get, useFormState, UseFormReturn } from "react-hook-form";

import AutocompleteFieldInput from "../../AutocompleteFieldInput";
import BooleanFieldInput from "../../BooleanFieldInput";
import CustomFieldInput from "../../CustomFieldInput";
import DateTimeFieldInput from "../../DateTimeFieldInput";
import MarkdownFieldInput from "../../MarkdownFieldInput";
import NumberSpinnerInput from "../../NumberSpinnerInput";
import RadioGroupFieldInput from "../../RadioGroupFieldInput";
import RepeaterFieldInput from "../../RepeaterFieldInput";
import { MultilineFieldInput, TextFieldInput } from "../../TextFieldInput";
import { FieldConfig, RepeaterFieldConfig, RepeaterItem } from "../../types";
import { isFieldReadOnly } from "../interconnected";
import { FieldRuleScope, getFieldRules } from "../validation";
import {
    getFilteredAutocompleteOptions,
    getPackedValuesFromAutocomplete,
} from "./autocompleteUtils";
import { FieldChangeOptions } from "./types";

type AnyRepeaterConfig = RepeaterFieldConfig<Record<string, unknown>, Record<string, unknown>>;

type FieldInputProps<R extends Record<string, unknown>, RI extends Record<string, unknown>> = {
    field: FieldConfig<R, RI>;
    /** Form path of the value: the field name, or "list.0.title" inside a repeater. */
    name: string;
    value: unknown;
    /** Values of the fields next to this one (the row, or the repeater entry). */
    values: Record<string, unknown>;
    /** The fields next to this one. */
    fields: readonly FieldConfig<R, RI>[];
    form: UseFormReturn<Record<string, unknown>>;
    row: R;
    /** Set for fields inside a repeater entry. */
    scope?: FieldRuleScope | undefined;
    depth?: number;
    onChange: (
        value: unknown,
        packedValues?: Record<string, unknown>,
        options?: FieldChangeOptions,
    ) => void;
};

/**
 * Renders the input for one field at any nesting level. Top-level fields and
 * fields inside repeater entries share this code; only `name`, `scope` and the
 * change handler differ.
 */
export default function FieldInput<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>({
    field,
    name,
    value,
    values,
    fields,
    form,
    row,
    scope,
    depth = 0,
    onChange,
}: FieldInputProps<R, RI>) {
    const key = String(field.key);
    const readOnly = isFieldReadOnly(field);
    const { errors } = useFormState({
        control: form.control,
        name,
        exact: true,
    });
    const error = get(errors, name) as FieldError | undefined;

    // Validation reads current values from RHF at validation time, so the
    // rules object does not need to be recreated after every field change.
    const rules = useMemo(
        () => getFieldRules(field, fields, form, row, scope),
        [field, fields, form, row, scope],
    );

    // Inside repeater entries, "required" is enforced in the rules (blank
    // entries are exempt), so the native required attribute must stay off.
    const inputRequired = scope === undefined && !!field.required;
    const label = scope !== undefined && field.required ? `${field.label} *` : field.label;

    const commonProps = {
        // Top-level ids stay keyed by the field key; nested inputs need the full path to be unique.
        fieldKey: scope === undefined ? key : name,
        label,
        name,
        required: inputRequired,
        readOnly,
        value,
        control: form.control,
        error,
        rules,
    };

    if (field.type === "custom" && typeof field.render === "function") {
        return (
            <CustomFieldInput
                field={field}
                value={value}
                row={row}
                onValueChange={(nextValue) => onChange(nextValue)}
            />
        );
    }

    switch (field.type) {
        case "multiline":
            return (
                <MultilineFieldInput {...commonProps} onValueChange={(next) => onChange(next)} />
            );

        case "markdown":
            return (
                <MarkdownFieldInput
                    {...commonProps}
                    toggleCorner={field.toggleCorner}
                    onValueChange={(next) => onChange(next)}
                />
            );

        case "autocomplete":
            return (
                <AutocompleteFieldInput
                    {...commonProps}
                    options={getFilteredAutocompleteOptions(field, values)}
                    loading={field.autocompleteLoading}
                    open={field.autocompleteOpen}
                    onOpen={field.onAutocompleteOpen}
                    onClose={field.onAutocompleteClose}
                    onValueChange={(next) => onChange(next, getPackedValuesFromAutocomplete(next))}
                />
            );

        case "boolean":
            return (
                <BooleanFieldInput
                    {...commonProps}
                    variant={field.variant}
                    color={field.color}
                    size={field.scale}
                    icon={field.variant === "icon" ? field.icon : undefined}
                    checkedIcon={field.variant === "icon" ? field.checkedIcon : undefined}
                    onValueChange={(next) => onChange(next)}
                />
            );

        case "radio-group":
            return (
                <RadioGroupFieldInput
                    {...commonProps}
                    options={field.options}
                    row={field.row}
                    color={field.color}
                    size={field.scale}
                    defaultValue={field.default}
                    onValueChange={(next) => onChange(next)}
                />
            );

        case "number":
            return (
                <NumberSpinnerInput
                    {...commonProps}
                    min={field.min}
                    max={field.max}
                    onValueChange={(next) => onChange(next)}
                />
            );

        case "date":
        case "time":
        case "datetime":
            return (
                <DateTimeFieldInput
                    {...commonProps}
                    type={field.type}
                    onValueChange={(next) => onChange(next)}
                />
            );

        case "repeater":
            return (
                <RepeaterFieldInput
                    field={field as unknown as AnyRepeaterConfig}
                    name={name}
                    label={field.required ? `${field.label} *` : field.label}
                    readOnly={readOnly}
                    value={value}
                    form={form}
                    rules={rules}
                    depth={depth}
                    onValueChange={(next) => onChange(next, undefined, { validate: false })}
                    renderSubField={(params) => (
                        <FieldInput<RepeaterItem, RepeaterItem>
                            field={params.field}
                            name={params.name}
                            value={params.value}
                            values={params.values}
                            fields={params.fields}
                            form={form}
                            row={row as unknown as RepeaterItem}
                            scope={params.scope}
                            depth={params.depth}
                            onChange={params.onChange}
                        />
                    )}
                />
            );

        default:
            return <TextFieldInput {...commonProps} onValueChange={(next) => onChange(next)} />;
    }
}
