import { TextField, Typography } from "@mui/material";
import { ChangeEvent } from "react";

import { RHFController } from "@/components/rhf";

import type { RHFRowFieldControlProps } from "./types";

type FieldInputProps = RHFRowFieldControlProps & {
    fieldKey: string;
    label: string;
    required: boolean;
    readOnly?: boolean;
    onValueChange: (value: string) => void;
};

type BaseFieldInputProps = FieldInputProps & {
    idSuffix: string;
    extraTextFieldProps?: Partial<React.ComponentProps<typeof TextField>>;
};

/**
 * Shared field input implementation.
 */
function BaseFieldInput({
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
    idSuffix,
    extraTextFieldProps,
}: BaseFieldInputProps) {
    return (
        <div>
            <Typography variant="subtitle1" color="text.secondary">
                {label}
            </Typography>
            <RHFController
                name={name}
                control={control}
                defaultValue={value ?? ""}
                rules={rules ?? {}}
                disabled={readOnly}
                render={({ field }) => (
                    <TextField
                        {...field}
                        {...extraTextFieldProps}
                        required={required}
                        slotProps={{ htmlInput: { readOnly } }}
                        id={`${fieldKey}-${idSuffix}`}
                        value={field.value ?? ""}
                        onChange={(e: ChangeEvent<HTMLInputElement>) => {
                            if (readOnly) return;

                            field.onChange(e.target.value);
                            onValueChange(e.target.value);
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

/**
 * Renders the text field input component.
 */
export function TextFieldInput(props: FieldInputProps) {
    return <BaseFieldInput {...props} idSuffix="text" />;
}

/**
 * Renders the multiline field input component.
 */
export function MultilineFieldInput(props: FieldInputProps) {
    return (
        <BaseFieldInput
            {...props}
            idSuffix="text"
            extraTextFieldProps={{
                multiline: true,
                minRows: 4,
                maxRows: 8,
            }}
        />
    );
}
