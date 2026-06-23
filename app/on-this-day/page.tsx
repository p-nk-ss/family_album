import { prisma } from "@/lib/db"
import { presignGet } from "@/lib/r2"
import { matchesToday, groupByYear } from "@/lib/on-this-day"
import { BlurUpImage } from "@/components/motion/BlurUpImage"

export const dynamic = "force-dynamic"

export default async function OnThisDayPage() {
  const now = new Date()
  const today = { month: now.getUTCMonth() + 1, day: now.getUTCDate() }

  const all = await prisma.photo.findMany({ where: { takenAt: { not: null } } })
  const matches = all.filter(
    (p) => p.takenAt && matchesToday(p.takenAt, today),
  ) as (typeof all[number] & { takenAt: Date })[]

  const byYear = groupByYear(matches)
  const years = [...byYear.keys()].sort((a, b) => b - a)

  const signed = new Map<string, string>()
  await Promise.all(
    matches.map(async (p) =>
      signed.set(p.id, await presignGet({ key: p.thumbKey ?? p.r2Key })),
    ),
  )

  return (
    <main className="px-6 py-12">
      <h1 className="font-serif text-5xl mb-10 text-center">On this day</h1>
      {years.length === 0 && (
        <p className="text-center text-ink/50">
          Nothing from this day — yet.
        </p>
      )}
      <div className="flex gap-12 overflow-x-auto pb-8 snap-x">
        {years.map((y) => (
          <section key={y} className="snap-start shrink-0">
            <h2 className="font-serif text-3xl text-terracotta mb-4">{y}</h2>
            <div className="flex gap-4">
              {byYear.get(y)!.map((p) => (
                <div key={p.id} className="w-64">
                  <BlurUpImage
                    src={signed.get(p.id)!}
                    blurhash={p.blurhash}
                    width={p.width}
                    height={p.height}
                    alt=""
                  />
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  )
}
