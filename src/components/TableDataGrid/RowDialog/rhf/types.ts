import type {
    RHFControl,
    RHFFieldError,
    RHFFormReturn,
    RHFRegisterOptions,
} from "@/components/rhf";

import type { FieldConfig } from "../types";

/** Shared RHF-controlled props used by every row-dialog field adapter. */
export type RHFRowFieldControlProps = {
    name: string;
    value: unknown;
    control: RHFControl<Record<string, unknown>>;
    error?: RHFFieldError;
    rules?: RHFRegisterOptions<Record<string, unknown>, string>;
};

/**
 * Shared parameters required to render a single editable row field.
 */
export type RenderFieldParams<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
> = {
    field: FieldConfig<R, RI>;
    row: R;
    values: Record<string, unknown>;
    fields: FieldConfig<R, RI>[];
    form: RHFFormReturn<Record<string, unknown>>;
    handleFieldValueChange: (
        field: FieldConfig<R, RI>,
        value: unknown,
        packedValues?: Record<string, unknown>,
    ) => void;
};
