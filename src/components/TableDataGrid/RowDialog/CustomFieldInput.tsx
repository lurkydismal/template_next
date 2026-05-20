import { Typography } from "@mui/material";
import { FieldConfig } from "./types";

type CustomFieldInputProps<R, RI> = {
    field: FieldConfig<R, RI>;
    value: unknown;
    row: R;
    onValueChange: (value: unknown) => void;
};

/**
 * Renders the custom field input component.
 */
export default function CustomFieldInput<R, RI>({
    field,
    value,
    row,
    onValueChange,
}: CustomFieldInputProps<R, RI>) {
    return (
        <div>
            <Typography variant="subtitle1" color="text.secondary">
                {field.label}
            </Typography>
            {field.render?.(value, onValueChange, row)}
        </div>
    );
}
