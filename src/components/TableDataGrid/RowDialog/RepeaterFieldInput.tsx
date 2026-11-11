import { Delete as DeleteIcon } from "@mui/icons-material";
import { Box, FormHelperText, Grid, IconButton, Paper, Tooltip, Typography } from "@mui/material";
import { ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { get, RegisterOptions, useController, UseFormReturn } from "react-hook-form";

import type { FieldRuleScope } from "./Content/validation";
import type { RepeaterFieldConfig, RepeaterItem, RepeaterSubField } from "./types";

import {
    createBlankItem,
    getFieldDefaultValue,
    isBlankItem,
    normalizeRepeaterItems,
    resolveRepeaterFields,
    serializeRepeaterValue,
} from "./Content/repeater";

/** Hard stop for nesting so a self-containing repeater can never render forever. */
const MAX_REPEATER_DEPTH = 8;

type AnyRepeater = RepeaterFieldConfig<Record<string, unknown>, Record<string, unknown>>;

export type RepeaterSubFieldRenderParams = {
    field: RepeaterSubField;
    /** Form path, e.g. "contacts.2.phones.0.number". */
    name: string;
    value: unknown;
    /** Values of the entry this field belongs to. */
    values: RepeaterItem;
    fields: readonly RepeaterSubField[];
    scope: FieldRuleScope;
    depth: number;
    onChange: (value: unknown, packedValues?: Record<string, unknown>) => void;
};

type RepeaterFieldInputProps = {
    field: AnyRepeater;
    name: string;
    label: string;
    readOnly: boolean;
    value: unknown;
    form: UseFormReturn<Record<string, unknown>>;
    rules?: RegisterOptions<Record<string, unknown>, string>;
    depth: number;
    onValueChange: (value: RepeaterItem[]) => void;
    renderSubField: (params: RepeaterSubFieldRenderParams) => ReactNode;
};

type RepeaterRowProps = {
    index: number;
    item: RepeaterItem | undefined;
    isDraft: boolean;
    name: string;
    title: string;
    subFields: readonly RepeaterSubField[];
    readOnly: boolean;
    depth: number;
    form: UseFormReturn<Record<string, unknown>>;
    onRemove: (index: number) => void;
    onItemFieldChange: (
        index: number,
        key: string,
        value: unknown,
        packedValues?: Record<string, unknown>,
    ) => void;
    renderSubField: (params: RepeaterSubFieldRenderParams) => ReactNode;
};

/**
 * One entry of the list: a titled box with the entry's sub-fields.
 */
function RepeaterRow({
    index,
    item,
    isDraft,
    name,
    title,
    subFields,
    readOnly,
    depth,
    form,
    onRemove,
    onItemFieldChange,
    renderSubField,
}: RepeaterRowProps) {
    const itemPath = `${name}.${index}`;

    const scope = useMemo<FieldRuleScope>(
        () => ({
            getValues: () => (get(form.getValues(), itemPath) as RepeaterItem | undefined) ?? {},
            isInactive: () => isBlankItem(subFields, get(form.getValues(), itemPath)),
        }),
        [form, itemPath, subFields],
    );

    // A blank entry only shows nested lists when it has nothing else to type
    // into. Otherwise a list containing itself would expand forever; here it
    // expands one level per filled entry.
    const hasPlainField = subFields.some((sub) => sub.type !== "repeater");
    const blank = isBlankItem(subFields, item);
    const visibleSubFields = subFields.filter(
        (sub) =>
            sub.type !== "repeater" || (depth < MAX_REPEATER_DEPTH && (!blank || !hasPlainField)),
    );

    return (
        <Paper
            variant="outlined"
            sx={{ p: 2, ...(isDraft ? { borderStyle: "dashed" } : {}) }}
            data-repeater-row={index}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    minHeight: 32,
                    mb: 1,
                }}
            >
                <Typography variant="subtitle2" color="text.secondary">
                    {title}
                </Typography>
                {!readOnly && !isDraft && (
                    <Tooltip title="Remove">
                        <IconButton
                            size="small"
                            aria-label={`Remove ${title}`}
                            onClick={() => onRemove(index)}
                        >
                            <DeleteIcon fontSize="small" />
                        </IconButton>
                    </Tooltip>
                )}
            </Box>

            <Grid container spacing={2}>
                {visibleSubFields.map((sub) => {
                    const key = String(sub.key);

                    return (
                        <Grid
                            key={key}
                            size={{ xs: 12, sm: sub.size ?? (sub.type === "repeater" ? 12 : 6) }}
                        >
                            {renderSubField({
                                field: sub,
                                name: `${itemPath}.${key}`,
                                value: item?.[key] ?? getFieldDefaultValue(sub),
                                values: item ?? {},
                                fields: subFields,
                                scope,
                                depth: depth + 1,
                                onChange: (nextValue, packedValues) =>
                                    onItemFieldChange(index, key, nextValue, packedValues),
                            })}
                        </Grid>
                    );
                })}
            </Grid>
        </Paper>
    );
}

/**
 * Composite list input. Shows the stored entries plus one blank entry; typing
 * into the blank entry makes it a real entry and a new blank one appears.
 * Entries contain any sub-fields, including more repeaters.
 */
export default function RepeaterFieldInput({
    field,
    name,
    label,
    readOnly,
    value,
    form,
    rules,
    depth,
    onValueChange,
    renderSubField,
}: RepeaterFieldInputProps) {
    const subFields = resolveRepeaterFields(field);
    const items = useMemo(() => (Array.isArray(value) ? (value as RepeaterItem[]) : []), [value]);

    // Registers the list itself so list-level rules (required, min/max) run on submit.
    const { fieldState } = useController({
        name,
        control: form.control,
        defaultValue: items,
        rules: rules ?? {},
    });

    const filledCount = items.filter((item) => !isBlankItem(subFields, item)).length;
    const hasBlankRow = !readOnly && (field.maxItems === undefined || filledCount < field.maxItems);
    const rowCount = items.length + (hasBlankRow ? 1 : 0);

    // Rows are keyed by position, so inputs keep focus while their row turns
    // from the blank row into a real entry. After removals and external value
    // changes the generation changes, which remounts rows so they re-read their values.
    const [generation, setGeneration] = useState(0);
    const valueKey = JSON.stringify(serializeRepeaterValue(field, items));
    const emittedKeyRef = useRef(valueKey);

    /**
     * Writes an explicit blank entry into the form state at `index`. Without it a
     * freshly mounted blank row would fall back to the dialog's initial values for
     * that index, which belong to an entry that has since moved or been removed.
     */
    const materializeBlankRow = (index: number) => {
        const path: string = `${name}.${index}`;
        form.setValue(path, createBlankItem(subFields), {
            shouldDirty: false,
            shouldValidate: false,
        });
    };

    useEffect(() => {
        if (valueKey === emittedKeyRef.current) return;

        emittedKeyRef.current = valueKey;
        if (hasBlankRow) materializeBlankRow(items.length);
        setGeneration((current) => current + 1);
        // eslint-disable-next-line react-hooks/exhaustive-deps -- reacts to value changes only
    }, [valueKey]);

    /**
     * Form state is the source of truth while typing; it also holds the blank row.
     */
    const readItems = (): RepeaterItem[] => {
        const current = get(form.getValues(), name);
        return Array.isArray(current) ? (current as RepeaterItem[]) : [];
    };

    const commit = (nextItems: RepeaterItem[]) => {
        const normalized = normalizeRepeaterItems(field, nextItems);
        emittedKeyRef.current = JSON.stringify(serializeRepeaterValue(field, normalized));
        onValueChange(normalized);

        // The parent just wrote the list without its blank row; put the row back.
        const filled = normalized.filter((item) => !isBlankItem(subFields, item)).length;
        if (!readOnly && (field.maxItems === undefined || filled < field.maxItems)) {
            materializeBlankRow(normalized.length);
        }
    };

    const handleItemFieldChange = (
        index: number,
        key: string,
        nextValue: unknown,
        packedValues?: Record<string, unknown>,
    ) => {
        const next = readItems().slice();
        while (next.length <= index) next.push({});

        next[index] = { ...next[index], ...packedValues, [key]: nextValue };
        commit(next);
    };

    const handleRemove = (index: number) => {
        setGeneration((current) => current + 1);
        commit(readItems().filter((_, itemIndex) => itemIndex !== index));
    };

    const itemLabel = field.itemLabel ?? field.label;

    return (
        <Box>
            <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 1 }}>
                {label}
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                {Array.from({ length: rowCount }, (_, index) => (
                    <RepeaterRow
                        key={`${generation}-${index}`}
                        index={index}
                        item={items[index]}
                        isDraft={index >= items.length}
                        name={name}
                        title={`${itemLabel} ${index + 1}`}
                        subFields={subFields}
                        readOnly={readOnly}
                        depth={depth}
                        form={form}
                        onRemove={handleRemove}
                        onItemFieldChange={handleItemFieldChange}
                        renderSubField={renderSubField}
                    />
                ))}
            </Box>

            {fieldState.error?.message && (
                <FormHelperText error>{fieldState.error.message}</FormHelperText>
            )}
        </Box>
    );
}
