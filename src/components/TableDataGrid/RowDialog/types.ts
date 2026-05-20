export type AutocompleteOption =
    | string
    | number
    | boolean
    | { label: string; packedValues?: Record<string, unknown> };

export type DefaultFieldType =
    | "text"
    | "multiline"
    | "custom"
    | "autocomplete"
    | "date"
    | "time"
    | "datetime";

export type FieldValueChangeResult =
    | void
    | Record<string, unknown>
    | Promise<void | Record<string, unknown>>;

export type FieldValueChangeContext<R> = {
    row: R;
    values: Record<string, unknown>;
};

export type FieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = {
    key: K; // property key in row/insert (string allowed for synthetic fields)
    label: string;
    type?: DefaultFieldType;
    name?: string; // form field name (defaults to key)
    size?: number; // value passed to Grid xs/sm/etc (use 12, 6, 4)
    required?: boolean;
    readOnly?: boolean;
    hidden?: boolean; // hides this field from dashboard table columns only
    requiredGroup?: string;
    requiredGroupMin?: number;
    placeholder?: unknown;
    autocompleteOptions?: readonly AutocompleteOption[];
    loadOptions?: () => Promise<readonly AutocompleteOption[]>;
    autocompleteLoading?: boolean;
    autocompleteOpen?: boolean;
    onAutocompleteOpen?: () => void;
    onAutocompleteClose?: () => void;
    // optional custom render: (value, setValue, row) => ReactNode
    formatValue?: (value: unknown) => unknown;
    render?: (
        value: unknown,
        setValue: (v: unknown) => void,
        row: R,
    ) => React.ReactNode;
    // convert local value to form payload value
    toFormValue?: (v: unknown) => string | Blob | undefined;
    // optional comparator for this field
    isChanged?: (rowValue: unknown, currentValue: unknown) => boolean;
    // optional field effect that can return sibling field values after this field changes
    onValueChange?: (
        value: unknown,
        context: FieldValueChangeContext<R>,
    ) => FieldValueChangeResult;
    // run onValueChange with the initial dialog value when the dialog content opens
    runOnDialogOpen?: boolean;
    validate?: (
        value: unknown,
        row: R,
        values: Record<string, unknown>,
    ) => true | string | Promise<true | string>;
};

export type UpdateRowAction = (fd: FormData) => Promise<void>;
export type CreateRowAction<RI> = (row: RI) => Promise<void>;
