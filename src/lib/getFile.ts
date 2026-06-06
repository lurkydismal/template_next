"use server";

import log from "@/utils/stdlog";
import { getFileSchema } from "@/utils/validate/schemas";
import { getFromMinio } from "@/utils/minio";
import { getEnv } from "@/utils/stdfunc";
import { ActionResult } from "@/lib/types";
import { UPLOAD_DIRS, UploadTargetSchema } from "@/data/minioTargets";

/**
 * Gets a file from a MinIO bucket under the specified target directory.
 *
 * @param rawTarget - Logical upload target (must match one of UPLOAD_DIRS keys)
 * @param filename - Desired filename without extension
 * @param bucket - MinIO bucket to get file from (defaults to env MINIO_BUCKET)
 * @returns ActionResult indicating success or failure
 */
async function getFile(
    rawTarget: unknown,
    filename: unknown,
    bucket: string = getEnv("MINIO_BUCKET"),
): Promise<ActionResult<Awaited<ReturnType<typeof getFromMinio>>>> {
    try {
        const target = UploadTargetSchema.parse(rawTarget);
        const path = UPLOAD_DIRS[target];
        if (!path) {
            throw new Error("Invalid upload target");
        }

        const parsed = getFileSchema.parse({ path, filename });

        return {
            ok: true,
            data: await getFromMinio(bucket, parsed.filename, parsed.path),
        };
    } catch (err) {
        // err is a ZodError on validation failure or other error
        log.error("Get file error:", err);

        return { ok: false, error: "Get file error" };
    }
}

/**
 * Returns the HTTP URL to access a file stored in a MinIO bucket.
 *
 * Notes:
 * - The function checks that the bucket exists via `assertBucketExists` before generating the URL.
 * - The `expires` parameter controls the validity period of the presigned URL.
 *   - Default is 60 seconds.
 *   - Maximum allowed by MinIO is 7 days (604800 seconds).
 *
 * Parameters:
 * @param bucket - Name of the MinIO bucket.
 * @param path - Directory-like path (prefix) inside the bucket; may contain multiple segments.
 * @param filename - Name of the file in the bucket.
 */
export async function getFileAction(formData: FormData) {
    const rawTarget = formData.get("target");
    const rawFilename = formData.get("filename");

    return getFile(rawTarget, rawFilename);
}
