import { FieldConfig } from "../types";

/**
 * Resolves an interconnected field value from a relation descriptor.
 */
function resolveInterconnectedRelationValue(
    relation: NonNullable<FieldConfig<Record<string, unknown>, Record<string, unknown>>["interconnected"]>["relation"],
    values: Record<string, unknown>,
) {
    if (!relation) return undefined;

    const sourceValue = values[relation.sourceField];
    if (sourceValue === undefined || sourceValue === null) return null;

    const relatedRow = relation.rows.find(
        (row) => row[relation.lookupField] === sourceValue,
    );

    if (!relatedRow) return null;
    return relatedRow[relation.valueField] ?? null;
}

/**
 * Computes the value for a single interconnected field.
 */
export async function resolveInterconnectedFieldValue<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(field: FieldConfig<R, RI>, row: R, values: Record<string, unknown>) {
    const interconnected = field.interconnected;
    if (!interconnected) return undefined;

    if (interconnected.getter) {
        return await interconnected.getter({ row, values });
    }

    return resolveInterconnectedRelationValue(
        interconnected.relation as NonNullable<
            FieldConfig<Record<string, unknown>, Record<string, unknown>>["interconnected"]
        >["relation"],
        values,
    );
}

/**
 * Checks whether a field should be treated as read-only in the UI.
 */
export function isFieldReadOnly<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(field: FieldConfig<R, RI>) {
    if (field.readOnly) return true;
    return field.interconnected?.makeReadOnly ?? false;
}

/**
 * Resolves all interconnected fields that depend on a changed field key.
 */
export async function resolveInterconnectedFieldUpdates<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(
    fields: FieldConfig<R, RI>[],
    row: R,
    values: Record<string, unknown>,
    changedFieldKey?: string,
) {
    const updates: Record<string, unknown> = {};

    for (const field of fields) {
        const interconnected = field.interconnected;
        if (!interconnected) continue;

        if (
            changedFieldKey &&
            !interconnected.dependsOn.includes(changedFieldKey)
        ) {
            continue;
        }

        const key = String(field.key);
        updates[key] = await resolveInterconnectedFieldValue(field, row, values);
    }

    return updates;
}
