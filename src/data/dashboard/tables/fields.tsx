import {
    Bookmark as BookmarkIcon,
    BookmarkBorder as BookmarkBorderIcon,
} from "@mui/icons-material";
import { TextField } from "@mui/material";
import { FieldConfig } from "@/components/TableDataGrid/RowDialog";
import {
    TablesRow as TableRow,
    TablesRowInsert as TableRowInsert,
} from "@/db/types";

/**
 * Renders the demo custom field with a plain MUI text input.
 */
function renderCustomField(
    value: unknown,
    setValue: (value: unknown) => void,
): React.ReactNode {
    return (
        <TextField
            fullWidth
            id="customField-custom"
            value={value == null ? "" : String(value)}
            onChange={(event) => setValue(event.target.value)}
        />
    );
}

/**
 * Converts selected file values into a stable string that can be stored in the table.
 */
function fileNameToFormValue(value: unknown): string | undefined {
    if (value instanceof File) return value.name;
    if (value == null || value === "") return undefined;

    return String(value);
}

/**
 * Mirrors selected file names back into form state so create and update both store strings.
 */
function syncSelectedFileName(value: unknown): Record<string, unknown> {
    return {
        fileField: value instanceof File ? value.name : value,
    };
}

/**
 * Verifies that the demo table lookup field references one of the seeded demo values.
 */
function tableLookupExists(value: unknown): boolean {
    return ["alpha", "bravo", "charlie"].includes(String(value));
}

// Demo fields include every built-in row-dialog field type once.
const fields: FieldConfig<TableRow, TableRowInsert>[] = [
    {
        key: "text_field",
        label: "Text",
        type: "text",
        size: 6,
        placeholder: "Single-line text",
    },
    {
        key: "multiline_field",
        label: "Multiline",
        type: "multiline",
        name: "content", // name in FormData. Optional, defaults to key
        size: 12,
        required: true,
        placeholder: "Required multiline content",
        // optional transform for putting value into FormData (not needed for plain strings)
        toFormValue: (v) => (v == null ? "" : String(v)),
    },
    {
        key: "markdown_field",
        label: "Markdown",
        type: "markdown",
        default: true,
        size: 12,
        placeholder: "**Markdown** _preview_",
        toggleCorner: "top-right",
    },
    {
        key: "custom_field",
        label: "Custom",
        type: "custom",
        size: 6,
        placeholder: "Custom renderer text",
        render: renderCustomField,
    },
    {
        key: "autocomplete_field",
        label: "Autocomplete",
        type: "autocomplete",
        size: 6,
        placeholder: "Option A",
        autocompleteOptions: ["Option A", "Option B", "Option C"],
    },
    {
        key: "date_field",
        label: "Date",
        type: "date",
        size: 4,
        placeholder: "2026-05-28",
    },
    {
        key: "time_field",
        label: "Time",
        type: "time",
        size: 4,
        placeholder: "12:00:00",
    },
    {
        key: "datetime_field",
        label: "Datetime",
        type: "datetime",
        size: 4,
        placeholder: "2026-05-28T12:00:00.000Z",
    },
    {
        key: "number_field",
        label: "Number",
        type: "number",
        size: 4,
        placeholder: 42,
        min: 0,
        max: 100,
    },
    {
        key: "uuid_field",
        label: "UUID",
        type: "uuid",
        size: 8,
        placeholder: "123e4567-e89b-42d3-a456-426614174000",
    },
    {
        key: "hex_field",
        label: "Hex",
        type: "hex",
        size: 4,
        placeholder: "0xCAFE",
    },
    {
        key: "inet_field",
        label: "Inet",
        type: "inet",
        size: 4,
        placeholder: "127.0.0.1:3000",
        inetAllowPort: true,
    },
    {
        key: "table_lookup_field",
        label: "Table lookup",
        type: "table-lookup",
        size: 4,
        placeholder: "alpha",
        lookup: tableLookupExists,
        tableLookupErrorMessage:
            "Use alpha, bravo, or charlie for this demo lookup",
    },
    {
        key: "file_field",
        label: "File",
        type: "file",
        size: 4,
        width: 200,
        height: 200,
        fileAccept: [".txt", "image/jpeg"],
        toFormValue: fileNameToFormValue,
        onValueChange: syncSelectedFileName,
    },
    {
        key: "checkbox_field",
        label: "Checkbox",
        type: "boolean",
        variant: "checkbox",
        size: 4,
    },
    {
        key: "checkbox_icon_field",
        label: "Checkbox Icon",
        type: "boolean",
        variant: "icon",
        default: true,
        icon: <BookmarkBorderIcon />,
        checkedIcon: <BookmarkIcon />,
        size: 4,
    },
    {
        key: "switch_field",
        label: "Switch",
        type: "boolean",
        variant: "switch",
        default: true,
        size: 4,
    },
    {
        key: "radio_group_field",
        label: "Radio group",
        type: "radio-group",
        size: 4,
    },
];

export default fields;
