import AutocompleteWithHighlight from "@/components/Autocomplete";
import { CircularProgress, TextField, Typography } from "@mui/material";
import {
    Control,
    Controller,
    FieldError,
    RegisterOptions,
} from "react-hook-form";
import { AutocompleteOption } from "./types";

type AutocompleteFieldInputProps = {
    fieldKey: string;
    label: string;
    name: string;
    required: boolean;
    readOnly?: boolean;
    value: unknown;
    options: readonly AutocompleteOption[];
    loading?: boolean;
    control: Control<Record<string, unknown>>;
    error?: FieldError;
    rules?: RegisterOptions<Record<string, unknown>, string>;
    open?: boolean;
    onOpen?: () => void;
    onClose?: () => void;
    onValueChange: (value: AutocompleteOption | null) => void;
};

/**
 * Renders the autocomplete field input component.
 */
export default function AutocompleteFieldInput({
    fieldKey,
    label,
    name,
    required,
    readOnly = false,
    value,
    options,
    loading = false,
    control,
    error,
    rules,
    open,
    onOpen,
    onClose,
    onValueChange,
}: AutocompleteFieldInputProps) {
    return (
        <div>
            <Typography variant="subtitle1" color="text.secondary">
                {label}
            </Typography>
            <Controller
                name={name}
                control={control}
                defaultValue={value ?? null}
                rules={rules}
                render={({ field }) => (
                    <AutocompleteWithHighlight
                        value={field.value ?? null}
                        options={options}
                        open={open}
                        onOpen={onOpen}
                        onClose={onClose}
                        loading={loading}
                        readOnly={readOnly}
                        onChange={(_, nextValue) => {
                            if (readOnly) return;

                            const mapped =
                                nextValue as AutocompleteOption | null;
                            field.onChange(mapped);
                            onValueChange(mapped);
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                name={name}
                                id={`${fieldKey}-autocomplete`}
                                required={required}
                                placeholder={label}
                                error={!!error}
                                helperText={error?.message}
                                slotProps={{
                                    ...params.slotProps,
                                    htmlInput: {
                                        ...params.slotProps.htmlInput,
                                        readOnly,
                                    },
                                    input: {
                                        ...params.slotProps.input,
                                        endAdornment: (
                                            <>
                                                {loading ? (
                                                    <CircularProgress
                                                        color="inherit"
                                                        size={20}
                                                    />
                                                ) : null}
                                                {
                                                    params.slotProps.input
                                                        .endAdornment
                                                }
                                            </>
                                        ),
                                    },
                                }}
                                fullWidth
                            />
                        )}
                        fullWidth
                    />
                )}
            />
        </div>
    );
}
