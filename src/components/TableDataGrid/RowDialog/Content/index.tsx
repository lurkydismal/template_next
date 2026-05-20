import { useSnackbar } from "@/providers/snackbar";
import { Divider, Grid } from "@mui/material";
import { useCallback, useEffect, useRef, useState } from "react";
import { RegisterOptions, useForm } from "react-hook-form";
import { CreateRowAction, FieldConfig, UpdateRowAction } from "../types";
import { rowHasChanges, rowHasId } from "./changeDetection";
import { buildUpdateFormData } from "./formData";
import { buildInitialValues } from "./helpers";
import MetadataFields from "./MetadataFields";
import { renderField } from "./renderField";
import { getFieldRules } from "./validation";

type RowDialogContentProps<R, RI> = {
    row: R;
    fields: FieldConfig<R, RI>[];
    registerSubmit: (fn: (() => Promise<boolean>) | null) => void;
    createRowAction: CreateRowAction<RI>;
    updateRowAction: UpdateRowAction;
    onUpdated?: () => Promise<void> | void;
    idKey?: keyof R;
};

/**
 * Renders the row dialog content component.
 */
export default function RowDialogContent<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>({
    row,
    fields,
    registerSubmit,
    createRowAction,
    updateRowAction,
    onUpdated,
    idKey = "id" as keyof R,
}: RowDialogContentProps<R, RI>) {
    const { showError } = useSnackbar();
    const formRef = useRef<HTMLFormElement | null>(null);
    const form = useForm<Record<string, unknown>>({
        defaultValues: buildInitialValues(row, fields),
        mode: "onSubmit",
    });

    const [values, setValues] = useState<Record<string, unknown>>(
        buildInitialValues(row, fields),
    );

    useEffect(() => {
        const initialValues = buildInitialValues(row, fields);
        setValues(initialValues);
        form.reset(initialValues);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [row]);

    /**
     * Stores multiple field values in local row dialog state and optionally mirrors them to React Hook Form.
     */
    const setValuesAndForm = useCallback(
        (nextValues: Record<string, unknown>, shouldDirty = true) => {
            setValues((state) => ({ ...state, ...nextValues }));

            for (const [key, value] of Object.entries(nextValues)) {
                form.setValue(key, value, {
                    shouldDirty,
                    shouldValidate: shouldDirty,
                });
            }
        },
        [form],
    );

    /**
     * Runs a field value-change effect and applies any returned sibling field values.
     */
    const runFieldValueChange = useCallback(
        async (
            field: FieldConfig<R, RI>,
            value: unknown,
            nextValues: Record<string, unknown>,
            shouldDirty = true,
        ) => {
            if (!field.onValueChange) return;

            try {
                const changedValues = await field.onValueChange(value, {
                    row,
                    values: nextValues,
                });

                if (changedValues && typeof changedValues === "object") {
                    setValuesAndForm(changedValues, shouldDirty);
                }
            } catch (error) {
                showError(error);
            }
        },
        [row, setValuesAndForm, showError],
    );

    /**
     * Stores an edited value, then lets the field derive any dependent values.
     */
    const handleFieldValueChange = useCallback(
        (
            field: FieldConfig<R, RI>,
            value: unknown,
            packedValues: Record<string, unknown> = {},
        ) => {
            const key = String(field.key);
            const changedValues = { [key]: value, ...packedValues };
            const nextValues = { ...values, ...changedValues };

            setValuesAndForm(changedValues);
            void runFieldValueChange(field, value, nextValues);
        },
        [runFieldValueChange, setValuesAndForm, values],
    );

    const updateRow = useCallback(
        async (fd: FormData): Promise<boolean> => {
            try {
                await updateRowAction(fd);
                await onUpdated?.();
                return true;
            } catch (error) {
                showError(error);
                return false;
            }
        },
        [onUpdated, showError, updateRowAction],
    );

    const createRow = useCallback(
        async (valuesToCreate: Partial<RI>): Promise<boolean> => {
            try {
                await createRowAction(valuesToCreate as RI);
                await onUpdated?.();
                return true;
            } catch (error) {
                showError(error);
                return false;
            }
        },
        [createRowAction, onUpdated, showError],
    );

    const submit = useCallback(async (): Promise<boolean> => {
        const valid = await form.trigger();
        if (!valid) return false;

        const currentValues = form.getValues() as Partial<RI>;
        const hasId = rowHasId(row, idKey);

        if (hasId && !rowHasChanges(row, currentValues, fields)) {
            return true;
        }

        if (!hasId) {
            return await createRow(currentValues);
        }

        const fd = buildUpdateFormData(formRef.current, fields, currentValues);

        return await updateRow(fd);
    }, [createRow, fields, form, idKey, row, updateRow]);

    const getRules: (
        field: FieldConfig<R, RI>,
    ) => RegisterOptions<Record<string, unknown>, string> = useCallback(
        (field) => getFieldRules(field, fields, form, row, values),
        [fields, form, row, values],
    );

    useEffect(() => {
        registerSubmit(submit);
        return () => registerSubmit(null);
    }, [registerSubmit, submit]);

    const initialRunRef = useRef<string | null>(null);

    useEffect(() => {
        const rowKey = rowHasId(row, idKey)
            ? String((row as Record<string, unknown>)[String(idKey)])
            : "new";
        if (initialRunRef.current === rowKey) return;
        initialRunRef.current = rowKey;

        const initialValues = buildInitialValues(row, fields);

        for (const field of fields) {
            if (!field.runOnDialogOpen) continue;

            const key = String(field.key);
            void runFieldValueChange(
                field,
                initialValues[key],
                initialValues,
                false,
            );
        }
    }, [fields, idKey, row, runFieldValueChange]);

    return (
        <form
            ref={formRef}
            onSubmit={(event) => {
                event.preventDefault();
                submit();
            }}
        >
            <Grid container spacing={2}>
                {rowHasId(row, idKey) && (
                    <input
                        type="hidden"
                        name={String(idKey)}
                        value={String(
                            (row as Record<string, unknown>)[String(idKey)],
                        )}
                    />
                )}

                {fields.map((field, index) => (
                    <Grid
                        size={{ xs: 12, sm: field.size ?? 6 }}
                        key={`${String(field.key)}-${index}`}
                    >
                        {renderField<R, RI>({
                            field,
                            idx: index,
                            row,
                            values,
                            form,
                            getRules,
                            handleFieldValueChange,
                        })}
                    </Grid>
                ))}

                <Grid size={{ xs: 12 }}>
                    <Divider />
                </Grid>

                <MetadataFields row={row} />
            </Grid>
        </form>
    );
}
