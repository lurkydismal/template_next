import { Dayjs } from "dayjs";
import { createInsertSchema, createSelectSchema, createUpdateSchema } from "drizzle-orm/zod";
import z from "zod";

import { user } from "@/db/schema";
import { DbTarget, TABLES } from "@/lib/types";
import dayjs from "@/utils/dayjs";

export const emptyToNull = <T extends z.ZodType>(schema: T) =>
    z.preprocess((val) => (val === "" ? null : val), schema.nullable());

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

export const userSelectSchema = createSelectSchema(user);
export const userInsertSchema = createInsertSchema(user);
export const userUpdateSchema = createUpdateSchema(user);
export const userSelectPublicSchema = userSelectSchema
    .omit({
        id: true,
        createdAt: true,
        updatedAt: true,
    })
    .extend({
        name: z.string().trim().min(1),
    });

export const mutationInputSchema = z.record(z.string(), z.unknown()).and(
    z.object({
        id: z.coerce.number().int().positive().optional(),
    }),
);

export const registerUserSchema = z.object({
    name: z.string(),
    email: z.email(),
    password: z.string(),
});
export const loginUserSchema = z.object({
    email: z.email(),
    password: z.string(),
    remember: z.boolean().optional(),
});

export const DbTargetSchema = z.enum(Object.keys(TABLES) as [DbTarget, ...DbTarget[]]);
