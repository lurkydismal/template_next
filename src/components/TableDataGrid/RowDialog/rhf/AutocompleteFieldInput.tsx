import { CircularProgress, TextField, Typography } from "@mui/material";

import AutocompleteWithHighlight from "@/components/Autocomplete";
import { RHFController } from "@/components/rhf";

import type { AutocompleteOption } from "../types";
import type { RHFRowFieldControlProps } from "./types";

type AutocompleteFieldInputProps = RHFRowFieldControlProps & {
    fieldKey: string;
    label: string;
    required: boolean;
    readOnly?: boolean;
    options: readonly AutocompleteOption[];
    loading?: boolean | undefined;
    open?: boolean | undefined;
    onOpen?: (() => void) | undefined;
    onClose?: (() => void) | undefined;
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
            <RHFController
                name={name}
                control={control}
                defaultValue={value ?? null}
                rules={rules ?? {}}
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

                            const mapped = nextValue as AutocompleteOption | null;
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
                                                    <CircularProgress color="inherit" size={20} />
                                                ) : null}
                                                {params.slotProps.input.endAdornment}
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
