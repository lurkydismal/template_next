import { UseFormReturn } from "react-hook-form";

import { FieldConfig } from "../../types";

/**
 * Shared parameters required to render a single editable row field.
 */
export type RenderFieldParams<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
> = {
    field: FieldConfig<R, RI>;
    idx: number;
    row: R;
    values: Record<string, unknown>;
    fields: FieldConfig<R, RI>[];
    form: UseFormReturn<Record<string, unknown>>;
    handleFieldValueChange: (
        field: FieldConfig<R, RI>,
        value: unknown,
        packedValues?: Record<string, unknown>,
    ) => void;
};
