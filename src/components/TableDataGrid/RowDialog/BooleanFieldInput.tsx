import type { CheckboxProps, SwitchProps } from "@mui/material";
import type { ReactNode } from "react";

import { Checkbox, FormControl, FormControlLabel, FormHelperText, Switch } from "@mui/material";
import { Controller, type Control, type FieldError, type RegisterOptions } from "react-hook-form";

type BooleanVariant = "checkbox" | "icon" | "switch";

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
    variant: BooleanVariant;
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

                    const controlElement =
                        variant === "switch" ? (
                            <Switch
                                name={name}
                                checked={checked}
                                color={color as SwitchProps["color"]}
                                size={size as SwitchProps["size"]}
                                disabled={readOnly}
                                onChange={(_, nextChecked) => handleChange(nextChecked)}
                                slotProps={{
                                    input: {
                                        id: `${fieldKey}-switch`,
                                        "aria-label": label,
                                    },
                                }}
                            />
                        ) : (
                            <Checkbox
                                name={name}
                                checked={checked}
                                color={color as CheckboxProps["color"]}
                                size={size as CheckboxProps["size"]}
                                disabled={readOnly}
                                icon={variant === "icon" ? icon : undefined}
                                checkedIcon={variant === "icon" ? checkedIcon : undefined}
                                onChange={(event) => handleChange(event.target.checked)}
                                slotProps={{
                                    input: {
                                        id: `${fieldKey}-checkbox`,
                                        "aria-label": label,
                                    },
                                }}
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
