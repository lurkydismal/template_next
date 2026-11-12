import dayjs from "dayjs";
import { describe, expect, it } from "vitest";

import {
    dateInputSchema,
    ipSchema,
    loginUserSchema,
    mutationInputSchema,
    normalizedString,
    portSchema,
    registerUserSchema,
} from "../src/utils/validate/schemas";

describe("registerUserSchema", () => {
    it("normalizes name and email", () => {
        expect(
            registerUserSchema.parse({
                name: "  Ada  ",
                email: "  ADA@Example.TEST ",
                password: "12345678",
            }),
        ).toEqual({ name: "Ada", email: "ada@example.test", password: "12345678" });
    });

    it.each([
        ["blank name", { name: "   ", email: "a@b.co", password: "12345678" }, "Name is required."],
        [
            "bad email",
            { name: "A", email: "nope", password: "12345678" },
            "Enter a valid email address.",
        ],
        [
            "short password",
            { name: "A", email: "a@b.co", password: "1234567" },
            "Password must be at least 8 characters.",
        ],
    ])("rejects %s with a user-facing message", (_name, input, message) => {
        const result = registerUserSchema.safeParse(input);
        expect(result.success).toBe(false);
        expect(result.error?.issues.map((issue) => issue.message)).toContain(message);
    });

    it("does not trim passwords", () => {
        expect(
            registerUserSchema.parse({ name: "A", email: "a@b.co", password: "  12345678  " })
                .password,
        ).toBe("  12345678  ");
    });
});

describe("loginUserSchema", () => {
    it("accepts an optional remember flag", () => {
        expect(loginUserSchema.parse({ email: "A@B.co", password: "x", remember: true })).toEqual({
            email: "a@b.co",
            password: "x",
            remember: true,
        });
        expect(loginUserSchema.safeParse({ email: "a@b.co", password: "x" }).success).toBe(true);
    });

    it("requires a password and a valid email", () => {
        expect(loginUserSchema.safeParse({ email: "a@b.co", password: "" }).success).toBe(false);
        expect(loginUserSchema.safeParse({ email: "x", password: "p" }).success).toBe(false);
        expect(
            loginUserSchema.safeParse({ email: "a@b.co", password: "p", remember: "yes" }).success,
        ).toBe(false);
    });
});

describe("shared field schemas", () => {
    it("ipSchema accepts IPv4 and IPv6 only", () => {
        expect(ipSchema.safeParse("192.168.0.1").success).toBe(true);
        expect(ipSchema.safeParse("::1").success).toBe(true);
        expect(ipSchema.safeParse("256.1.1.1").success).toBe(false);
        expect(ipSchema.safeParse("example.com").success).toBe(false);
    });

    it("portSchema enforces an integer 0-65535 range", () => {
        for (const ok of [0, 80, 65535]) expect(portSchema.safeParse(ok).success).toBe(true);
        for (const bad of [-1, 65536, 1.5, "80"])
            expect(portSchema.safeParse(bad).success).toBe(false);
    });

    it("normalizedString trims and stringifies but keeps nullish values", () => {
        expect(normalizedString.parse("  x ")).toBe("x");
        expect(normalizedString.parse(12)).toBe("12");
        expect(normalizedString.safeParse(null).success).toBe(false);
    });

    it("dateInputSchema accepts strings, Dates and Dayjs and rejects garbage", () => {
        expect(dayjs.isDayjs(dateInputSchema.parse("2026-11-12"))).toBe(true);
        expect(dateInputSchema.parse(new Date("2026-11-12T00:00:00Z")).isValid()).toBe(true);
        expect(dateInputSchema.parse(dayjs("2026-11-12")).isValid()).toBe(true);
        const bad = dateInputSchema.safeParse("not a date");
        expect(bad.success).toBe(false);
        expect(bad.error?.issues[0]?.message).toBe("Invalid date.");
    });

    it("mutationInputSchema accepts plain records only", () => {
        expect(mutationInputSchema.safeParse({ a: 1 }).success).toBe(true);
        expect(mutationInputSchema.safeParse([1]).success).toBe(false);
        expect(mutationInputSchema.safeParse("x").success).toBe(false);
        expect(mutationInputSchema.safeParse(null).success).toBe(false);
    });
});
