export type AutocompleteOption =
    | string
    | number
    | boolean
    | { label: string; packedValues?: Record<string, unknown> };

export type DefaultFieldType =
    | "text"
    | "multiline"
    | "markdown"
    | "custom"
    | "autocomplete"
    | "date"
    | "time"
    | "datetime"
    | "number"
    | "uuid"
    | "hex"
    | "inet"
    | "tableLookup"
    | "file";

export type FieldValueChangeResult =
    | void
    | Record<string, unknown>
    | Promise<void | Record<string, unknown>>;

export type FieldValueChangeContext<R> = {
    row: R;
    values: Record<string, unknown>;
};

export type InterconnectedFieldRelation = {
    sourceField: string;
    lookupField: string;
    valueField: string;
    rows: Record<string, unknown>[];
};

export type InterconnectedFieldContext<R> = {
    row: R;
    values: Record<string, unknown>;
};

export type InterconnectedFieldConfig<R> = {
    dependsOn: string[];
    makeReadOnly?: boolean;
    getter?: (
        context: InterconnectedFieldContext<R>,
    ) => unknown | Promise<unknown>;
    relation?: InterconnectedFieldRelation;
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
    min?: number; // minimum accepted value for number fields
    max?: number; // maximum accepted value for number fields
    requiredGroup?: string;
    requiredGroupMin?: number;
    placeholder?: unknown;
    autocompleteOptions?: readonly AutocompleteOption[];
    /**
     * List of sibling autocomplete field keys that cannot share the same selected value.
     *
     * When provided, options selected in the listed fields are filtered out from this
     * field's options list (while still keeping this field's current value visible).
     */
    mutuallyExclusiveWith?: string[];
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
    interconnected?: InterconnectedFieldConfig<R>;
    validate?: (
        value: unknown,
        row: R,
        values: Record<string, unknown>,
    ) => true | string | Promise<true | string>;
    tableLookup?: (
        value: unknown,
        row: R,
        values: Record<string, unknown>,
    ) => boolean | Promise<boolean>;
    tableLookupErrorMessage?: string;
    inetAllowPort?: boolean;
    markdownToggleCorner?:
        | "top-left"
        | "top-right"
        | "bottom-left"
        | "bottom-right";
    fileAccept?: string | string[];
};

export type UpdateRowAction = (fd: FormData) => Promise<void>;
export type CreateRowAction<RI> = (row: RI) => Promise<void>;
