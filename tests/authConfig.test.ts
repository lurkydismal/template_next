import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import type { EnvSource } from "../src/lib/env";

import { MIN_AUTH_SECRET_LENGTH, resolveAuthConfig } from "../src/lib/auth/config";

const SECRET = "s".repeat(MIN_AUTH_SECRET_LENGTH);
const prod = (extra: EnvSource = {}): EnvSource => ({
    NODE_ENV: "production",
    BETTER_AUTH_SECRET: SECRET,
    BETTER_AUTH_URL: "https://app.example.test",
    ...extra,
});

describe("resolveAuthConfig", () => {
    it("is permissive in development: sign-up open, no secret required", () => {
        const config = resolveAuthConfig({ NODE_ENV: "development" });
        expect(config.signUpDisabled).toBe(false);
        expect(config.useSecureCookies).toBe(false);
        expect(config.secret).toBeUndefined();
    });

    it("disables sign-up by default in production and uses secure cookies", () => {
        const config = resolveAuthConfig(prod());
        expect(config.signUpDisabled).toBe(true);
        expect(config.useSecureCookies).toBe(true);
    });

    it("allows an explicit AUTH_DISABLE_SIGN_UP override in both directions", () => {
        expect(resolveAuthConfig(prod({ AUTH_DISABLE_SIGN_UP: "false" })).signUpDisabled).toBe(
            false,
        );
        expect(
            resolveAuthConfig({
                NODE_ENV: "development",
                AUTH_DISABLE_SIGN_UP: "true",
            }).signUpDisabled,
        ).toBe(true);
    });

    it("rejects a malformed AUTH_DISABLE_SIGN_UP instead of silently opening registration", () => {
        expect(() => resolveAuthConfig(prod({ AUTH_DISABLE_SIGN_UP: "no" }))).toThrow(
            /"true" or "false"/,
        );
    });

    it("refuses to start in production without a strong secret", () => {
        expect(() => resolveAuthConfig(prod({ BETTER_AUTH_SECRET: "" }))).toThrow(
            /BETTER_AUTH_SECRET/,
        );
        expect(() => resolveAuthConfig(prod({ BETTER_AUTH_SECRET: "short" }))).toThrow(
            new RegExp(`at least ${MIN_AUTH_SECRET_LENGTH}`),
        );
    });

    it("requires an https base URL in production", () => {
        expect(() =>
            resolveAuthConfig(prod({ BETTER_AUTH_URL: "http://app.example.test" })),
        ).toThrow(/https/);
        expect(() => resolveAuthConfig(prod({ BETTER_AUTH_URL: "" }))).toThrow(/https/);
    });

    it("tolerates http only for localhost in production and then avoids secure cookies", () => {
        const config = resolveAuthConfig(prod({ BETTER_AUTH_URL: "http://localhost:3000" }));
        expect(config.useSecureCookies).toBe(false);
        expect(() =>
            resolveAuthConfig(prod({ BETTER_AUTH_URL: "http://evil.example.test" })),
        ).toThrow(/https/);
    });

    it("enables the rate limiter in production unless explicitly turned off", () => {
        expect(resolveAuthConfig(prod()).rateLimitEnabled).toBe(true);
        expect(resolveAuthConfig(prod({ AUTH_RATE_LIMIT: "false" })).rateLimitEnabled).toBe(false);
        expect(resolveAuthConfig({ NODE_ENV: "development" }).rateLimitEnabled).toBe(false);
    });

    it("reads the secret from BETTER_AUTH_SECRET_FILE", () => {
        const file = path.join(mkdtempSync(path.join(tmpdir(), "auth-test-")), "secret");
        writeFileSync(file, `${SECRET}\n`);
        const config = resolveAuthConfig(
            prod({ BETTER_AUTH_SECRET: undefined, BETTER_AUTH_SECRET_FILE: file }),
        );
        expect(config.secret).toBe(SECRET);
    });

    it("always trusts the base URL once and never adds wildcards", () => {
        const config = resolveAuthConfig(
            prod({
                BETTER_AUTH_TRUSTED_ORIGINS: "https://app.example.test,https://app.example.test",
            }),
        );
        expect(config.trustedOrigins).toEqual(["https://app.example.test"]);
        expect(config.trustedOrigins.some((origin) => origin.includes("*"))).toBe(false);
    });
});
