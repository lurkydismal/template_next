import { useCallback, useEffect, useRef } from "react";

import { useSnackbar } from "@/providers/snackbar";
import { UserFacingError } from "@/utils/errors";
import { userMessages } from "@/utils/messages";

import type { FieldConfig } from "../types";

import { rowHasId } from "../Content/changeDetection";
import { buildInitialValues } from "../Content/helpers";
import { resolveInterconnectedFieldUpdates } from "../Content/interconnected";

function readDraft(key: string): Record<string, unknown> | null {
    try {
        const raw = window.localStorage.getItem(key);
        if (!raw) return null;

        const parsed: unknown = JSON.parse(raw);
        return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
            ? (parsed as Record<string, unknown>)
            : null;
    } catch {
        return null;
    }
}

type UseRowDialogDraftOptions<R, RI> = {
    row: R;
    fields: FieldConfig<R, RI>[];
    dashboardKey: string;
    idKey: keyof R;
    values: Record<string, unknown>;
    setValuesAndForm: (values: Record<string, unknown>, shouldDirty?: boolean) => void;
    runFieldValueChange: (
        field: FieldConfig<R, RI>,
        value: unknown,
        values: Record<string, unknown>,
        shouldDirty?: boolean,
    ) => Promise<Record<string, unknown>>;
    submit: () => Promise<boolean>;
    registerSubmit: (fn: (() => Promise<boolean>) | null) => void;
    registerDiscardDraft: (fn: (() => void) | null) => void;
};

export function useRowDialogDraft<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>({
    row,
    fields,
    dashboardKey,
    idKey,
    values,
    setValuesAndForm,
    runFieldValueChange,
    submit,
    registerSubmit,
    registerDiscardDraft,
}: UseRowDialogDraftOptions<R, RI>) {
    const { showError } = useSnackbar();
    const initialRunRef = useRef<string | null>(null);
    const createSessionCounterRef = useRef(0);
    const unsavedRowKeyRef = useRef<string | null>(null);
    const draftDiscardedRef = useRef(false);
    const storageErrorReportedRef = useRef(false);

    const reportStorageError = useCallback(
        (error: unknown) => {
            if (storageErrorReportedRef.current) return;
            storageErrorReportedRef.current = true;
            showError(new UserFacingError(userMessages.errors.draftStorage, { cause: error }));
        },
        [showError],
    );

    const getStorageKey = useCallback(
        (rowKey: string) => `row-dialog-draft:${dashboardKey}:${rowKey}`,
        [dashboardKey],
    );

    const clearDraftValues = useCallback(
        (rowKey: string) => {
            try {
                window.localStorage.removeItem(getStorageKey(rowKey));
            } catch (error) {
                reportStorageError(error);
            }
        },
        [getStorageKey, reportStorageError],
    );

    const saveDraftValues = useCallback(
        (rowKey: string, nextValues: Record<string, unknown>) => {
            try {
                window.localStorage.setItem(getStorageKey(rowKey), JSON.stringify(nextValues));
            } catch (error) {
                reportStorageError(error);
            }
        },
        [getStorageKey, reportStorageError],
    );

    const getRowKey = useCallback((): string => {
        if (rowHasId(row, idKey)) {
            unsavedRowKeyRef.current = null;
            return String((row as Record<string, unknown>)[String(idKey)]);
        }

        if (unsavedRowKeyRef.current === null) {
            createSessionCounterRef.current += 1;
            unsavedRowKeyRef.current = `new-${createSessionCounterRef.current}`;
        }

        return unsavedRowKeyRef.current;
    }, [idKey, row]);

    const activeRowKey = getRowKey();

    useEffect(() => {
        if (draftDiscardedRef.current) return;
        const timeout = window.setTimeout(() => {
            if (!draftDiscardedRef.current) saveDraftValues(activeRowKey, values);
        }, 700);
        return () => window.clearTimeout(timeout);
    }, [activeRowKey, saveDraftValues, values]);

    useEffect(() => {
        const rowKey = getRowKey();
        if (initialRunRef.current === rowKey) return;

        initialRunRef.current = rowKey;
        draftDiscardedRef.current = false;

        const initialValues = buildInitialValues(row, fields);
        const restoredValues = readDraft(getStorageKey(rowKey));
        const bootstrapValues = restoredValues
            ? { ...initialValues, ...restoredValues }
            : initialValues;

        setValuesAndForm(bootstrapValues, false);
        void (async () => {
            try {
                const updates = await resolveInterconnectedFieldUpdates(
                    fields,
                    row,
                    bootstrapValues,
                );
                if (Object.keys(updates).length > 0) setValuesAndForm(updates, false);
            } catch (error) {
                showError(new UserFacingError(userMessages.errors.fieldUpdate, { cause: error }));
            }
        })();

        for (const field of fields) {
            if (field.runOnDialogOpen) {
                void runFieldValueChange(
                    field,
                    bootstrapValues[String(field.key)],
                    bootstrapValues,
                    false,
                );
            }
        }
    }, [fields, getRowKey, getStorageKey, row, runFieldValueChange, setValuesAndForm, showError]);

    const submitWithDraftCleanup = useCallback(async (): Promise<boolean> => {
        const succeeded = await submit();
        if (succeeded) clearDraftValues(activeRowKey);
        return succeeded;
    }, [activeRowKey, clearDraftValues, submit]);

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

    return submitWithDraftCleanup;
}
