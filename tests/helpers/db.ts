import { prisma } from "@/lib/db"

export async function resetDb() {
  await prisma.comment.deleteMany()
  await prisma.albumPhoto.deleteMany()
  await prisma.album.deleteMany()
  await prisma.photo.deleteMany()
  await prisma.user.deleteMany()
}

export async function seedUser(email = "test@example.com") {
  return prisma.user.create({ data: { email, name: "Test", role: "member" } })
}
