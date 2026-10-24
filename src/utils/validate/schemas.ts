import { Dayjs } from "dayjs";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import { z } from "zod";

import { users } from "@/db/schema";
import dayjs from "@/utils/dayjs";

/**
 * Handles empty to null behavior.
 */
export const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
    z.preprocess((val) => (val === "" ? null : val), schema.nullable());

/**
 * Check whether an ArrayBuffer represents a valid JPEG image.
 *
 * - Looks for JPEG magic bytes:
 *   - Start: 0xFF 0xD8
 *   - End:   0xFF 0xD9
 * - Returns false if buffer is too short (<4 bytes).
 *
 * @param ab - The ArrayBuffer to check
 * @returns True if it matches JPEG magic bytes, false otherwise
 */
function isJpegArrayBuffer(ab: ArrayBuffer): boolean {
    const u8 = new Uint8Array(ab);

    if (u8.length < 4) return false;

    return (
        u8[0] === 0xff && u8[1] === 0xd8 && u8[u8.length - 2] === 0xff && u8[u8.length - 1] === 0xd9
    );
}

/**
 * Zod schema for validating date input.
 *
 * Accepts three types of values:
 * - `string` – a date string that Day.js can parse
 * - `Date` – a native JavaScript Date object
 * - `Dayjs` – an existing Day.js instance
 *
 * Validation behavior:
 * - `superRefine` runs a semantic check using `dayjs(v).isValid()`
 *   to ensure the value represents a valid date.
 * - If invalid, a Zod issue with the message "Invalid date" is added.
 *
 * Transformation behavior:
 * - `.transform((v) => dayjs(v))` converts all valid input types
 *   into a normalized Day.js instance.
 *
 * The schema is described as "Date input (string, Date, or Dayjs)" for
 * documentation and tooling purposes.
 */
export const dateInputSchema = z
    .union([
        z.string(),
        z.date(),
        // TODO: Maybe this
        // .refine(
        //     (d) => !Number.isNaN(d.getTime()),
        //     "Invalid date"
        // ),
        z.custom<Dayjs>((v) => dayjs.isDayjs(v)),
    ])
    .superRefine((v, ctx) => {
        if (!dayjs(v).isValid()) {
            ctx.addIssue({
                code: "custom",
                message: "Invalid date",
            });
        }
    })
    .transform((v) => dayjs(v))
    .describe("Date input (string, Date, or Dayjs)");

/**
 * User schemas for select, insert, and update operations.
 * - `userSelectSchema` – full user selection schema
 * - `userInsertSchema` – fields required for insertion
 * - `userUpdateSchema` – fields allowed for update
 * - `userSelectPublicSchema` – public-facing version excluding sensitive fields
 */
export const userSelectSchema = createSelectSchema(users);
export const userInsertSchema = createInsertSchema(users);
export const userUpdateSchema = createUpdateSchema(users);
export const userSelectPublicSchema = userSelectSchema
    .omit({
        id: true,
        password_hash: true,
        created_at: true,
        updated_at: true,
    })
    .extend({
        username: z.string().trim().min(1),
        username_normalized: z.string().trim().min(1).lowercase(),
    });

// TODO: Comment
export const mutationInputSchema = z.record(z.string(), z.unknown()).and(
    z.object({
        id: z.coerce.number().int().positive().optional(),
    }),
);
