import {
    Control,
    Controller,
    FieldError,
    RegisterOptions,
} from "react-hook-form";
import NumberSpinner from "./NumberSpinner";

type NumberSpinnerInputProps = {
    fieldKey: string;
    label: string;
    name: string;
    required: boolean;
    readOnly?: boolean;
    value: unknown;
    min?: number;
    max?: number;
    control: Control<Record<string, unknown>>;
    error?: FieldError;
    rules?: RegisterOptions<Record<string, unknown>, string>;
    onValueChange: (value: number | null) => void;
};

/**
 * Converts field input values to nullable finite numbers.
 */
function toNullableNumber(value: unknown): number | null {
    if (value === "" || value === null || value === undefined) return null;
    if (typeof value === "string" && value.trim() === "") return null;

    const numericValue = Number(value);
    return Number.isFinite(numericValue) ? numericValue : null;
}

/**
 * Renders the row dialog number input as a form-controlled NumberSpinner.
 */
export default function NumberSpinnerInput({
    fieldKey,
    label,
    name,
    required,
    readOnly = false,
    value,
    min,
    max,
    control,
    error,
    rules,
    onValueChange,
}: NumberSpinnerInputProps) {
    return (
        <Controller
            name={name}
            control={control}
            defaultValue={toNullableNumber(value)}
            rules={rules}
            disabled={readOnly}
            render={({ field }) => {
                const numericValue = toNullableNumber(field.value);

                return (
                    <NumberSpinner
                        id={`${fieldKey}-number-spinner`}
                        name={field.name}
                        label={label}
                        required={required}
                        readOnly={readOnly}
                        disabled={field.disabled}
                        value={numericValue}
                        min={min}
                        max={max}
                        error={!!error}
                        helperText={error?.message}
                        inputRef={field.ref}
                        onValueChange={(nextValue) => {
                            field.onChange(nextValue);
                        }}
                        onValueCommitted={(nextValue) => {
                            field.onBlur();
                            onValueChange(nextValue);
                        }}
                    />
                );
            }}
        />
    );
}
