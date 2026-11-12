import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
    dbSslOption,
    readBoolEnv,
    readDbSsl,
    readEnv,
    readIntEnv,
    readListEnv,
    requireEnv,
} from "../src/lib/env";

function secretFile(contents: string): string {
    const file = path.join(mkdtempSync(path.join(tmpdir(), "env-test-")), "secret");
    writeFileSync(file, contents);
    return file;
}

describe("readEnv / requireEnv", () => {
    it("returns the direct value and prefers it over *_FILE", () => {
        const file = secretFile("from-file");
        expect(readEnv("X", { X: "direct", X_FILE: file })).toBe("direct");
    });

    it("reads *_FILE and strips exactly one trailing newline", () => {
        expect(readEnv("X", { X_FILE: secretFile("abc\n") })).toBe("abc");
        expect(readEnv("X", { X_FILE: secretFile("abc\r\n") })).toBe("abc");
        expect(readEnv("X", { X_FILE: secretFile("abc\n\n") })).toBe("abc\n");
    });

    it("treats an empty direct value as unset", () => {
        expect(readEnv("X", { X: "" })).toBeUndefined();
        expect(readEnv("X", {})).toBeUndefined();
    });

    it("fails closed on empty or unreadable secret files without leaking the path", () => {
        expect(() => readEnv("X", { X_FILE: secretFile("") })).toThrow(/X_FILE is empty/);

        const missing = "/definitely/not/here/secret";
        let message = "";
        try {
            readEnv("X", { X_FILE: missing });
        } catch (error) {
            message = (error as Error).message;
        }
        expect(message).toMatch(/Unable to read the file configured by X_FILE/);
        expect(message).not.toContain(missing);
    });

    it("requireEnv throws a descriptive error when missing", () => {
        expect(() => requireEnv("X", {})).toThrow("Missing required environment variable: X");
        expect(requireEnv("X", { X: "v" })).toBe("v");
    });
});

describe("readIntEnv", () => {
    it("returns the fallback when unset or blank", () => {
        expect(readIntEnv("N", 7, {}, {})).toBe(7);
        expect(readIntEnv("N", 7, {}, { N: "" })).toBe(7);
    });

    it("parses valid integers and enforces bounds", () => {
        expect(readIntEnv("N", 1, { min: 1, max: 10 }, { N: "10" })).toBe(10);
        expect(() => readIntEnv("N", 1, { min: 1, max: 10 }, { N: "11" })).toThrow(
            /between 1 and 10/,
        );
        expect(() => readIntEnv("N", 1, { min: 1, max: 10 }, { N: "0" })).toThrow(
            /between 1 and 10/,
        );
    });

    it.each(["-1", "1.5", "abc", "1e3", "0x10"])("rejects %s", (value) => {
        expect(() => readIntEnv("N", 1, {}, { N: value })).toThrow(/non-negative integer/);
    });
});

describe("readBoolEnv", () => {
    it("accepts only the literals true and false", () => {
        expect(readBoolEnv("B", false, { B: "true" })).toBe(true);
        expect(readBoolEnv("B", true, { B: "false" })).toBe(false);
        expect(readBoolEnv("B", true, {})).toBe(true);
        expect(() => readBoolEnv("B", true, { B: "yes" })).toThrow(/"true" or "false"/);
        expect(() => readBoolEnv("B", true, { B: "1" })).toThrow();
    });
});

describe("readListEnv", () => {
    it("splits, trims and de-duplicates", () => {
        expect(readListEnv("L", { L: " https://a , https://b,,https://a " })).toEqual([
            "https://a",
            "https://b",
        ]);
        expect(readListEnv("L", {})).toEqual([]);
    });
});

describe("DB_SSL", () => {
    it("defaults to disable (private Compose network)", () => {
        expect(readDbSsl({})).toBe("disable");
        expect(dbSslOption("disable")).toBe(false);
    });

    it("maps require/verify-full to node-postgres options", () => {
        expect(dbSslOption(readDbSsl({ DB_SSL: "require" }))).toEqual({
            rejectUnauthorized: false,
        });
        expect(dbSslOption(readDbSsl({ DB_SSL: "verify-full" }))).toEqual({
            rejectUnauthorized: true,
        });
    });

    it("rejects unknown modes", () => {
        expect(() => readDbSsl({ DB_SSL: "prefer" })).toThrow(/DB_SSL must be/);
    });
});
