import type { RefObject } from "react";
import type { UseFormReturn } from "react-hook-form";

import { useCallback } from "react";

import { useSnackbar } from "@/providers/snackbar";
import { UserFacingError } from "@/utils/errors";
import { userMessages } from "@/utils/messages";

import type { FieldConfig, CreateRowAction, UpdateRowAction } from "../types";

import { rowHasChanges, rowHasId } from "../Content/changeDetection";
import { buildUpdateFormData } from "../Content/formData";

type UseRowDialogSubmissionOptions<R, RI> = {
    row: R;
    fields: FieldConfig<R, RI>[];
    idKey: keyof R;
    form: UseFormReturn<Record<string, unknown>>;
    formRef: RefObject<HTMLFormElement | null>;
    createRowAction: CreateRowAction<RI>;
    updateRowAction: UpdateRowAction;
    onUpdated?: (() => Promise<void> | void) | undefined;
};

export function useRowDialogSubmission<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>({
    row,
    fields,
    idKey,
    form,
    formRef,
    createRowAction,
    updateRowAction,
    onUpdated,
}: UseRowDialogSubmissionOptions<R, RI>) {
    const { showError } = useSnackbar();

    const updateRow = useCallback(
        async (formData: FormData): Promise<boolean> => {
            try {
                await updateRowAction(formData);
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
        async (values: Partial<RI>): Promise<boolean> => {
            try {
                await createRowAction(values as RI);
                await onUpdated?.();
                return true;
            } catch (error) {
                showError(new UserFacingError(userMessages.errors.rowCreate, { cause: error }));
                return false;
            }
        },
        [createRowAction, onUpdated, showError],
    );

    return useCallback(async (): Promise<boolean> => {
        if (!(await form.trigger())) return false;

        const values = form.getValues() as Partial<RI>;
        const hasId = rowHasId(row, idKey);

        if (hasId && !rowHasChanges(row, values, fields)) return true;
        if (!hasId) return createRow(values);

        return updateRow(buildUpdateFormData(formRef.current, fields, values));
    }, [createRow, fields, form, formRef, idKey, row, updateRow]);
}
