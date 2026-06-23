import { NextResponse } from "next/server"
import {
  ListObjectsV2Command,
  DeleteObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import { prisma } from "@/lib/db"
import { env } from "@/lib/env"
import { isOrphan } from "@/lib/reconcile"

export async function GET(request: Request) {
  if (
    request.headers.get("authorization") !==
    `Bearer ${env("CRON_SECRET")}`
  ) {
    return new NextResponse("Unauthorized", { status: 401 })
  }

  const s3 = new S3Client({
    region: "auto",
    endpoint: env("R2_ENDPOINT"),
    forcePathStyle: true,
    credentials: {
      accessKeyId: env("R2_ACCESS_KEY_ID"),
      secretAccessKey: env("R2_SECRET_ACCESS_KEY"),
    },
  })

  const bucket = env("R2_BUCKET")
  const photos = await prisma.photo.findMany({
    select: { r2Key: true, thumbKey: true },
  })
  const known = new Set<string>()
  photos.forEach((p) => {
    known.add(p.r2Key)
    if (p.thumbKey) known.add(p.thumbKey)
  })

  const now = new Date()
  let deleted = 0
  let token: string | undefined

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        ContinuationToken: token,
      }),
    )
    for (const obj of page.Contents ?? []) {
      if (
        obj.Key &&
        obj.LastModified &&
        isOrphan(obj.Key, known, obj.LastModified, now)
      ) {
        await s3.send(
          new DeleteObjectCommand({ Bucket: bucket, Key: obj.Key }),
        )
        deleted++
      }
    }
    token = page.IsTruncated ? page.NextContinuationToken : undefined
  } while (token)

  return NextResponse.json({ deleted })
}
