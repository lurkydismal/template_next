import { FieldConfig } from "@/components/TableDataGrid/RowDialog";
import {
    TablesRow as TableRow,
    TablesRowInsert as TableRowInsert,
} from "@/db/types";

// simple fields for your schema (content is the only editable column)
const fields: FieldConfig<TableRow, TableRowInsert>[] = [
    {
        key: "content",
        label: "Content",
        type: "multiline",
        name: "content", // name in FormData. Optional, defaults to key
        size: 12,
        required: true,
        // optional transform for putting value into FormData (not needed for plain strings)
        toFormValue: (v) => (v == null ? "" : String(v)),
    },
];

export default fields;
