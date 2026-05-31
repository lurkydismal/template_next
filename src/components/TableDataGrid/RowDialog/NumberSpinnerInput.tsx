import { useState, useEffect, ChangeEvent } from "react";
import {
    Box,
    IconButton,
    InputAdornment,
    TextField,
    Typography,
} from "@mui/material";
import {
    Control,
    Controller,
    FieldError,
    RegisterOptions,
    useWatch,
} from "react-hook-form";

const SPINNER_STEP = 1;

type NumberSpinnerInputProps = {
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
 * Calculates the next numeric spinner value from the current draft value and requested step direction.
 */
function getNextSpinnerValue(value: string, direction: 1 | -1): number {
    return (toNullableNumber(value) ?? 0) + SPINNER_STEP * direction;
}

/**
 * Renders a numeric field with dedicated increment and decrement controls.
 */
export default function NumberSpinnerInput({
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
}: NumberSpinnerInputProps) {
    const [draftValue, setDraftValue] = useState<string>(
        value === null || value === undefined ? "" : String(value),
    );
    const controllerValue = useWatch({ control, name });

    // Keep local draft display aligned with external and RHF-controlled values.
    useEffect(() => {
        const normalized =
            controllerValue === undefined
                ? toNullableNumber(value)
                : toNullableNumber(controllerValue);

        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraftValue(normalized === null ? "" : String(normalized));
    }, [controllerValue, value]);

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
                render={({ field }) => {
                    /**
                     * Commits a spinner button change to both local state and React Hook Form.
                     */
                    const handleSpinnerChange = (direction: 1 | -1) => {
                        if (readOnly) return;

                        const nextValue = getNextSpinnerValue(
                            draftValue,
                            direction,
                        );

                        setDraftValue(String(nextValue));
                        field.onChange(nextValue);
                        onValueChange(nextValue);
                    };

                    return (
                        <TextField
                            {...field}
                            required={required}
                            slotProps={{
                                htmlInput: { readOnly },
                                input: {
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <Box
                                                sx={{
                                                    display: "flex",
                                                    flexDirection: "column",
                                                }}
                                                aria-label={`${label} spinner controls`}
                                            >
                                                <IconButton
                                                    aria-label={`Increase ${label}`}
                                                    disabled={readOnly}
                                                    edge="end"
                                                    size="small"
                                                    tabIndex={-1}
                                                    onClick={() =>
                                                        handleSpinnerChange(1)
                                                    }
                                                >
                                                    +
                                                </IconButton>
                                                <IconButton
                                                    aria-label={`Decrease ${label}`}
                                                    disabled={readOnly}
                                                    edge="end"
                                                    size="small"
                                                    tabIndex={-1}
                                                    onClick={() =>
                                                        handleSpinnerChange(-1)
                                                    }
                                                >
                                                    −
                                                </IconButton>
                                            </Box>
                                        </InputAdornment>
                                    ),
                                },
                            }}
                            id={`${fieldKey}-number-spinner`}
                            type="number"
                            value={draftValue}
                            onChange={(e: ChangeEvent<HTMLInputElement>) => {
                                if (readOnly) return;

                                setDraftValue(e.target.value);
                                field.onChange(toNullableNumber(e.target.value));
                            }}
                            onBlur={() => {
                                const normalized = toNullableNumber(draftValue);
                                field.onChange(normalized);
                                onValueChange(normalized);
                                setDraftValue(
                                    normalized === null
                                        ? ""
                                        : String(normalized),
                                );
                            }}
                            error={!!error}
                            helperText={error?.message}
                            fullWidth
                        />
                    );
                }}
            />
        </div>
    );
}
