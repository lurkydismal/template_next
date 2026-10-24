import z from "zod";
import {
    createInsertSchema,
    createSelectSchema,
    createUpdateSchema,
} from "drizzle-zod";
import { users } from "@/db/schema";
import { sanitizeFilename } from "@/utils/stdfunc";
import dayjs from "@/utils/dayjs";
import { Dayjs } from "dayjs";
import { allowedImageTypes, maxImageSize } from "@/utils/stdvar";
import {
    detectImageMimeType,
    ensureTrailingSlash,
    hasParentTraversal,
    normalizePathSeparators,
} from "./helpers";
import { DbTarget, TABLES } from "@/lib/types";
import { UPLOAD_DIRS, UploadTarget } from "@/data/minioTargets";

export const emptyToNull = <T extends z.ZodTypeAny>(schema: T) =>
    z.preprocess((val) => (val === "" ? null : val), schema.nullable());

export const filenameSchema = z.preprocess(
    (v) => sanitizeFilename(v),
    z.string().min(1, { message: "File name became incorrect" }),
);

export const pathSchema = z
    .string()
    .trim()
    .min(1)
    .transform((value) => normalizePathSeparators(value))
    .refine((p) => !p.startsWith("/"), "Must not start with '/'")
    .refine((p) => !hasParentTraversal(p), "Parent traversal not allowed")
    .transform((p) => ensureTrailingSlash(p));

export const fileSchema = z
    .object({
        arrayBuffer: z.any(),
        size: z.number().positive().max(maxImageSize, "File is too large"),
        type: z
            .string()
            .trim()
            .toLowerCase()
            .refine(
                (t) => allowedImageTypes.includes(t),
                "File type is not allowed",
            ),
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
            const bytes = new Uint8Array(ab);
            const detectedType = detectImageMimeType(bytes);

            if (!detectedType || !allowedImageTypes.includes(detectedType)) {
                ctx.addIssue({
                    code: "custom",
                    message: "Wrong file format",
                    path: ["arrayBuffer"],
                });
                return;
            }

            if (detectedType !== data.type) {
                ctx.addIssue({
                    code: "custom",
                    message: "File content does not match MIME type",
                    path: ["type"],
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

export const uploadSchema = z.object({
    filename: filenameSchema,
    path: pathSchema.optional(),
    file: fileSchema,
});

export const getFileSchema = z.object({
    filename: filenameSchema,
    path: pathSchema.optional(),
});

export const dateInputSchema = z
    .union([z.string(), z.date(), z.custom<Dayjs>((v) => dayjs.isDayjs(v))])
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

export const ipSchema = z.union([z.ipv4(), z.ipv6()]);

export const portSchema = z.number().int().min(0).max(65535);

export const normalizedString = z.preprocess(
    (value) => (value == null ? value : String(value).trim()),
    z.string(),
);

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

export const mutationInputSchema = z.record(z.string(), z.unknown()).and(
    z.object({
        id: z.coerce.number().int().positive().optional(),
    }),
);

export const registerUserSchema = z.object({ name: z.string(), email: z.email(), password: z.string() });
export const loginUserSchema = z.object({ email: z.email(), password: z.string(), remember: z.boolean().optional() });

export const DbTargetSchema = z.enum(
    Object.keys(TABLES) as [DbTarget, ...DbTarget[]],
);

export const UploadTargetSchema = z.enum(
    Object.keys(UPLOAD_DIRS) as [UploadTarget, ...UploadTarget[]],
);