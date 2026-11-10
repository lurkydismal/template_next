import type { CheckboxProps, SwitchProps } from "@mui/material";
import type { ReactNode } from "react";

import { FormControl, FormControlLabel, FormHelperText } from "@mui/material";
import { Controller, type Control, type FieldError, type RegisterOptions } from "react-hook-form";

import BooleanFieldControl, { type BooleanControlVariant } from "./BooleanFieldControl";

type BooleanFieldInputProps = {
    fieldKey: string;
    label: string;
    name: string;
    required: boolean;
    readOnly?: boolean;
    value: unknown;
    control: Control<Record<string, unknown>>;
    error?: FieldError;
    rules?: RegisterOptions<Record<string, unknown>, string>;
    variant: BooleanControlVariant;
    color?: CheckboxProps["color"] | SwitchProps["color"];
    size?: CheckboxProps["size"] | SwitchProps["size"];
    icon?: ReactNode;
    checkedIcon?: ReactNode;
    onValueChange: (value: boolean) => void;
};

/**
 * Renders a controlled boolean field using a checkbox, icon checkbox, or switch.
 */
export default function BooleanFieldInput({
    fieldKey,
    label,
    name,
    required,
    readOnly = false,
    value,
    control,
    error,
    rules,
    variant,
    color,
    size,
    icon,
    checkedIcon,
    onValueChange,
}: BooleanFieldInputProps) {
    return (
        <FormControl error={!!error} required={required} disabled={readOnly} component="fieldset">
            <Controller
                name={name}
                control={control}
                defaultValue={value ?? false}
                rules={rules ?? {}}
                disabled={readOnly}
                render={({ field }) => {
                    const checked = field.value === true;
                    const handleChange = (nextChecked: boolean) => {
                        if (readOnly) return;

                        field.onChange(nextChecked);
                        onValueChange(nextChecked);
                    };

                    const controlElement = (
                        <BooleanFieldControl
                            label={label}
                            name={name}
                            checked={checked}
                            variant={variant}
                            readOnly={readOnly}
                            disabled={readOnly}
                            color={color}
                            size={size}
                            icon={icon}
                            checkedIcon={checkedIcon}
                            id={`${fieldKey}-${variant === "switch" ? "switch" : "checkbox"}`}
                            onChange={handleChange}
                        />
                    );

                    return (
                        <>
                            <FormControlLabel
                                control={controlElement}
                                label={label}
                                required={required}
                                disabled={readOnly}
                            />
                            {error?.message && <FormHelperText>{error.message}</FormHelperText>}
                        </>
                    );
                }}
            />
        </FormControl>
    );
}
