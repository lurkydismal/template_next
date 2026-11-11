import dayjs, { type Dayjs } from "dayjs";
import z from "zod";

import { userMessages } from "@/utils/messages";

export const dateInputSchema = z
    .union([z.string(), z.date(), z.custom<Dayjs>((v) => dayjs.isDayjs(v))])
    .superRefine((v, ctx) => {
        if (!dayjs(v).isValid()) {
            ctx.addIssue({
                code: "custom",
                message: userMessages.validation.invalidDate,
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

export const mutationInputSchema = z.record(z.string(), z.unknown());

const authEmailSchema = z
    .string()
    .trim()
    .toLowerCase()
    .pipe(z.email(userMessages.validation.invalidEmail));

export const registerUserSchema = z.object({
    name: z.string().trim().min(1, userMessages.validation.nameRequired),
    email: authEmailSchema,
    password: z.string().min(8, userMessages.validation.passwordTooShort),
});
export const loginUserSchema = z.object({
    email: authEmailSchema,
    password: z.string().min(1, userMessages.validation.passwordRequired),
    remember: z.boolean().optional(),
});
