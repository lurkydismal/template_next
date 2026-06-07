import { CheckboxProps, RadioProps } from "@mui/material";

type AutocompleteOption =
    | string
    | number
    | boolean
    | { label: string; packedValues?: Record<string, unknown> };

type FieldValueChangeResult =
    | void
    | Record<string, unknown>
    | Promise<void | Record<string, unknown>>;

type FieldValueChangeContext<R> = {
    row: R;
    values: Record<string, unknown>;
};

type InterconnectedFieldRelation = {
    sourceField: string;
    lookupField: string;
    valueField: string;
    rows: Record<string, unknown>[];
};

type InterconnectedFieldContext<R> = {
    row: R;
    values: Record<string, unknown>;
};

type InterconnectedFieldConfig<R> = {
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

type TextFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "text" | "multiline";
    };

type NumberFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "number";
        min?: number; // minimum accepted value for number fields
        max?: number; // maximum accepted value for number fields
    };

type AutocompleteFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
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

type MarkdownFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "markdown";
        toggleCorner?:
        | "top-left"
        | "top-right"
        | "bottom-left"
        | "bottom-right";
    };

type DateTimeFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "date" | "time" | "datetime";
    };

type UuidFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "uuid";
    };

type HexFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "hex";
    };

type InetFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "inet";
        inetAllowPort?: boolean;
    };

type TableLookupFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "table-lookup";
        lookup?: (
            value: unknown,
            row: R,
            values: Record<string, unknown>,
        ) => boolean | Promise<boolean>;
        tableLookupErrorMessage?: string;
    };

type CommonBooleanFieldConfig = {
    type: "boolean";
    color?: CheckboxProps["color"];
    scale?: CheckboxProps["size"];
};

type CommonBooleanSingleFieldConfig = {
    default?: boolean;
};

type CheckboxFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonBooleanFieldConfig &
    CommonBooleanSingleFieldConfig & {
        variant: "checkbox";
    };

type IconCheckboxFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
    I extends CheckboxProps["icon"] = CheckboxProps["icon"],
> = CommonFieldConfig<R, RI, K> &
    CommonBooleanFieldConfig &
    CommonBooleanSingleFieldConfig & {
        variant: "icon";
        icon: I;
        checkedIcon: I;
    };

type SwitchFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonBooleanFieldConfig &
    CommonBooleanSingleFieldConfig & {
        variant: "switch";
    };

type RadioGroupFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & {
    type: "radio-group";
    color?: RadioProps["color"];
    scale?: RadioProps["size"];
};

type BooleanFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> =
    | CheckboxFieldConfig<R, RI, K>
    | IconCheckboxFieldConfig<R, RI, K>
    | SwitchFieldConfig<R, RI, K>;

type FileFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & {
    type: "file";
    fileAccept?: string | string[];
    width?: number | `${number}`;
    height?: number | `${number}`;
};

type CustomFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
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
    | BooleanFieldConfig<R, RI, K>
    | RadioGroupFieldConfig<R, RI, K>
    | FileFieldConfig<R, RI, K>
    | CustomFieldConfig<R, RI, K>;
