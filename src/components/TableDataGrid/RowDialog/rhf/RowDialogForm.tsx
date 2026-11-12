import { Divider, Grid } from "@mui/material";
import { Fragment, memo, useMemo, useRef } from "react";

import { useRHFForm } from "@/components/rhf";

import type { CreateRowAction, FieldConfig, UpdateRowAction } from "../types";

import { rowHasId } from "../Content/changeDetection";
import { buildInitialValues } from "../Content/helpers";
import MetadataFields from "../Content/MetadataFields";
import { renderField } from "./renderField";
import { useRowDialogDraft } from "./useRowDialogDraft";
import { useRowDialogFieldValues } from "./useRowDialogFieldValues";
import { useRowDialogSubmission } from "./useRowDialogSubmission";

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

/** Renders an editable row form and coordinates field, submit, and draft hooks. */
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
    const formRef = useRef<HTMLFormElement | null>(null);
    const initialValues = useMemo(() => buildInitialValues(row, fields), [fields, row]);
    const form = useRHFForm<Record<string, unknown>>({
        defaultValues: initialValues,
        mode: "onSubmit",
    });
    const { values, setValuesAndForm, runFieldValueChange, handleFieldValueChange } =
        useRowDialogFieldValues<R, RI>({ row, fields, initialValues, form });
    const submit = useRowDialogSubmission<R, RI>({
        row,
        fields,
        idKey,
        form,
        formRef,
        createRowAction,
        updateRowAction,
        onUpdated,
    });
    const submitWithDraftCleanup = useRowDialogDraft<R, RI>({
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
    });

    return (
        <form
            ref={formRef}
            onSubmit={(event) => {
                event.preventDefault();
                void submitWithDraftCleanup();
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
