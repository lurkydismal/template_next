// Pure helpers (no "use server") so they can be exported synchronously and unit tested.
type MutationRow = Record<string, unknown>;

/**
 * Columns the server owns. Client-supplied values are discarded so a user cannot forge
 * authorship, edit history, or timestamps (both property and physical column names).
 */
const SERVER_OWNED_COLUMNS = [
    "author_id",
    "authorId",
    "last_editor_id",
    "lastEditorId",
    "created_at",
    "createdAt",
    "updated_at",
    "updatedAt",
] as const;

/** Removes server-owned columns from client input. */
export function stripServerOwnedColumns(row: MutationRow): MutationRow {
    const clean = { ...row };
    for (const column of SERVER_OWNED_COLUMNS) delete clean[column];
    return clean;
}

export function toDbMutation(
    parsedRow: MutationRow,
    actorId: string,
    isUpdate: boolean,
): MutationRow {
    return {
        ...stripServerOwnedColumns(parsedRow),
        ...(isUpdate ? {} : { author_id: actorId }),
        last_editor_id: actorId,
    };
}
