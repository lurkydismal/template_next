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

type ControlBehavior = {
    interactive: boolean;
    inputProps: {
        id?: string;
        "aria-label": string;
        "aria-readonly": true | undefined;
        tabIndex: number | undefined;
    };
    sx: { pointerEvents: "none" } | undefined;
};

function getControlBehavior(props: BooleanFieldControlProps): ControlBehavior {
    const interactive = !props.readOnly && !props.disabled && Boolean(props.onChange);
    return {
        interactive,
        inputProps: {
            ...(props.id ? { id: props.id } : {}),
            "aria-label": props.label,
            "aria-readonly": props.readOnly && !props.disabled ? true : undefined,
            tabIndex: interactive ? undefined : -1,
        },
        sx: interactive ? undefined : { pointerEvents: "none" },
    };
}

function preventReadOnlyChange(event: ChangeEvent<HTMLInputElement>) {
    event.preventDefault();
}

function preventNonInteractiveClick(interactive: boolean) {
    return (event: MouseEvent<HTMLElement>) => {
        if (!interactive) event.preventDefault();
    };
}

function SwitchFieldControl(props: BooleanFieldControlProps) {
    const behavior = getControlBehavior(props);
    const handleChange: SwitchProps["onChange"] = behavior.interactive
        ? (_, checked) => props.onChange?.(checked)
        : preventReadOnlyChange;

    return (
        <Switch
            name={props.name}
            checked={props.checked}
            color={props.color as SwitchProps["color"]}
            size={props.size as SwitchProps["size"]}
            disabled={props.disabled}
            onChange={handleChange}
            onClick={preventNonInteractiveClick(behavior.interactive)}
            sx={behavior.sx}
            slotProps={{ input: behavior.inputProps }}
        />
    );
}

function CheckboxFieldControl(props: BooleanFieldControlProps) {
    const behavior = getControlBehavior(props);
    const handleChange: CheckboxProps["onChange"] = behavior.interactive
        ? (event) => props.onChange?.(event.target.checked)
        : preventReadOnlyChange;
    const isIcon = props.variant === "icon";

    return (
        <Checkbox
            name={props.name}
            checked={props.checked}
            color={props.color as CheckboxProps["color"]}
            size={props.size as CheckboxProps["size"]}
            disabled={props.disabled}
            icon={isIcon ? props.icon : undefined}
            checkedIcon={isIcon ? props.checkedIcon : undefined}
            onChange={handleChange}
            onClick={preventNonInteractiveClick(behavior.interactive)}
            sx={behavior.sx}
            slotProps={{ input: behavior.inputProps }}
        />
    );
}

/** Shared visual control for boolean fields. */
export default function BooleanFieldControl(props: BooleanFieldControlProps) {
    return props.variant === "switch" ? (
        <SwitchFieldControl {...props} />
    ) : (
        <CheckboxFieldControl {...props} />
    );
}
