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

## Where it is defined

The triggers live in the custom migration `drizzle/…_audit_and_updated_at_triggers`
(they cannot be generated from `schema.ts`). A database without that migration has no
audit trail; `/api/health/ready` reports it as not ready.

| Object                        | Purpose                                                                                                   |
| ----------------------------- | --------------------------------------------------------------------------------------------------------- |
| `tables_set_updated_at`       | `BEFORE UPDATE`: sets `updated_at` only when the row really changed, ignoring writer-supplied values.     |
| `tables_record_field_changes` | `AFTER INSERT/UPDATE/DELETE`: writes the tuples above in the same transaction. No-op updates log nothing. |
| `record_changes_append_only`  | `BEFORE UPDATE/DELETE` on `record_changes`: rejects every change except clearing `actor_id` (see below).  |

## Integrity guarantees

- The application never chooses the actor: `actor_id` comes from `last_editor_id`, which the server
  sets from the authenticated session. Client-supplied authorship columns are discarded.
- `record_changes` is append-only for all roles, including the application's runtime role. Rows can be
  neither rewritten nor deleted by ordinary SQL.
- **Deleting a user account** clears `author_id` / `last_editor_id` on their rows (`ON DELETE SET NULL`),
  which is itself recorded, with a `NULL` actor because that user no longer exists. The foreign key
  `record_changes.actor_id` is also set to `NULL`; this is the only update the append-only trigger permits,
  and only when nothing else in the row changes.
- Audit history therefore outlives accounts, but identifies former actors only until their account is deleted.

Superusers and the table owner can still disable or drop triggers; protect those credentials accordingly
(the runtime role cannot, which is verified by the integration tests).
