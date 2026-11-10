import type { CheckboxProps, SwitchProps } from "@mui/material";
import type { ChangeEvent, MouseEvent, ReactNode } from "react";

import { Checkbox, Switch } from "@mui/material";

export type BooleanControlVariant = "checkbox" | "icon" | "switch";

export type BooleanFieldControlProps = {
    label: string;
    checked: boolean;
    variant: BooleanControlVariant;
    /** Prevents interaction without applying MUI's disabled visual treatment. */
    readOnly?: boolean;
    /** Applies MUI's disabled state and visual treatment. */
    disabled?: boolean;
    color?: CheckboxProps["color"] | SwitchProps["color"];
    size?: CheckboxProps["size"] | SwitchProps["size"];
    icon?: ReactNode;
    checkedIcon?: ReactNode;
    id?: string;
    name?: string;
    onChange?: (checked: boolean) => void;
};

/**
 * Shared visual control for boolean fields. Dialog fields can be editable or
 * visually disabled, while grid cells use readOnly to retain normal colors
 * without allowing pointer or keyboard interaction.
 */
export default function BooleanFieldControl({
    label,
    checked,
    variant,
    readOnly = false,
    disabled = false,
    color,
    size,
    icon,
    checkedIcon,
    id,
    name,
    onChange,
}: BooleanFieldControlProps) {
    const interactive = !readOnly && !disabled && !!onChange;

    const inputProps = {
        ...(id ? { id } : {}),
        "aria-label": label,
        "aria-readonly": readOnly && !disabled ? true : undefined,
        tabIndex: interactive ? undefined : -1,
    };

    // Keep the controlled value fixed even if the underlying input is
    // activated programmatically. The grid uses pointerEvents below so clicks
    // pass through to the cell instead of activating this control.
    const handleReadOnlyChange = (event: ChangeEvent<HTMLInputElement>) => {
        event.preventDefault();
    };
    const handleReadOnlyClick = (event: MouseEvent<HTMLElement>) => {
        if (!interactive) event.preventDefault();
    };

    const nonInteractiveSx = interactive ? undefined : { pointerEvents: "none" as const };

    if (variant === "switch") {
        return (
            <Switch
                name={name}
                checked={checked}
                color={color as SwitchProps["color"]}
                size={size as SwitchProps["size"]}
                disabled={disabled}
                onChange={
                    interactive && onChange
                        ? (_, nextChecked) => onChange(nextChecked)
                        : handleReadOnlyChange
                }
                onClick={handleReadOnlyClick}
                sx={nonInteractiveSx}
                slotProps={{ input: inputProps }}
            />
        );
    }

    return (
        <Checkbox
            name={name}
            checked={checked}
            color={color as CheckboxProps["color"]}
            size={size as CheckboxProps["size"]}
            disabled={disabled}
            icon={variant === "icon" ? icon : undefined}
            checkedIcon={variant === "icon" ? checkedIcon : undefined}
            onChange={
                interactive && onChange
                    ? (event) => onChange(event.target.checked)
                    : handleReadOnlyChange
            }
            onClick={handleReadOnlyClick}
            sx={nonInteractiveSx}
            slotProps={{ input: inputProps }}
        />
    );
}
