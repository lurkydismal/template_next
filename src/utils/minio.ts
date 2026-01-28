/**
 * Purpose:
 * - Create and export a configured MinIO `Client`.
 * - Ensure a specific bucket exists.
 * - Ensure that a stable "public-read for objects" bucket policy is applied (only if different).
 * - Export `minioInit` promise so callers may await readiness and `ensureBucketExists` for manual control.
 *
 * Behavior notes:
 * - Uses environment variables (via `getEnv`) for all runtime configuration.
 * - Validates `MINIO_PORT` via `getPort`.
 * - Compares policies using a canonical (stable) stringify to avoid unnecessary policy resets.
 * - Retries bucket existence check/create with exponential-ish backoff (linear backoff by attempt index).
 * - Logs actionable errors using `log` but rethrows on final failure so callers can decide how to handle startup failure.
 */

import { Client } from "minio";
import log from "@/utils/stdlog";
import { encodePath, getEnv, parseBool } from "@/utils/stdfunc";
import { pathSchema, filenameSchema } from "@/utils/validate/schemas";

/**
 * Parse and validate a port value read from an environment variable.
 *
 * @param value - The name of the environment variable containing the port (e.g. "MINIO_PORT")
 * @returns parsed port number
 * @throws Error if the value is not a finite positive number
 */
function getPort(value: string) {
    const p = Number(getEnv(value));

    if (!Number.isFinite(p) || p <= 0) throw new Error("Invalid MINIO_PORT");

    return p;
}

/* ---- Environment configuration ----
   These values are loaded at module initialization via getEnv (which logs + throws if missing).
   - endPoint: MinIO host (hostname or IP)
   - port: numeric port validated by getPort
   - accessKey / secretKey: credentials for server-side authenticated operations
   - useSSL: boolean flag to enable TLS (true when env value parses as truthy)
   - bucket: bucket name to ensure + manage policy for
*/
const endPoint = getEnv("MINIO_ENDPOINT");
const port = getPort("MINIO_PORT");
const accessKey = getEnv("MINIO_ACCESS_KEY");
const secretKey = getEnv("MINIO_SECRET_KEY");
const useSSL = parseBool(getEnv("MINIO_USE_SSL"));
const bucket = getEnv("MINIO_BUCKET");

/* ---- MinIO client instance ----
   Created once and exported as default. This `client` is used for bucket checks,
   policy reads/updates, and other S3-compatible operations.
*/
const client = new Client({
    endPoint,
    port,
    accessKey,
    secretKey,
    useSSL,
});

/* ---- desired policy (public-read for objects only) ----
   - Produces a policy object that grants anonymous GET on objects in the bucket.
   - No anonymous PutObject permission: uploads remain authenticated (using server credentials).
   - Includes GetBucketLocation for compatibility with some clients/tools.
*/
const desiredPolicyObj = {
    Version: "2012-10-17",
    Statement: [
        {
            Sid: "AllowPublicReadGetObject",
            Effect: "Allow",
            Principal: { AWS: ["*"] }, // everyone
            Action: ["s3:GetObject"],
            Resource: [`arn:aws:s3:::${bucket}/*`],
        },
        // optionally allow GetBucketLocation for compatibility:
        {
            Sid: "AllowPublicGetBucketLocation",
            Effect: "Allow",
            Principal: { AWS: ["*"] },
            Action: ["s3:GetBucketLocation"],
            Resource: [`arn:aws:s3:::${bucket}`],
        },
    ],
};

const desiredPolicyStr = JSON.stringify(desiredPolicyObj);

/* ---- stable stringify for canonical comparison ----
   stableStringify produces a deterministic string for objects/arrays so that two
   semantically-equal policy JSON objects compare equal even if key order differs.
   - Handles primitives, arrays, and plain objects.
   - Sorts object keys lexicographically for stability.
*/
function stableStringify(x: unknown): string {
    if (x === null || typeof x !== "object") return JSON.stringify(x);
    if (Array.isArray(x)) return "[" + x.map(stableStringify).join(",") + "]";

    const keys = Object.keys(x as Record<string, unknown>).sort();

    return (
        "{" +
        keys
            .map(
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                (k) => JSON.stringify(k) + ":" + stableStringify((x as any)[k]),
            )
            .join(",") +
        "}"
    );
}

/* ---- compare two policy JSON strings for semantic equality ----
   - Attempts to parse both strings and compare canonicalized forms.
   - Falls back to trimmed string comparison if parsing fails.
   - This prevents unnecessary calls to setBucketPolicy when existing policy is equivalent.
*/
function policyEquals(aStr: string, bStr: string): boolean {
    try {
        const a = JSON.parse(aStr);
        const b = JSON.parse(bStr);

        return stableStringify(a) === stableStringify(b);
    } catch {
        return aStr.trim() === bStr.trim();
    }
}

/**
 * Ensure bucket exists with simple retry/backoff.
 * Exported so other modules can await readiness if desired.
 *
 * Responsibilities:
 * - Ensure the bucket exists (create if missing).
 * - Read existing bucket policy, compare to desired policy, and set policy only if missing/different.
 *
 * Retries:
 * - The bucket existence check/create is retried `retries` times with increasing delay.
 * - Policy operations are attempted once after the bucket check; errors during set will be thrown.
 *
 * Notes on SDK differences:
 * - Some MinIO/AWS-S3 SDKs throw when the bucket has no policy; this code treats such errors as "no policy".
 * - If your SDK exposes different method names for policy operations, adapt calls accordingly.
 *
 * @param retries - number of attempts for bucket check/create (default 3)
 * @param baseDelayMs - base delay in ms used for backoff (multiplied by attempt index)
 */
async function ensureBucketExists(retries = 3, baseDelayMs = 500) {
    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            const exists = await client.bucketExists(bucket);

            if (!exists) {
                await client.makeBucket(bucket, "");
            }

            break;
        } catch (err) {
            log.error("MinIO: bucket check failed", err);

            if (attempt === retries) throw err;

            await new Promise((res) => setTimeout(res, baseDelayMs * attempt));
        }
    }

    // try to get existing policy
    let currentPolicyStr: string | null = null;

    try {
        // some SDKs throw if no policy; catch and treat as missing
        // method name: getBucketPolicy(bucket) -> returns string policy
        // if your minio SDK version uses a different name, adapt this call.
        // (most JS clients expose `getBucketPolicy` / `setBucketPolicy`).
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        currentPolicyStr = await client.getBucketPolicy(bucket);
    } catch (err) {
        // If error indicates "no policy" / 404-like, treat as missing and continue.
        log.error(
            typeof err === "object"
                ? "MinIO: getBucketPolicy failed"
                : "MinIO: getBucketPolicy failed",
            err,
        );

        currentPolicyStr = null;
    }

    // if missing or different, set policy
    if (
        !currentPolicyStr ||
        !policyEquals(currentPolicyStr, desiredPolicyStr)
    ) {
        try {
            // some SDKs expose setBucketPolicy / setBucketAcl names; this is the common call.
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            // @ts-ignore
            await client.setBucketPolicy(bucket, desiredPolicyStr);

            log.info(
                `MinIO: bucket policy applied to "${bucket}" (public-read for objects)`,
            );
        } catch (err) {
            log.error("MinIO: setBucketPolicy failed", err);

            throw err;
        }
    } else {
        log.info(`MinIO: bucket policy for "${bucket}" already up-to-date`);
    }
}

/* ---- initialization promise ----
   - minioInit runs ensureBucketExists immediately.
   - Rejections are logged and rethrown so application startup can opt to fail fast if desired.
   - Consumers may `await minioInit` to ensure the bucket & policy are ready before performing dependent work.
*/
const minioInit = ensureBucketExists().catch((err) => {
    // keep log minimal and actionable
    log.error("MinIO: init failed", err);

    throw err;
});

export default client;
export { minioInit, ensureBucketExists };

/**
 * Checks if a bucket exists in MinIO.
 *
 * Throws an error if the bucket does not exist or if there is a connectivity issue.
 *
 * @param bucket - Name of the MinIO bucket to check.
 * @returns Promise<void> - resolves if the bucket exists, rejects otherwise.
 */
export async function assertBucketExists(bucket: string): Promise<void> {
    const exists = await client.bucketExists(bucket);

    if (!exists) {
        throw new Error(`Bucket "${bucket}" does not exist`);
    }
}

/**
 * Constructs a MinIO object key from a directory path and filename.
 *
 * Behavior:
 * - Validates the filename using `filenameSchema` to ensure it is safe for storage.
 * - Optionally encodes the filename for use in URLs using `encodeURIComponent` if `needEncodeFilename` is true.
 * - Validates the directory path using `validateDirectory()` and encodes each path segment with `encodePath()`.
 * - Joins the encoded path and filename with a "/" to produce the final object key.
 * - If `path` is empty or not provided, the object key consists of only the filename.
 *
 * Notes:
 * - This function is used internally by both upload and URL generation functions to ensure consistency.
 * - Encoding of the filename is controlled separately from the path encoding to allow correct storage vs URL generation.
 *
 * Parameters:
 * @param path - Directory-like path (prefix) inside the bucket; may contain multiple segments separated by "/".
 * @param filename - Name of the file to store or access.
 * @param needEncodeFilename - If true, encodes the filename for URL safety; default is false.
 *
 * Returns:
 * - A string representing the full MinIO object key: either "encodedPath/filename" or just "filename" if path is empty.
 */
export function getObjectKey(
    filename: string,
    path?: string,
    needEncodeFilename: boolean = false,
) {
    const safeName = needEncodeFilename
        ? encodeURIComponent(filenameSchema.parse(filename))
        : filenameSchema.parse(filename);
    const encodedPath = path ? encodePath(pathSchema.parse(path)) : "";
    const objectKey = encodedPath ? `${encodedPath}/${safeName}` : safeName;

    return objectKey;
}

/**
 * Uploads a file buffer to a MinIO bucket under the specified path and filename.
 *
 * Notes:
 * - `validateFilename(filename)` ensures the filename is safe for storage.
 * - `encodePath(path)` is used to encode each segment of the path for safe storage.
 *   - This encodes spaces, special characters, etc., in path segments.
 *   - Encoding is applied only to path segments, not the filename itself.
 * - `objectKey` is the full key in MinIO: either "encodedPath/filename" or just "filename" if path is empty.
 * - `client.putObject` stores the file with the specified `Content-Type`.
 * - The function does not handle public URL generation; it only uploads the object.
 *
 * Parameters:
 * @param bucket - Name of the MinIO bucket.
 * @param path - Directory-like path (prefix) inside the bucket; may contain multiple segments separated by "/".
 * @param filename - Name of the file to store; validated by `validateFilename`.
 * @param buffer - File content as a Buffer.
 * @param contentType - Optional MIME type for the object; defaults to "application/octet-stream".
 */
export async function uploadToMinio(
    bucket: string,
    filename: string,
    buffer: Buffer,
    path?: string,
    contentType = "application/octet-stream",
) {
    await assertBucketExists(bucket);

    await client.putObject(
        bucket,
        getObjectKey(filename, path),
        buffer,
        buffer.length,
        {
            "Content-Type": contentType,
        },
    );
}

/**
 * Returns the HTTP URL to access a file stored in a MinIO bucket.
 *
 * Notes:
 * - If `isPublic` is true, a publicly accessible URL is returned.
 *   - The path is encoded using `encodePath`.
 *   - The filename is encoded using `encodeURIComponent` to make it URL-safe.
 *   - This ensures that spaces, special characters, and non-ASCII characters do not break the URL.
 * - If `isPublic` is false:
 *   - Returns a **presigned URL** that allows temporary access without credentials.
 *   - The URL expires after `expires` seconds (default 60 seconds).
 *   - Uses `client.presignedGetObject()` to generate the URL.
 *   - Optionally, the presigned URL can be generated relative to a specific `requestDate` if needed (not used here).
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
 * @param isPublic - If true, returns a publicly accessible URL; if false, returns a temporary presigned URL.
 * @param expires - Duration in seconds for which a presigned URL is valid (default 60 seconds); ignored if `isPublic` is true.
 *
 * Returns:
 * - A string URL pointing to the file:
 *   - Public URL if `isPublic = true`
 *   - Presigned URL with temporary access if `isPublic = false`
 */
export async function getFromMinio(
    bucket: string,
    filename: string,
    path?: string,
    isPublic: boolean = false,
    expires: number = 60, // One minute
) {
    await assertBucketExists(bucket);

    if (isPublic) {
        return `http://localhost:9000/${bucket}/${getObjectKey(filename, path, true)}`;
    } else {
        return client.presignedGetObject(
            bucket,
            getObjectKey(filename, path),
            expires,
        );
    }
}
