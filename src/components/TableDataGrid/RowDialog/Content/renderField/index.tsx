import { Grid } from "@mui/material";
import { memo, useCallback } from "react";

import FieldInput from "./FieldInput";
import { FieldChangeOptions, RenderFieldParams } from "./types";

/**
 * Renders one row field and its grid item. Memoization prevents edits to an
 * unrelated field from re-rendering this input.
 */
function RowDialogField<R extends Record<string, unknown>, RI extends Record<string, unknown>>({
    field,
    row,
    values,
    form,
    fields,
    handleFieldValueChange,
}: RenderFieldParams<R, RI>) {
    const key = String(field.key);
    const name = field.name ?? key;

    const handleChange = useCallback(
        (
            nextValue: unknown,
            packedValues?: Record<string, unknown>,
            options?: FieldChangeOptions,
        ) => {
            handleFieldValueChange(field, nextValue, packedValues, options);
        },
        [field, handleFieldValueChange],
    );

    return (
        <Grid size={{ xs: 12, sm: field.size ?? (field.type === "repeater" ? 12 : 6) }}>
            <FieldInput
                field={field}
                name={name}
                value={values[key]}
                values={values}
                fields={fields}
                form={form}
                row={row}
                onChange={handleChange}
            />
        </Grid>
    );
}

/**
 * The values object changes on every edit, but most fields only depend on
 * their own value. Autocomplete fields additionally depend on the selected
 * values of their mutually-exclusive siblings.
 */
function areFieldPropsEqual<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    previous: RenderFieldParams<R, RI>,
    next: RenderFieldParams<R, RI>,
): boolean {
    if (
        previous.field !== next.field ||
        previous.idx !== next.idx ||
        previous.row !== next.row ||
        previous.fields !== next.fields ||
        previous.form !== next.form ||
        previous.handleFieldValueChange !== next.handleFieldValueChange
    ) {
        return false;
    }

    const key = String(previous.field.key);
    if (!Object.is(previous.values[key], next.values[key])) return false;

    if (previous.field.type !== "autocomplete") return true;

    return (previous.field.mutuallyExclusiveWith ?? []).every((siblingKey) =>
        Object.is(previous.values[siblingKey], next.values[siblingKey]),
    );
}

const MemoizedRowDialogField = memo(RowDialogField, areFieldPropsEqual) as typeof RowDialogField;

/**
 * Creates the memoized field element used by the row dialog form.
 */
export function renderField<R extends Record<string, unknown>, RI extends Record<string, unknown>>(
    params: RenderFieldParams<R, RI>,
) {
    return <MemoizedRowDialogField<R, RI> {...params} />;
}
