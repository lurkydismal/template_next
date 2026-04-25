"use client";

import {
    TextField,
    OutlinedInput,
    RadioGroup,
    FormControlLabel,
    Radio,
    Checkbox,
    TextFieldProps,
} from "@mui/material";
import { Controller, useFormContext, FieldValues, Path } from "react-hook-form";
import { ReactNode } from "react";

/* =========================
   RHF TextField
========================= */

type RHFTextFieldProps<T extends FieldValues> = TextFieldProps & {
    name: Path<T>;
};

export function RHFTextField<T extends FieldValues>({
    name,
    ...props
}: RHFTextFieldProps<T>) {
    const { control } = useFormContext<T>();

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <TextField
                    {...field}
                    {...props}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                />
            )}
        />
    );
}

/* =========================
   RHF OutlinedInput
========================= */

type RHFOutlinedInputProps<T extends FieldValues> = {
    name: Path<T>;
    placeholder?: string;
    autoComplete?: string;
    size?: "small" | "medium";
};

export function RHFOutlinedInput<T extends FieldValues>({
    name,
    ...props
}: RHFOutlinedInputProps<T>) {
    const { control } = useFormContext<T>();

    return (
        <Controller
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <OutlinedInput
                    {...field}
                    {...props}
                    error={!!fieldState.error}
                />
            )}
        />
    );
}

/* =========================
   RHF Radio Group
========================= */

type RHFRadioGroupProps<T extends FieldValues> = {
    name: Path<T>;
    options: string[];
    getLabel?: (value: string) => ReactNode;
    row?: boolean;
};

export function RHFRadioGroup<T extends FieldValues>({
    name,
    options,
    getLabel,
    row = false,
}: RHFRadioGroupProps<T>) {
    const { control } = useFormContext<T>();

    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <RadioGroup {...field} row={row}>
                    {options.map((value) => (
                        <FormControlLabel
                            key={value}
                            value={value}
                            control={<Radio />}
                            label={getLabel ? getLabel(value) : value}
                        />
                    ))}
                </RadioGroup>
            )}
        />
    );
}

/* =========================
   RHF Checkbox
========================= */

type RHFCheckboxProps<T extends FieldValues> = {
    name: Path<T>;
    label: string;
};

export function RHFCheckbox<T extends FieldValues>({
    name,
    label,
}: RHFCheckboxProps<T>) {
    const { control } = useFormContext<T>();

    return (
        <Controller
            name={name}
            control={control}
            render={({ field }) => (
                <FormControlLabel
                    control={
                        <Checkbox
                            checked={!!field.value}
                            onChange={(e) => field.onChange(e.target.checked)}
                        />
                    }
                    label={label}
                />
            )}
        />
    );
}
