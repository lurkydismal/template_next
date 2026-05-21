import { RegisterOptions, UseFormReturn } from "react-hook-form";
import { FieldConfig } from "../types";

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
 * Validates that a number field contains a finite numeric value.
 */
function validateNumberValue(value: unknown) {
    if (isEmptyValue(value)) return true;

    if (typeof value === "number") {
        return Number.isFinite(value) || "Enter a valid number";
    }
    if (typeof value === "string") {
        const parsed = Number(value);
        return Number.isFinite(parsed) || "Enter a valid number";
    }
    return "Enter a valid number";
}

/**
 * Validates IPv4 addresses in dotted-decimal notation.
 */
function isValidIpv4Address(value: string) {
    const octets = value.split(".");

    if (octets.length !== 4) return false;

    return octets.every((octet) => {
        if (!/^\d{1,3}$/.test(octet)) return false;

        const parsed = Number(octet);
        return parsed >= 0 && parsed <= 255;
    });
}

/**
 * Validates IPv6 addresses, including compressed forms and IPv4-mapped endings.
 */
function isValidIpv6Address(value: string) {
    if (!value.includes(":")) return false;

    const hasDoubleColon = value.includes("::");
    if (value.indexOf("::") !== value.lastIndexOf("::")) return false;

    const [leftSide, rightSide = ""] = value.split("::");
    const leftGroups = leftSide ? leftSide.split(":") : [];
    const rightGroups = rightSide ? rightSide.split(":") : [];

    /**
     * Checks whether an IPv6 segment is a valid hexadecimal group.
     */
    function isHexGroup(group: string) {
        return /^[0-9a-f]{1,4}$/i.test(group);
    }

    /**
     * Converts an IPv4 tail to its two-group IPv6 equivalent for counting/validation.
     */
    function normalizeIpv4Tail(groups: string[]) {
        if (groups.length === 0) return { groups, ipv4Tail: false };
        const tail = groups[groups.length - 1];
        if (!tail.includes(".")) return { groups, ipv4Tail: false };

        if (!isValidIpv4Address(tail)) return { groups: [], ipv4Tail: true };

        return {
            groups: groups.slice(0, -1).concat(["ffff", "ffff"]),
            ipv4Tail: true,
        };
    }

    const leftNormalized = normalizeIpv4Tail(leftGroups);
    if (leftNormalized.ipv4Tail && leftNormalized.groups.length === 0)
        return false;
    const rightNormalized = normalizeIpv4Tail(rightGroups);
    if (rightNormalized.ipv4Tail && rightNormalized.groups.length === 0)
        return false;

    const normalizedLeft = leftNormalized.groups;
    const normalizedRight = rightNormalized.groups;
    const normalizedCount = normalizedLeft.length + normalizedRight.length;

    if (hasDoubleColon) {
        if (normalizedCount >= 8) return false;
    } else if (normalizedCount !== 8) {
        return false;
    }

    return normalizedLeft.concat(normalizedRight).every(isHexGroup);
}

/**
 * Validates inet values for IPv4/IPv6 addresses with optional ports.
 */
function validateInetValue(value: unknown, allowPort = false) {
    if (isEmptyValue(value)) return true;

    const rawValue = String(value).trim();

    if (allowPort) {
        const ipv4WithPort = rawValue.match(
            /^(?<host>(?:\d{1,3}\.){3}\d{1,3}):(?<port>\d{1,5})$/,
        );
        if (ipv4WithPort?.groups) {
            const port = Number(ipv4WithPort.groups.port);
            if (
                isValidIpv4Address(ipv4WithPort.groups.host) &&
                port >= 0 &&
                port <= 65535
            ) {
                return true;
            }
        }

        const ipv6WithPort = rawValue.match(
            /^\[(?<host>.+)\]:(?<port>\d{1,5})$/,
        );
        if (ipv6WithPort?.groups) {
            const port = Number(ipv6WithPort.groups.port);
            if (
                isValidIpv6Address(ipv6WithPort.groups.host) &&
                port >= 0 &&
                port <= 65535
            ) {
                return true;
            }
        }
    }

    if (isValidIpv4Address(rawValue) || isValidIpv6Address(rawValue))
        return true;

    return allowPort
        ? "Enter a valid IPv4/IPv6 value. For ports use IPv4:port or [IPv6]:port"
        : "Enter a valid IPv4 or IPv6 value";
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
    if (field.type === "number") return validateNumberValue(value);
    if (field.type === "uuid") return validateUuidValue(value);
    if (field.type === "hex") return validateHexValue(value);
    if (field.type === "inet")
        return validateInetValue(value, field.inetAllowPort);

    if (field.type === "tableLookup") {
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

    return true;
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
