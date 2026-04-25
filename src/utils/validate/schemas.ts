import { z } from "zod";
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from "drizzle-zod";
import { categories, users } from "@/db/schema";
import dayjs from "@/utils/dayjs";
import { Dayjs } from "dayjs";

export const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
    z.preprocess((val) => (val === "" ? null : val), schema.nullable());

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

/**
 * Category schemas for select, insert, and update operations.
 * - `categorySelectSchema` – full category selection
 * - `categoryInsertSchema` – insertion fields
 * - `categoryUpdateSchema` – update fields
 * - `categorySelectPublicSchema` – public-facing version with only name
 */
export const categorySelectSchema = createSelectSchema(categories);
export const categoryInsertSchema = createInsertSchema(categories);
export const categoryUpdateSchema = createUpdateSchema(categories);
export const categorySelectPublicSchema = categorySelectSchema
    .pick({ name: true })
    .extend({ name: z.string().trim().min(1) });

// TODO: Document
export const idSchema = z.number();

// TODO: Document
export const contentSchema = z.string();

// TODO: Document
export const rowSchema = z.object({
    id: idSchema.optional(),
    content: contentSchema,
});
