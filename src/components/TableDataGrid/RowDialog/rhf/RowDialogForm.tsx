import { Divider, Grid } from "@mui/material";
import { Fragment, memo, useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useRHFForm } from "@/components/rhf";
import { useSnackbar } from "@/providers/snackbar";
import { UserFacingError } from "@/utils/errors";
import { userMessages } from "@/utils/messages";

import type { CreateRowAction, FieldConfig, UpdateRowAction } from "../types";

import { rowHasChanges, rowHasId } from "../Content/changeDetection";
import { buildUpdateFormData } from "../Content/formData";
import { buildInitialValues } from "../Content/helpers";
import { resolveInterconnectedFieldUpdates } from "../Content/interconnected";
import MetadataFields from "../Content/MetadataFields";
import { renderField } from "./index";

type RowDialogContentProps<R, RI> = {
    row: R;
    fields: FieldConfig<R, RI>[];
    dashboardKey: string;
    registerSubmit: (fn: (() => Promise<boolean>) | null) => void;
    registerDiscardDraft: (fn: (() => void) | null) => void;
    createRowAction: CreateRowAction<RI>;
    updateRowAction: UpdateRowAction;
    onUpdated?: (() => Promise<void> | void) | undefined;
    idKey?: keyof R;
};

/**
 * Renders the row dialog content component.
 */
function RowDialogContent<R extends Record<string, unknown>, RI extends Record<string, unknown>>({
    row,
    fields,
    dashboardKey,
    registerSubmit,
    registerDiscardDraft,
    createRowAction,
    updateRowAction,
    onUpdated,
    idKey = "id" as keyof R,
}: RowDialogContentProps<R, RI>) {
    const { showError } = useSnackbar();
    const formRef = useRef<HTMLFormElement | null>(null);
    const initialValues = useMemo(() => buildInitialValues(row, fields), [fields, row]);
    const form = useRHFForm<Record<string, unknown>>({
        defaultValues: initialValues,
        mode: "onSubmit",
    });

    const [values, setValues] = useState<Record<string, unknown>>(initialValues);
    const valuesRef = useRef(values);

    useEffect(() => {
        valuesRef.current = initialValues;
        setValues(initialValues);
        form.reset(initialValues);
    }, [form, initialValues, row]);

    /**
     * Stores multiple field values in local row dialog state and optionally mirrors them to React Hook Form.
     */
    const setValuesAndForm = useCallback(
        (nextValues: Record<string, unknown>, shouldDirty = true) => {
            // Keep the latest snapshot synchronously available to stable event
            // callbacks, even before React commits the next render.
            valuesRef.current = { ...valuesRef.current, ...nextValues };
            setValues((state) => {
                const changed = Object.entries(nextValues).some(
                    ([key, value]) => !Object.is(state[key], value),
                );
                return changed ? { ...state, ...nextValues } : state;
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

    /**
     * Runs a field value-change effect and applies any returned sibling field values.
     */
    const runFieldValueChange = useCallback(
        async (
            field: FieldConfig<R, RI>,
            value: unknown,
            nextValues: Record<string, unknown>,
            shouldDirty = true,
        ): Promise<Record<string, unknown>> => {
            if (!field.onValueChange) return {};

            try {
                const changedValues = await field.onValueChange(value, {
                    row,
                    values: nextValues,
                });

                if (changedValues && typeof changedValues === "object") {
                    setValuesAndForm(changedValues, shouldDirty);
                    return changedValues;
                }
            } catch (error) {
                showError(new UserFacingError(userMessages.errors.fieldUpdate, { cause: error }));
            }

            return {};
        },
        [row, setValuesAndForm, showError],
    );

    const interconnectedRequestEpochRef = useRef(0);

    /**
     * Stores an edited value, then lets the field derive any dependent values.
     */
    const handleFieldValueChange = useCallback(
        (field: FieldConfig<R, RI>, value: unknown, packedValues?: Record<string, unknown>) => {
            const key = String(field.key);
            const changedValues = packedValues
                ? { [key]: value, ...packedValues }
                : { [key]: value };
            const nextValues = { ...valuesRef.current, ...changedValues };
            const requestEpoch = ++interconnectedRequestEpochRef.current;

            setValuesAndForm(changedValues);

            void (async () => {
                try {
                    const siblingUpdates = await runFieldValueChange(field, value, nextValues);
                    const mergedNextValues = { ...nextValues, ...siblingUpdates };
                    const interconnectedUpdates = await resolveInterconnectedFieldUpdates(
                        fields,
                        row,
                        mergedNextValues,
                        key,
                    );

                    if (requestEpoch !== interconnectedRequestEpochRef.current) {
                        return;
                    }

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

    const updateRow = useCallback(
        async (fd: FormData): Promise<boolean> => {
            try {
                await updateRowAction(fd);
                await onUpdated?.();
                return true;
            } catch (error) {
                showError(new UserFacingError(userMessages.errors.rowUpdate, { cause: error }));
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
                showError(new UserFacingError(userMessages.errors.rowCreate, { cause: error }));
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

    const initialRunRef = useRef<string | null>(null);
    const createSessionCounterRef = useRef(0);
    const unsavedRowKeyRef = useRef<string | null>(null);
    const draftDiscardedRef = useRef(false);

    /**
     * Builds the localStorage key used to persist in-progress dialog values.
     */
    const getDraftStorageKey = useCallback(
        (rowKey: string): string => `row-dialog-draft:${dashboardKey}:${rowKey}`,
        [dashboardKey],
    );

    /**
     * Loads any previously saved draft values for the active dashboard row.
     */
    const loadDraftValues = useCallback(
        (rowKey: string): Record<string, unknown> | null => {
            const raw = window.localStorage.getItem(getDraftStorageKey(rowKey));
            if (!raw) return null;

            try {
                const parsed = JSON.parse(raw) as Record<string, unknown>;
                return parsed && typeof parsed === "object" ? parsed : null;
            } catch {
                return null;
            }
        },
        [getDraftStorageKey],
    );

    /**
     * Persists form values for the active dashboard row to survive crashes/reloads.
     */
    const saveDraftValues = useCallback(
        (rowKey: string, nextValues: Record<string, unknown>) => {
            window.localStorage.setItem(getDraftStorageKey(rowKey), JSON.stringify(nextValues));
        },
        [getDraftStorageKey],
    );

    /**
     * Removes any saved draft values for the active dashboard row.
     */
    const clearDraftValues = useCallback(
        (rowKey: string) => {
            window.localStorage.removeItem(getDraftStorageKey(rowKey));
        },
        [getDraftStorageKey],
    );

    /**
     * Builds a stable unique key for each unsaved create session so dialog-open
     * initialization runs once per distinct create flow.
     */
    const getRowKey = useCallback((): string => {
        if (rowHasId(row, idKey)) {
            unsavedRowKeyRef.current = null;
            return String((row as Record<string, unknown>)[String(idKey)]);
        }

        if (unsavedRowKeyRef.current == null) {
            createSessionCounterRef.current += 1;
            unsavedRowKeyRef.current = `new-${createSessionCounterRef.current}`;
        }

        return unsavedRowKeyRef.current;
    }, [idKey, row]);

    const activeRowKey = getRowKey();

    useEffect(() => {
        if (draftDiscardedRef.current) return;

        const timeout = setTimeout(() => {
            if (!draftDiscardedRef.current) {
                saveDraftValues(activeRowKey, values);
            }
        }, 700);

        return () => clearTimeout(timeout);
    }, [activeRowKey, saveDraftValues, values]);

    useEffect(() => {
        const rowKey = getRowKey();
        if (initialRunRef.current === rowKey) return;
        initialRunRef.current = rowKey;
        draftDiscardedRef.current = false;

        const initialValues = buildInitialValues(row, fields);
        const restoredValues = loadDraftValues(rowKey);
        const bootstrapValues = restoredValues
            ? { ...initialValues, ...restoredValues }
            : initialValues;

        setValuesAndForm(bootstrapValues, false);
        void (async () => {
            const interconnectedUpdates = await resolveInterconnectedFieldUpdates(
                fields,
                row,
                bootstrapValues,
            );
            if (Object.keys(interconnectedUpdates).length > 0) {
                setValuesAndForm(interconnectedUpdates, false);
            }
        })();

        for (const field of fields) {
            if (!field.runOnDialogOpen) continue;

            const key = String(field.key);
            void runFieldValueChange(field, bootstrapValues[key], bootstrapValues, false);
        }
    }, [fields, getRowKey, loadDraftValues, row, runFieldValueChange, setValuesAndForm]);

    const submitWithDraftCleanup = useCallback(async (): Promise<boolean> => {
        const ok = await submit();
        if (ok) {
            clearDraftValues(activeRowKey);
        }

        return ok;
    }, [activeRowKey, clearDraftValues, submit]);

    /**
     * Clears the active draft and prevents pending save timers from restoring it.
     */
    const discardActiveDraft = useCallback(() => {
        draftDiscardedRef.current = true;
        clearDraftValues(activeRowKey);
    }, [activeRowKey, clearDraftValues]);

    useEffect(() => {
        registerSubmit(submitWithDraftCleanup);
        return () => registerSubmit(null);
    }, [registerSubmit, submitWithDraftCleanup]);

    useEffect(() => {
        registerDiscardDraft(discardActiveDraft);
        return () => registerDiscardDraft(null);
    }, [discardActiveDraft, registerDiscardDraft]);

    return (
        <form
            ref={formRef}
            onSubmit={(event) => {
                event.preventDefault();
                submitWithDraftCleanup();
            }}
        >
            <Grid container spacing={2}>
                {rowHasId(row, idKey) && (
                    <input
                        type="hidden"
                        name={String(idKey)}
                        value={String((row as Record<string, unknown>)[String(idKey)])}
                    />
                )}

                {fields.map((field, index) => (
                    <Fragment key={`${String(field.key)}-${index}`}>
                        {renderField<R, RI>({
                            field,
                            idx: index,
                            row,
                            values,
                            fields,
                            form,
                            handleFieldValueChange,
                        })}
                    </Fragment>
                ))}

                <Grid size={{ xs: 12 }}>
                    <Divider />
                </Grid>

                <MetadataFields row={row} />
            </Grid>
        </form>
    );
}

export default memo(RowDialogContent) as typeof RowDialogContent;
