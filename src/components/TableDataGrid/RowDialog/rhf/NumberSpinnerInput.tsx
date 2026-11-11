import { RHFController } from "@/components/rhf";

import type { RHFRowFieldControlProps } from "./types";

import NumberSpinner from "../NumberSpinner";

type NumberSpinnerInputProps = RHFRowFieldControlProps & {
    fieldKey: string;
    label: string;
    required: boolean;
    readOnly?: boolean;
    min?: number | undefined;
    max?: number | undefined;
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
        <RHFController
            name={name}
            control={control}
            defaultValue={toNullableNumber(value)}
            rules={rules ?? {}}
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
