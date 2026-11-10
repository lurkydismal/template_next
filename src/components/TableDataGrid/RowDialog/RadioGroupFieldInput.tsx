import type { RadioProps } from "@mui/material";
import type { ReactNode } from "react";

import {
    FormControl,
    FormControlLabel,
    FormHelperText,
    FormLabel,
    Radio,
    RadioGroup,
} from "@mui/material";
import { Controller, type Control, type FieldError, type RegisterOptions } from "react-hook-form";

import type { RadioGroupOption } from "./types";

type RadioGroupFieldInputProps = {
    fieldKey: string;
    label: string;
    name: string;
    required: boolean;
    readOnly?: boolean;
    value: unknown;
    control: Control<Record<string, unknown>>;
    error?: FieldError;
    rules?: RegisterOptions<Record<string, unknown>, string>;
    options: readonly RadioGroupOption[];
    row?: boolean;
    color?: RadioProps["color"];
    size?: RadioProps["size"];
    defaultValue?: string | number;
    onValueChange: (value: string | number) => void;
};

function getOptionValue(option: RadioGroupOption): string | number {
    return typeof option === "object" ? option.value : option;
}

function getOptionLabel(option: RadioGroupOption): ReactNode {
    return typeof option === "object" ? option.label : String(option);
}

function isOptionDisabled(option: RadioGroupOption): boolean {
    return typeof option === "object" && !!option.disabled;
}

/**
 * Renders a controlled radio group while preserving numeric option values.
 */
export default function RadioGroupFieldInput({
    fieldKey,
    label,
    name,
    required,
    readOnly = false,
    value,
    control,
    error,
    rules,
    options,
    row = false,
    color,
    size,
    defaultValue,
    onValueChange,
}: RadioGroupFieldInputProps) {
    const labelId = `${fieldKey}-radio-group-label`;

    return (
        <FormControl component="fieldset" required={required} disabled={readOnly} error={!!error}>
            <FormLabel component="legend" id={labelId}>
                {label}
            </FormLabel>
            <Controller
                name={name}
                control={control}
                defaultValue={value ?? defaultValue ?? ""}
                rules={rules ?? {}}
                disabled={readOnly}
                render={({ field }) => (
                    <RadioGroup
                        name={name}
                        value={field.value == null ? "" : String(field.value)}
                        row={row}
                        aria-labelledby={labelId}
                        onChange={(_, rawValue) => {
                            if (readOnly) return;

                            const matchedOption = options.find(
                                (option) => String(getOptionValue(option)) === rawValue,
                            );
                            const nextValue = matchedOption
                                ? getOptionValue(matchedOption)
                                : rawValue;

                            field.onChange(nextValue);
                            onValueChange(nextValue);
                        }}
                    >
                        {options.map((option) => {
                            const optionValue = getOptionValue(option);

                            return (
                                <FormControlLabel
                                    key={String(optionValue)}
                                    value={String(optionValue)}
                                    label={getOptionLabel(option)}
                                    disabled={readOnly || isOptionDisabled(option)}
                                    control={<Radio color={color} size={size} />}
                                />
                            );
                        })}
                    </RadioGroup>
                )}
            />
            {error?.message && <FormHelperText>{error.message}</FormHelperText>}
        </FormControl>
    );
}
