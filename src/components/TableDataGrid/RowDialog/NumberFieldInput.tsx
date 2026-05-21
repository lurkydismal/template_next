import { useState, ChangeEvent } from "react";
import { TextField as NumberField, Typography } from "@mui/material";
import {
    Control,
    Controller,
    FieldError,
    RegisterOptions,
} from "react-hook-form";

type NumberFieldInputProps = {
    fieldKey: string;
    label: string;
    name: string;
    required: boolean;
    readOnly?: boolean;
    value: unknown;
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
 * Renders a numeric field by using MUI's TextField configured with number semantics.
 */
export default function NumberFieldInput({
    fieldKey,
    label,
    name,
    required,
    readOnly = false,
    value,
    control,
    error,
    rules,
    onValueChange,
}: NumberFieldInputProps) {
    const [draftValue, setDraftValue] = useState<string>(
        value === null || value === undefined ? "" : String(value),
    );

    return (
        <div>
            <Typography variant="subtitle1" color="text.secondary">
                {label}
            </Typography>
            <Controller
                name={name}
                control={control}
                defaultValue={toNullableNumber(value)}
                rules={rules}
                disabled={readOnly}
                render={({ field }) => (
                    <NumberField
                        {...field}
                        required={required}
                        slotProps={{ htmlInput: { readOnly } }}
                        id={`${fieldKey}-number`}
                        type="number"
                        value={draftValue}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            if (readOnly) return;

                            setDraftValue(e.target.value);
                        }}
                        onBlur={() => {
                            const normalized = toNullableNumber(draftValue);
                            field.onChange(normalized);
                            onValueChange(normalized);
                            setDraftValue(
                                normalized === null ? "" : String(normalized),
                            );
                        }}
                        error={!!error}
                        helperText={error?.message}
                        fullWidth
                    />
                )}
            />
        </div>
    );
}
