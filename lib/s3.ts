import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

const PROVIDER = process.env.STORAGE_PROVIDER ?? "S3";
export const BUCKET = process.env.BUCKET_NAME || process.env.AWS_S3_BUCKET!;


export async function deleteKey(key: string) {
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

function makeClient() {
  if (PROVIDER === "R2") {
    const accountId = process.env.CF_R2_ACCOUNT_ID!;
    const accessKeyId = process.env.CF_R2_ACCESS_KEY_ID!;
    const secretAccessKey = process.env.CF_R2_SECRET_ACCESS_KEY!;
    return new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
      forcePathStyle: true,
    });
  }
  // Fallback to AWS S3 if desired later
  return new S3Client({
    region: process.env.AWS_REGION!,
    credentials: process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY
      ? { accessKeyId: process.env.AWS_ACCESS_KEY_ID!, secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY! }
      : undefined,
  });
}

const client = makeClient();

async function streamToString(stream: any): Promise<string> {
  if (typeof stream?.transformToString === "function") return await stream.transformToString();
  return await new Promise((resolve, reject) => {
    const chunks: any[] = [];
    stream.on("data", (c: any) => chunks.push(c));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

export async function putJson(key: string, data: any) {
  const Body = Buffer.from(JSON.stringify(data));
  await client.send(new PutObjectCommand({ Bucket: BUCKET, Key: key, Body, ContentType: "application/json" }));
}

export async function getJson<T>(key: string): Promise<T | null> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await streamToString(res.Body as any);
    return JSON.parse(text) as T;
  } catch (e: any) {
    if (e?.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

/**
 * Fetches a JSON object without any type coercion.
 * Use this for lossless exports (NDJSON) to preserve ALL fields,
 * including unknown keys not in the current schema.
 */
export async function getRawJson(key: string): Promise<unknown | null> {
  try {
    const res = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
    const text = await streamToString(res.Body as any);
    return JSON.parse(text);
  } catch (e: any) {
    if (e?.$metadata?.httpStatusCode === 404) return null;
    throw e;
  }
}

/**
 * Checks if an object exists at the given key WITHOUT fetching its content.
 * Uses HeadObject for efficiency (no body transfer).
 *
 * SAFETY:
 * - Returns false for 404/NotFound/NoSuchKey
 * - THROWS on 401/403 (auth errors) — never silently ignore permission issues
 *
 * @param key - The S3 key to check
 * @returns Promise<boolean> - true if exists, false if not found
 */
export async function keyExists(key: string): Promise<boolean> {
  try {
    await client.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return true;
  } catch (e: any) {
    const status = e?.$metadata?.httpStatusCode;
    const errorName = e?.name || e?.Code || "";

    // 404 or NotFound/NoSuchKey = doesn't exist, return false
    if (
      status === 404 ||
      errorName === "NotFound" ||
      errorName === "NoSuchKey" ||
      errorName === "404"
    ) {
      return false;
    }

    // Auth errors (401, 403) must fail hard
    if (status === 401 || status === 403) {
      throw new Error(`S3 auth error (${status}): check credentials and bucket permissions`);
    }

    // Any other error: propagate
    throw e;
  }
}

/**
 * Lists ALL object keys under a given prefix, handling S3/R2 pagination.
 *
 * IMPORTANT: S3 ListObjectsV2 returns a maximum of 1000 objects per page.
 * This function iterates through all pages using ContinuationToken to ensure
 * no objects are silently missed. This is critical for users with large
 * numbers of reservations and for complete backup exports.
 *
 * @param prefix - The S3 key prefix to list (e.g., "users/<userId>/reservations/")
 * @returns Promise<string[]> - Array of all object keys under the prefix
 */
export async function listReservationKeys(prefix = "reservations/"): Promise<string[]> {
  const allKeys: string[] = [];
  let continuationToken: string | undefined;

  do {
    const response = await client.send(
      new ListObjectsV2Command({
        Bucket: BUCKET,
        Prefix: prefix,
        ContinuationToken: continuationToken,
      })
    );

    // Extract keys from this page, filtering out any undefined values
    const pageKeys = (response.Contents || [])
      .map((obj) => obj.Key)
      .filter((key): key is string => typeof key === "string");

    allKeys.push(...pageKeys);

    // Continue if there are more pages
    continuationToken = response.IsTruncated ? response.NextContinuationToken : undefined;
  } while (continuationToken);

  return allKeys;
}