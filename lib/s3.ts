import { S3Client, PutObjectCommand, GetObjectCommand, ListObjectsV2Command, DeleteObjectCommand } from "@aws-sdk/client-s3";

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

export async function listReservationKeys(prefix = "reservations/") {
  const res = await client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix }));
  return (res.Contents || []).map(o => o.Key!).filter(Boolean);
}