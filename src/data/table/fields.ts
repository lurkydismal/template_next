import { FieldConfig } from "@/components/TableDataGrid/RowDialog";
import { TableRow, TableRowInsert } from "@/db/schema";

// simple fields for your schema (content is the only editable column)
const fields: FieldConfig<TableRow, TableRowInsert>[] = [
    {
        key: "content",
        label: "Content",
        type: "multiline",
        name: "content", // optional, defaults to key
        size: 12,
        required: true,
        // optional transform for putting value into FormData (not needed for plain strings)
        toFormValue: (v) => (v == null ? "" : String(v)),
    },
];

export default fields;
