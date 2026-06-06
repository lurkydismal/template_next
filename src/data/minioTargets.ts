import z from "zod";

/**
 * Mapping of logical upload targets to MinIO directory paths.
 * Used to determine where each file should be uploaded.
 */
export const UPLOAD_DIRS = {
    tables: "tables",
} as const;

export type UploadTarget = keyof typeof UPLOAD_DIRS;

export const UploadTargetSchema = z.enum(
    Object.keys(UPLOAD_DIRS) as [UploadTarget, ...UploadTarget[]],
);
