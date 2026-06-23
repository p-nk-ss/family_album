import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env } from "@/lib/env"
import { assertUploadable } from "@/lib/validation"

let client: S3Client | null = null

function s3(): S3Client {
  if (client) return client
  client = new S3Client({
    region: "auto",
    endpoint: env("R2_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
    requestChecksumCalculation: "WHEN_REQUIRED",
  })
  return client
}

export async function presignPut(input: {
  key: string
  contentType: string
  contentLength: number
}): Promise<string> {
  assertUploadable({ contentType: input.contentType, sizeBytes: input.contentLength })
  const command = new PutObjectCommand({
    Bucket: env("R2_BUCKET"),
    Key: input.key,
    ContentType: input.contentType,
  })
  return getSignedUrl(s3(), command, { expiresIn: 300 })
}

export async function presignGet(input: { key: string; expiresIn?: number }): Promise<string> {
  const command = new GetObjectCommand({ Bucket: env("R2_BUCKET"), Key: input.key })
  return getSignedUrl(s3(), command, { expiresIn: input.expiresIn ?? 60 * 60 * 3 })
}

// Best-effort delete: a missing object must not block DB cleanup, so per-key
// failures are swallowed. Falsy keys are skipped.
export async function deleteObjects(keys: (string | null | undefined)[]): Promise<void> {
  const bucket = env("R2_BUCKET")
  await Promise.all(
    keys
      .filter((k): k is string => Boolean(k))
      .map((Key) =>
        s3()
          .send(new DeleteObjectCommand({ Bucket: bucket, Key }))
          .then(() => undefined)
          .catch(() => undefined),
      ),
  )
}
