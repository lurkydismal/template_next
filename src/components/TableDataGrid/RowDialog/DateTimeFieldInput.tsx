import dayjs, { Dayjs } from "dayjs";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { TimePicker } from "@mui/x-date-pickers/TimePicker";
import { Typography } from "@mui/material";
import {
    Control,
    Controller,
    FieldError,
    RegisterOptions,
} from "react-hook-form";

type PickerInputValue = string | number | Date | Dayjs | null | undefined;

type DateTimeFieldInputProps = {
    fieldKey: string;
    label: string;
    name: string;
    required: boolean;
    readOnly?: boolean;
    type: "date" | "time" | "datetime";
    value: unknown;
    control: Control<Record<string, unknown>>;
    error?: FieldError;
    rules?: RegisterOptions<Record<string, unknown>, string>;
    onValueChange: (value: string | null) => void;
};

/**
 * Renders the date time field input component.
 */
export default function DateTimeFieldInput({
    fieldKey,
    label,
    name,
    required,
    readOnly = false,
    type,
    value,
    control,
    error,
    rules,
    onValueChange,
}: DateTimeFieldInputProps) {
    /**
     * Handles change.
     */
    const handleChange = (nextValue: Dayjs | null) => {
        if (readOnly) return;

        if (!nextValue || !nextValue.isValid()) {
            onValueChange(null);
            return;
        }

        if (type === "date") {
            onValueChange(nextValue.format("YYYY-MM-DD"));
            return;
        }

        if (type === "time") {
            onValueChange(nextValue.format("HH:mm:ss"));
            return;
        }

        onValueChange(nextValue.toISOString());
    };

    return (
        <div>
            <Typography variant="subtitle1" color="text.secondary">
                {label}
            </Typography>

            {type === "date" && (
                <Controller
                    name={name}
                    control={control}
                    defaultValue={value ?? null}
                    rules={rules}
                    render={({ field }) => (
                        <DatePicker
                            readOnly={readOnly}
                            value={
                                field.value
                                    ? dayjs(field.value as PickerInputValue)
                                    : null
                            }
                            onChange={(next) => {
                                handleChange(next);
                                if (readOnly) return;

                                field.onChange(
                                    next?.isValid()
                                        ? next.format("YYYY-MM-DD")
                                        : null,
                                );
                            }}
                            slotProps={{
                                textField: {
                                    id: `${fieldKey}-date`,
                                    name,
                                    required,
                                    slotProps: { htmlInput: { readOnly } },
                                    fullWidth: true,
                                    error: !!error,
                                    helperText: error?.message,
                                },
                            }}
                        />
                    )}
                />
            )}

            {type === "time" && (
                <Controller
                    name={name}
                    control={control}
                    defaultValue={value ?? null}
                    rules={rules}
                    render={({ field }) => (
                        <TimePicker
                            readOnly={readOnly}
                            value={
                                field.value
                                    ? dayjs(
                                          field.value as PickerInputValue,
                                          "HH:mm:ss",
                                      )
                                    : null
                            }
                            onChange={(next) => {
                                handleChange(next);
                                if (readOnly) return;

                                field.onChange(
                                    next?.isValid()
                                        ? next.format("HH:mm:ss")
                                        : null,
                                );
                            }}
                            slotProps={{
                                textField: {
                                    id: `${fieldKey}-time`,
                                    name,
                                    required,
                                    slotProps: { htmlInput: { readOnly } },
                                    fullWidth: true,
                                    error: !!error,
                                    helperText: error?.message,
                                },
                            }}
                        />
                    )}
                />
            )}

            {type === "datetime" && (
                <Controller
                    name={name}
                    control={control}
                    defaultValue={value ?? null}
                    rules={rules}
                    render={({ field }) => (
                        <DateTimePicker
                            readOnly={readOnly}
                            value={
                                field.value
                                    ? dayjs(field.value as PickerInputValue)
                                    : null
                            }
                            onChange={(next) => {
                                handleChange(next);
                                if (readOnly) return;

                                field.onChange(
                                    next?.isValid() ? next.toISOString() : null,
                                );
                            }}
                            slotProps={{
                                textField: {
                                    id: `${fieldKey}-datetime`,
                                    name,
                                    required,
                                    slotProps: { htmlInput: { readOnly } },
                                    fullWidth: true,
                                    error: !!error,
                                    helperText: error?.message,
                                },
                            }}
                        />
                    )}
                />
            )}
        </div>
    );
}
