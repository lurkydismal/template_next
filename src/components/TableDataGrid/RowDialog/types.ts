export type AutocompleteOption =
    | string
    | number
    | boolean
    | { label: string; packedValues?: Record<string, unknown> };

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

type CommonFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = {
    key: K; // property key in row/insert (string allowed for synthetic fields)
    label: string;
    name?: string; // form field name (defaults to key)
    size?: number; // value passed to Grid xs/sm/etc (use 12, 6, 4)
    required?: boolean;
    readOnly?: boolean;
    hidden?: boolean; // hides this field from dashboard table columns only
    requiredGroup?: string;
    requiredGroupMin?: number;
    formatValue?: (value: unknown) => unknown; // optional custom render: (value, setValue, row) => ReactNode
    toFormValue?: (v: unknown) => string | Blob | undefined; // convert local value to form payload value
    isChanged?: (rowValue: unknown, currentValue: unknown) => boolean; // optional comparator for this field
    onValueChange?: (
        value: unknown,
        context: FieldValueChangeContext<R>,
    ) => FieldValueChangeResult; // optional field effect that can return sibling field values after this field changes
    runOnDialogOpen?: boolean; // run onValueChange with the initial dialog value when the dialog content opens
    interconnected?: InterconnectedFieldConfig<R>;
    validate?: (
        value: unknown,
        row: R,
        values: Record<string, unknown>,
    ) => true | string | Promise<true | string>;
};

type CommonPlaceholderFieldConfig = {
    placeholder?: string | number | `${number}`;
};

export type TextFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & CommonPlaceholderFieldConfig & {
    type: "text" | "multiline";
};

export type NumberFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & CommonPlaceholderFieldConfig & {
    type: "number";
    min?: number; // minimum accepted value for number fields
    max?: number; // maximum accepted value for number fields
};


export type AutocompleteFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & CommonPlaceholderFieldConfig & {
    type: "autocomplete";
    autocompleteOptions?: readonly AutocompleteOption[];
    loadOptions?: () => Promise<readonly AutocompleteOption[]>;
    autocompleteLoading?: boolean;
    autocompleteOpen?: boolean;
    onAutocompleteOpen?: () => void;
    onAutocompleteClose?: () => void;
    /**
     * List of sibling autocomplete field keys that cannot share the same selected value.
     *
     * When provided, options selected in the listed fields are filtered out from this
     * field's options list (while still keeping this field's current value visible).
     */
    mutuallyExclusiveWith?: string[];
};

export type MarkdownFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & CommonPlaceholderFieldConfig & {
    type: "markdown";
    toggleCorner?:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right";
};

export type DateTimeFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & CommonPlaceholderFieldConfig & {
    type: "date" | "time" | "datetime";
};

export type UuidFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & CommonPlaceholderFieldConfig & {
    type: "uuid";
};

export type HexFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & CommonPlaceholderFieldConfig & {
    type: "hex";
};

export type InetFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & CommonPlaceholderFieldConfig & {
    type: "inet";
    inetAllowPort?: boolean;
};

export type TableLookupFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & CommonPlaceholderFieldConfig & {
    type: "table-lookup";
    lookup?: (
        value: unknown,
        row: R,
        values: Record<string, unknown>,
    ) => boolean | Promise<boolean>;
    tableLookupErrorMessage?: string;
};

export type FileFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & {
    type: "file";
    fileAccept?: string | string[];
    width?: number | `${number}`;
    height?: number | `${number}`;
};

export type CustomFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & CommonPlaceholderFieldConfig & {
    type: "custom";
    render?: (
        value: unknown,
        setValue: (v: unknown) => void,
        row: R,
    ) => React.ReactNode;
};

export type FieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> =
    | TextFieldConfig<R, RI, K>
    | NumberFieldConfig<R, RI, K>
    | AutocompleteFieldConfig<R, RI, K>
    | MarkdownFieldConfig<R, RI, K>
    | DateTimeFieldConfig<R, RI, K>
    | UuidFieldConfig<R, RI, K>
    | HexFieldConfig<R, RI, K>
    | InetFieldConfig<R, RI, K>
    | TableLookupFieldConfig<R, RI, K>
    | FileFieldConfig<R, RI, K>
    | CustomFieldConfig<R, RI, K>;