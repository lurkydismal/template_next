import { RegisterOptions, UseFormReturn } from "react-hook-form";
import { FieldConfig } from "../types";
import z from "zod";

/**
 * Checks whether a value is considered empty for row dialog validation.
 * Treats null/undefined and whitespace-only string coercions as empty.
 * Note: object values stringify to "[object Object]" and will NEVER be
 * reported as empty here.
 */
function isEmptyValue(value: unknown) {
    return value === null || value === undefined || String(value).trim() === "";
}

/**
 * Validates a UUID string using the canonical 8-4-4-4-12 format.
 */
function validateUuidValue(value: unknown) {
    if (isEmptyValue(value)) return true;

    const uuidPattern =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

    return uuidPattern.test(String(value)) || "Enter a valid UUID value";
}

/**
 * Validates a hexadecimal value optionally prefixed by 0x.
 */
function validateHexValue(value: unknown) {
    if (isEmptyValue(value)) return true;

    const hexPattern = /^(0x)?[0-9a-f]+$/i;
    return hexPattern.test(String(value)) || "Enter a valid hex value";
}

/**
 * Converts validated number field input into a finite number.
 */
function parseFiniteNumber(value: unknown) {
    if (typeof value === "number") {
        return Number.isFinite(value) ? value : null;
    }

    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

/**
 * Validates that a number field contains a finite numeric value within any bounds.
 */
function validateNumberValue<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(value: unknown, field: FieldConfig<R, RI>) {
    if (isEmptyValue(value)) return true;

    const parsed = parseFiniteNumber(value);
    if (parsed === null) return "Enter a valid number";

    if (field.min !== undefined && parsed < field.min) {
        return `${field.label} must be greater than or equal to ${field.min}`;
    }

    if (field.max !== undefined && parsed > field.max) {
        return `${field.label} must be less than or equal to ${field.max}`;
    }

    return true;
}

// TODO: Move to schemas
const ipSchema = z.union([z.ipv4(), z.ipv6()]);

const portSchema = z.number().int().min(0).max(65535);

const normalizedString = z.preprocess(
    (value) => (value == null ? value : String(value).trim()),
    z.string(),
);

function hasValidHostPort(
    value: string,
    regex: RegExp,
    hostSchema: z.ZodTypeAny,
): boolean {
    const groups = value.match(regex)?.groups;
    if (!groups) return false;

    return (
        hostSchema.safeParse(groups.host).success &&
        portSchema.safeParse(Number(groups.port)).success
    );
}

/**
 * Validates inet values for IPv4/IPv6 addresses with optional ports.
 */
function validateInetValue(value: unknown, allowPort = false) {
    if (isEmptyValue(value)) return true;

    const rawValue = normalizedString.parse(value);

    if (
        allowPort &&
        (hasValidHostPort(
            rawValue,
            /^(?<host>(?:\d{1,3}\.){3}\d{1,3}):(?<port>\d{1,5})$/,
            z.ipv4(),
        ) ||
            hasValidHostPort(
                rawValue,
                /^\[(?<host>.+)\]:(?<port>\d{1,5})$/,
                z.ipv6(),
            ))
    ) {
        return true;
    }

    if (ipSchema.safeParse(rawValue).success) return true;

    return allowPort
        ? "Enter a valid IPv4/IPv6 value. For ports use IPv4:port or [IPv6]:port"
        : "Enter a valid IPv4 or IPv6 value";
}

async function validateTableLookupValue<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(
    value: unknown,
    field: FieldConfig<R, RI>,
    row: R,
    allValues: Record<string, unknown>,
) {
    if (!field.tableLookup || isEmptyValue(value)) return true;

    try {
        const exists = await field.tableLookup(value, row, allValues);

        return (
            exists ||
            field.tableLookupErrorMessage ||
            `${field.label} does not exist in the selected table`
        );
    } catch {
        return (
            field.tableLookupErrorMessage ||
            `${field.label} could not be verified against the selected table`
        );
    }
}

/**
 * Validates a grouped requirement for fields where at least N values are needed.
 */
function validateRequiredGroup<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(
    field: FieldConfig<R, RI>,
    fields: FieldConfig<R, RI>[],
    allValues: Record<string, unknown>,
    values: Record<string, unknown>,
) {
    if (!field.requiredGroup) return null;

    const minCount = field.requiredGroupMin ?? 1;
    const groupFields = fields.filter(
        (candidate) => candidate.requiredGroup === field.requiredGroup,
    );
    const providedCount = groupFields.reduce((count, candidate) => {
        const candidateValue =
            allValues[String(candidate.key)] ?? values[String(candidate.key)];

        return count + (isEmptyValue(candidateValue) ? 0 : 1);
    }, 0);

    if (providedCount < minCount) {
        return `Enter at least ${minCount} of: ${groupFields
            .map((candidate) => candidate.label)
            .join(", ")}`;
    }

    return null;
}

/**
 * Runs built-in validations derived from the selected field type.
 */
async function validateByFieldType<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(
    field: FieldConfig<R, RI>,
    value: unknown,
    row: R,
    allValues: Record<string, unknown>,
) {
    switch (field.type) {
        case "number":
            return validateNumberValue(value, field);

        case "uuid":
            return validateUuidValue(value);

        case "hex":
            return validateHexValue(value);

        case "inet":
            return validateInetValue(value, field.inetAllowPort);

        case "tableLookup":
            return validateTableLookupValue(value, field, row, allValues);

        default:
            return true;
    }
}

/**
 * Builds react-hook-form rules for an editable row dialog field.
 */
export function getFieldRules<
    R extends Record<string, unknown>,
    RI extends Record<string, unknown>,
>(
    field: FieldConfig<R, RI>,
    fields: FieldConfig<R, RI>[],
    form: UseFormReturn<Record<string, unknown>>,
    row: R,
    values: Record<string, unknown>,
): RegisterOptions<Record<string, unknown>, string> {
    if (field.readOnly) return {};

    return {
        required: field.required ? `${field.label} is required` : false,
        validate: async (value) => {
            const allValues = form.getValues();
            const groupError = validateRequiredGroup(
                field,
                fields,
                allValues,
                values,
            );

            if (groupError) return groupError;

            const typeValidation = await validateByFieldType(
                field,
                value,
                row,
                allValues,
            );
            if (typeValidation !== true) return typeValidation;

            if (field.validate) {
                return (await field.validate(value, row, allValues)) ?? true;
            }

            return true;
        },
    };
}
