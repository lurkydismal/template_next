# Field-level audit history

Changes to rows in `tables` are recorded automatically by the PostgreSQL
`tables_record_field_changes` trigger. This also captures writes that bypass
the Next.js mutation helpers. Audit entries are inserted in the same database
transaction as the row mutation.

## Storage format

`record_changes.changes` is a JSONB array of compact positional tuples:

```json
[
    ["text_field", "old text", "new text"],
    ["checkbox_field", false, true]
]
```

Each tuple is `[physical_column_name, previous_value, next_value]`. An insert
uses JSON `null` as the previous value; a delete uses JSON `null` as the next
value. Updates store only fields whose values actually changed. This avoids
copying the unchanged columns of an entire row and avoids repeating verbose
object keys for every old/new value pair. PostgreSQL JSONB storage and TOAST
compression apply automatically for larger entries.

The `record_key` column identifies the affected row (`{"id": 123}`),
`actor_id` references the row's `last_editor_id`, `operation` records the
mutation type, and `created_at` is the audit timestamp.
