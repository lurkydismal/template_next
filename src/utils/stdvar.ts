import { getEnv } from "./stdfunc";

/** Enable detailed trace logging when explicitly configured in code. */
export const needTrace = false;

export const isDev = getEnv("NODE_ENV", "development") === "development";
export const isBrowser = typeof window !== "undefined";
export const githubUrl = process.env.NEXT_PUBLIC_GITHUB_LINK || "#";
export const buildYear = new Date().getFullYear();
export const appName = "template_next";
export const appVersion = "0.1.0";
export const dateFormat = "DD.MM.YYYY";
export const dateTimeFormat = "HH:mm DD.MM.YYYY";
export const maxSnackbarCount = 5;
