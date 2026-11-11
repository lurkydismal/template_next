import type { CheckboxProps, RadioProps, SwitchProps } from "@mui/material";
import type { ReactNode } from "react";

export type AutocompleteOption =
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
    getter?: (context: InterconnectedFieldContext<R>) => unknown | Promise<unknown>;
    relation?: InterconnectedFieldRelation;
};

type CommonFieldConfig<R, RI = unknown, K extends PropertyKey = keyof R | keyof RI | string> = {
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
    onValueChange?: (value: unknown, context: FieldValueChangeContext<R>) => FieldValueChangeResult; // optional field effect that can return sibling field values after this field changes
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
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "text" | "multiline";
    };

export type NumberFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "number";
        min?: number; // minimum accepted value for number fields
        max?: number; // maximum accepted value for number fields
    };

export type AutocompleteFieldConfig<
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

export type MarkdownFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "markdown";
        toggleCorner?: "top-left" | "top-right" | "bottom-left" | "bottom-right";
        default?: boolean; // default preview state
    };

export type DateTimeFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "date" | "time" | "datetime";
    };

export type UuidFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "uuid";
    };

export type HexFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "hex";
    };

export type InetFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "inet";
        inetAllowPort?: boolean;
    };

export type TableLookupFieldConfig<
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

export type CheckboxFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & {
    type: "boolean";
    variant: "checkbox";
    default?: boolean;
    color?: CheckboxProps["color"];
    scale?: CheckboxProps["size"];
};

export type IconCheckboxFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
    I extends CheckboxProps["icon"] = CheckboxProps["icon"],
> = CommonFieldConfig<R, RI, K> & {
    type: "boolean";
    variant: "icon";
    default?: boolean;
    color?: CheckboxProps["color"];
    scale?: CheckboxProps["size"];
    icon: I;
    checkedIcon: I;
};

export type SwitchFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & {
    type: "boolean";
    variant: "switch";
    default?: boolean;
    color?: SwitchProps["color"];
    scale?: SwitchProps["size"];
};

export type RadioGroupOption =
    | string
    | number
    | {
          value: string | number;
          label: ReactNode;
          disabled?: boolean;
      };

export type RadioGroupFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & {
    type: "radio-group";
    options: readonly RadioGroupOption[];
    default?: string | number;
    row?: boolean;
    color?: RadioProps["color"];
    scale?: RadioProps["size"];
};

export type BooleanFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CheckboxFieldConfig<R, RI, K> | IconCheckboxFieldConfig<R, RI, K> | SwitchFieldConfig<R, RI, K>;

export type CustomFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> &
    CommonPlaceholderFieldConfig & {
        type: "custom";
        render?: (value: unknown, setValue: (v: unknown) => void, row: R) => React.ReactNode;
    };

/** One entry of a repeater: the values of its sub-fields, keyed by sub-field key. */
export type RepeaterItem = Record<string, unknown>;

/**
 * A field inside a repeater. Its "row" is the repeater entry, so `validate` and
 * `requiredGroup` see sibling values of the same entry. `onValueChange`,
 * `interconnected`, `runOnDialogOpen`, `toFormValue` and `name` are not applied
 * to sub-fields.
 */
export type RepeaterSubField = FieldConfig<RepeaterItem, RepeaterItem>;

/** Sub-fields, or a thunk returning them so a repeater can contain itself. */
export type RepeaterSubFields = readonly RepeaterSubField[] | (() => readonly RepeaterSubField[]);

/**
 * Composite list field. Shows its entries plus one blank entry; filling the blank
 * entry adds the next blank one. Each entry holds any mix of other field types,
 * including further repeaters (also the same one, via a `fields` thunk).
 * Stored as a JSONB array of objects; blank entries are never stored.
 */
export type RepeaterFieldConfig<
    R,
    RI = unknown,
    K extends PropertyKey = keyof R | keyof RI | string,
> = CommonFieldConfig<R, RI, K> & {
    type: "repeater";
    fields: RepeaterSubFields;
    minItems?: number; // minimum number of filled entries
    maxItems?: number; // stops adding blank entries once this many are filled
    itemLabel?: string; // title of each entry, numbered; defaults to the field label
};

export type FieldConfig<R, RI = unknown, K extends PropertyKey = keyof R | keyof RI | string> =
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
    | CustomFieldConfig<R, RI, K>
    | RepeaterFieldConfig<R, RI, K>;

export type UpdateRowAction = (fd: FormData) => Promise<void>;
export type CreateRowAction<RI> = (row: RI) => Promise<void>;
