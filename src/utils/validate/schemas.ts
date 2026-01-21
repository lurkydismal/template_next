import { z } from "zod";
import { maxImageSize } from "@/utils/stdvar";
import { sanitizeFilename } from "@/utils/stdfunc";
import dayjs from "@/utils/dayjs";
import { Dayjs } from "dayjs";

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
function isJpegArrayBuffer(ab: ArrayBuffer) {
    const u8 = new Uint8Array(ab);

    if (u8.length < 4) return false;

    return (
        u8[0] === 0xff &&
        u8[1] === 0xd8 &&
        u8[u8.length - 2] === 0xff &&
        u8[u8.length - 1] === 0xd9
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
 * Schema for validating and sanitizing filenames.
 *
 * - Preprocesses the input using `sanitizeFilename`.
 * - Ensures the resulting string is non-empty.
 * - Throws if filename is invalid after sanitization.
 */
export const filenameSchema = z.preprocess(
    (v) => sanitizeFilename(v),
    z.string().min(1, { message: "File name became incorrect" }),
);

/**
 * Schema for validating a file path.
 *
 * - Must be a non-empty string.
 * - Must not start with "/".
 * - Must not contain backslashes "\".
 * - Must not contain ".." (parent traversal).
 * - Automatically appends a trailing "/" if missing.
 */
export const pathSchema = z
    .string()
    .min(1)
    .refine((p) => !p.startsWith("/"), "Must not start with '/'")
    .refine((p) => !p.includes("\\"), "Backslashes not allowed")
    .refine((p) => !p.includes(".."), "Parent traversal not allowed")
    .transform((p) => (p.endsWith("/") ? p : `${p}/`));

/**
 * Schema for validating a file-like object.
 *
 * Required properties:
 * - `arrayBuffer`: function returning an ArrayBuffer (File-like object)
 * - `size`: number, must not exceed `maxImageSize`
 * - `type`: string, must start with "image/"
 *
 * Async validation (`superRefine`) performs:
 * - Checks `arrayBuffer` exists and is a function
 * - Reads the buffer and validates JPEG magic bytes
 * - Adds issues if the file is missing, invalid, or unreadable
 */
export const fileSchema = z
    .object({
        arrayBuffer: z.any(),
        size: z.number().max(maxImageSize, "File is too large"),
        type: z
            .string()
            .refine((t) => t.startsWith("image/"), "File is not an image"),
    })
    .superRefine(async (data, ctx) => {
        if (typeof data.arrayBuffer !== "function") {
            ctx.addIssue({
                code: "custom",
                message: "File is not loaded",
                path: ["arrayBuffer"],
            });
            return;
        }

        try {
            const ab = await data.arrayBuffer();
            if (!isJpegArrayBuffer(ab)) {
                ctx.addIssue({
                    code: "custom",
                    message: "wrong file format",
                    path: ["arrayBuffer"],
                });
            }
        } catch {
            ctx.addIssue({
                code: "custom",
                message: "Unable to read file content",
                path: ["arrayBuffer"],
            });
        }
    });

/**
 * Combined upload schema.
 *
 * Fields:
 * - `filename`: validated and sanitized filename
 * - `path`: optional validated path
 * - `file`: validated file object
 *
 * Use `parse` for synchronous checks or `parseAsync` to run async validation (JPEG magic bytes).
 */
export const uploadSchema = z.object({
    filename: filenameSchema,
    path: pathSchema.optional(),
    file: fileSchema,
});

// TODO: Document
export const idSchema = z.number();

// TODO: Document
export const contentSchema = z.string();

// TODO: Document
export const rowSchema = z.object({
    content: contentSchema,
});
