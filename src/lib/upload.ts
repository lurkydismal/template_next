"use server";

/**
 * Server-side file upload handler.
 *
 * Provides functions to validate and upload files to MinIO.
 * - Supports multiple logical upload targets, mapped to specific directories.
 * - Validates file type, size, and MIME before upload.
 * - Expects FormData from client with keys: "target", "filename", "file".
 * - Returns a standardized ActionResult indicating success or failure.
 *
 * Dependencies:
 *  - Zod for input validation
 *  - MinIO utility for file storage
 *  - Custom logging and environment utilities
 */

import log from "@/utils/stdlog";
import { uploadSchema } from "@/utils/validate/schemas";
import { uploadToMinio } from "@/utils/minio";
import { getEnv } from "@/utils/stdfunc";
import { ActionResult } from "@/lib/types";
import {
    UPLOAD_DIRS,
    UploadTarget,
    UploadTargetSchema,
} from "@/data/minioTargets";

const IMAGE_STORAGE_META: Record<
    string,
    { contentType: string; extension: string }
> = {
    "image/jpeg": { contentType: "image/jpeg", extension: ".jpg" },
    "image/png": { contentType: "image/png", extension: ".png" },
    "image/webp": { contentType: "image/webp", extension: ".webp" },
    "image/gif": { contentType: "image/gif", extension: ".gif" },
};

const DEFAULT_IMAGE_STORAGE_META = {
    contentType: "application/octet-stream",
    extension: ".bin",
} as const;

/**
 * Resolves storage metadata for validated image MIME types.
 *
 * Ensures the stored object extension and Content-Type stay in sync
 * with the upload validation result. Unknown values fall back to a
 * safe binary representation.
 *
 * @param mimeType - MIME type from validated file input
 * @returns Object containing normalized content type and extension
 */
function getImageStorageMeta(mimeType: string): {
    contentType: string;
    extension: string;
} {
    const normalizedType = mimeType.trim().toLowerCase();

    return IMAGE_STORAGE_META[normalizedType] ?? DEFAULT_IMAGE_STORAGE_META;
}

/**
 * Uploads a file to a MinIO bucket under the specified target directory.
 *
 * @param rawTarget - Logical upload target (must match one of UPLOAD_DIRS keys)
 * @param filename - Desired filename without extension
 * @param file - Raw file data (typically a File object from FormData)
 * @param bucket - MinIO bucket to upload to (defaults to env MINIO_BUCKET)
 * @returns ActionResult indicating success or failure
 */
async function upload(
    rawTarget: UploadTarget,
    filename: string,
    file: unknown,
    bucket: string = getEnv("MINIO_BUCKET"),
): Promise<ActionResult> {
    try {
        const target = UploadTargetSchema.parse(rawTarget);
        const path = UPLOAD_DIRS[target];
        if (!path) {
            throw new Error("Invalid upload target");
        }

        const parsed = uploadSchema.parse({ path, filename, file });

        const { contentType, extension } = getImageStorageMeta(
            parsed.file.type,
        );
        const arrayBuffer = await parsed.file.arrayBuffer();
        const fullFilename = `${parsed.filename}${extension}`;

        await uploadToMinio(
            bucket,
            fullFilename,
            Buffer.from(arrayBuffer),
            path,
            contentType,
        );

        return { ok: true, data: undefined };
    } catch (err) {
        // err is a ZodError on validation failure or other error
        log.error("Upload error:", err);

        return { ok: false, error: "Upload error" };
    }
}

/**
 * Server Action: receives FormData from client and handles upload.
 *
 * Expects FormData keys:
 *   - "target": string (logical upload target)
 *   - "filename": string (desired file name)
 *   - "file": File (binary file data)
 *
 * @param formData - FormData object from client
 * @returns Result of the upload operation
 */
export async function uploadAction(formData: FormData) {
    const rawTarget = formData.get("target");
    const filename = formData.get("filename");
    const file = formData.get("file");

    // Cast and delegate to main upload function
    return await upload(
        rawTarget as UploadTarget,
        filename as string,
        file as unknown,
    );
}
