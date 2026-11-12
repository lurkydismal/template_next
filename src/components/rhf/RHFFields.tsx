"use client";

import type { CheckboxProps, FormControlLabelProps, TextFieldProps } from "@mui/material";
import type { ReactNode } from "react";

import { Checkbox, FormControlLabel, TextField } from "@mui/material";

import type { RHFFieldPath, RHFFieldValues } from "./types";

import { RHFController } from "./RHFController";
import { useRHFFormContext } from "./RHFForm";

type RHFTextFieldProps<T extends RHFFieldValues> = Omit<
    TextFieldProps,
    "name" | "value" | "defaultValue" | "onChange" | "onBlur" | "error" | "helperText" | "inputRef"
> & {
    name: RHFFieldPath<T>;
};

/** A MUI TextField bound to the current RHF form context. */
export function RHFTextField<T extends RHFFieldValues>({ name, ...props }: RHFTextFieldProps<T>) {
    const { control } = useRHFFormContext<T>();

    return (
        <RHFController
            name={name}
            control={control}
            render={({ field, fieldState }) => (
                <TextField
                    {...props}
                    name={field.name}
                    value={field.value ?? ""}
                    onChange={field.onChange}
                    onBlur={field.onBlur}
                    inputRef={field.ref}
                    error={!!fieldState.error}
                    helperText={fieldState.error?.message}
                    color={fieldState.error ? "error" : props.color}
                />
            )}
        />
    );
}

type RHFCheckboxProps<T extends RHFFieldValues> = {
    name: RHFFieldPath<T>;
    label: ReactNode;
    checkboxProps?: Omit<CheckboxProps, "checked" | "defaultChecked" | "onChange">;
    labelProps?: Omit<FormControlLabelProps, "control" | "label">;
};

/** An MUI Checkbox bound to the current RHF form context. */
export function RHFCheckbox<T extends RHFFieldValues>({
    name,
    label,
    checkboxProps,
    labelProps,
}: RHFCheckboxProps<T>) {
    const { control } = useRHFFormContext<T>();

    return (
        <RHFController
            name={name}
            control={control}
            render={({ field }) => (
                <FormControlLabel
                    {...labelProps}
                    label={label}
                    control={
                        <Checkbox
                            {...checkboxProps}
                            name={field.name}
                            checked={Boolean(field.value)}
                            onChange={(event) => field.onChange(event.target.checked)}
                            onBlur={field.onBlur}
                            slotProps={{
                                ...checkboxProps?.slotProps,
                                input: {
                                    ...(checkboxProps?.slotProps?.input as object | undefined),
                                    ref: field.ref,
                                },
                            }}
                        />
                    }
                />
            )}
        />
    );
}
