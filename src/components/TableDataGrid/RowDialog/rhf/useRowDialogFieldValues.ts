import type { UseFormReturn } from "react-hook-form";

import { useCallback, useEffect, useRef, useState } from "react";

import { useSnackbar } from "@/providers/snackbar";
import { UserFacingError } from "@/utils/errors";
import { userMessages } from "@/utils/messages";

import type { FieldConfig } from "../types";

import { resolveInterconnectedFieldUpdates } from "../Content/interconnected";

type UseRowDialogFieldValuesOptions<R, RI> = {
    row: R;
    fields: FieldConfig<R, RI>[];
    initialValues: Record<string, unknown>;
    form: UseFormReturn<Record<string, unknown>>;
};

export function useRowDialogFieldValues<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>({ row, fields, initialValues, form }: UseRowDialogFieldValuesOptions<R, RI>) {
    const { showError } = useSnackbar();
    const [values, setValues] = useState<Record<string, unknown>>(initialValues);
    const valuesRef = useRef(values);

    useEffect(() => {
        valuesRef.current = initialValues;
        setValues(initialValues);
        form.reset(initialValues);
    }, [form, initialValues, row]);

    const setValuesAndForm = useCallback(
        (nextValues: Record<string, unknown>, shouldDirty = true) => {
            valuesRef.current = { ...valuesRef.current, ...nextValues };
            setValues((current) => {
                const hasChanges = Object.entries(nextValues).some(
                    ([key, value]) => !Object.is(current[key], value),
                );
                return hasChanges ? { ...current, ...nextValues } : current;
            });

            for (const [key, value] of Object.entries(nextValues)) {
                form.setValue(key, value, {
                    shouldDirty,
                    shouldValidate: shouldDirty,
                });
            }
        },
        [form],
    );

    const runFieldValueChange = useCallback(
        async (
            field: FieldConfig<R, RI>,
            value: unknown,
            nextValues: Record<string, unknown>,
            shouldDirty = true,
        ): Promise<Record<string, unknown>> => {
            if (!field.onValueChange) return {};

            try {
                const updates = await field.onValueChange(value, { row, values: nextValues });
                if (!updates || typeof updates !== "object") return {};

                setValuesAndForm(updates, shouldDirty);
                return updates;
            } catch (error) {
                showError(new UserFacingError(userMessages.errors.fieldUpdate, { cause: error }));
                return {};
            }
        },
        [row, setValuesAndForm, showError],
    );

    const requestEpochRef = useRef(0);
    const handleFieldValueChange = useCallback(
        (field: FieldConfig<R, RI>, value: unknown, packedValues?: Record<string, unknown>) => {
            const key = String(field.key);
            const changedValues = packedValues
                ? { [key]: value, ...packedValues }
                : { [key]: value };
            const nextValues = { ...valuesRef.current, ...changedValues };
            const requestEpoch = ++requestEpochRef.current;

            setValuesAndForm(changedValues);

            void (async () => {
                try {
                    const siblingUpdates = await runFieldValueChange(field, value, nextValues);
                    const mergedValues = { ...nextValues, ...siblingUpdates };
                    const interconnectedUpdates = await resolveInterconnectedFieldUpdates(
                        fields,
                        row,
                        mergedValues,
                        key,
                    );

                    if (requestEpoch !== requestEpochRef.current) return;
                    if (Object.keys(interconnectedUpdates).length > 0) {
                        setValuesAndForm(interconnectedUpdates);
                    }
                } catch (error) {
                    showError(
                        new UserFacingError(userMessages.errors.fieldUpdate, { cause: error }),
                    );
                }
            })();
        },
        [fields, row, runFieldValueChange, setValuesAndForm, showError],
    );

    return { values, setValuesAndForm, runFieldValueChange, handleFieldValueChange };
}
