# База данных: Prisma 7 + Neon Postgres

Документация по слою БД проекта `family_albums`: как устроено подключение,
почему именно так, и на какие грабли не наступить. Стек: **Next.js (App Router)
+ Neon Postgres + Prisma ORM 7**.

> Главное, что нужно держать в голове: **Prisma 7 — это не Prisma 6.** Многие
> гайды из интернета описывают v6 и здесь не сработают (см. раздел «Отличия v7»).

---

## 1. Переменные окружения

Лежат в **`.env`** в корне (не в `.env.local` — Prisma CLI читает именно `.env`).

| Переменная              | Хост                          | Кто использует |
|-------------------------|-------------------------------|----------------|
| `DATABASE_URL`          | `…-pooler….neon.tech` (pooled)| **рантайм** приложения (Prisma Client) |
| `DATABASE_URL_UNPOOLED` | `….neon.tech` (без `-pooler`) | **Prisma CLI**: миграции, introspection |

**Почему две строки:**
- **Pooled** (`-pooler`, PgBouncer) — для рантайма: много коротких соединений
  из serverless-функций, пул бережёт лимит коннектов Neon.
- **Unpooled / direct** — для CLI: миграциям нужны session-level операции
  (advisory locks, DDL, shadow database), которые транзакционный пулер не
  поддерживает. Это прямой аналог старого `directUrl` из Prisma ≤6.

Загрузка env:
- **Next.js** грузит `.env` сам → `lib/db.ts` НЕ импортирует `dotenv`.
- **Prisma CLI** в v7 НЕ грузит `.env` автоматически → это делает
  `prisma.config.ts` через `import "dotenv/config"`.
- **Standalone-скрипты** (node/tsx) — должны сами сделать `import "dotenv/config"`
  первой строкой, до импорта `lib/db.ts`.

---

## 2. Где что настроено

### `prisma/schema.prisma`
```prisma
generator client {
  provider = "prisma-client"        // новый генератор v7 (не "prisma-client-js")
  output   = "../generated/prisma"  // клиент генерится СЮДА, не в node_modules
}

datasource db {
  provider = "postgresql"           // в v7 здесь НЕТ url и directUrl
}
```
- `url` и `directUrl` **убраны** из `datasource` в schema.prisma (см. v7).
- Сгенерированный клиент — это **TypeScript-исходники** в `generated/prisma/`
  (`client.ts`, `models.ts`, …), под git-ignore. Импорт `PrismaClient` идёт
  из `../generated/prisma/client`, **не** из `@prisma/client`.

### `prisma.config.ts` (корень)
```ts
import "dotenv/config";
import { defineConfig, env } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: {
    // CLI (migrate / db pull / db execute) ходит ПРЯМО, минуя pooler —
    // это замена старого datasource.directUrl.
    url: env("DATABASE_URL_UNPOOLED"),
  },
});
```

### `lib/db.ts` — единый клиент для рантайма
```ts
import { PrismaClient } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
  return new PrismaClient({ adapter })
}

const globalForPrisma = globalThis as unknown as {
  prisma?: ReturnType<typeof createPrismaClient>
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient()

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma
}
```
- **Driver adapter обязателен в v7** — `new PrismaClient()` без `adapter` падает.
- Адаптер — **`@prisma/adapter-pg`** (стандартный TCP через `pg`). Драйвер `pg`
  ставится сам как зависимость адаптера.
- Рантайм ходит по **pooled** `DATABASE_URL`.
- **Синглтон на `globalThis`**: в dev Next.js пере-вычисляет модули на каждом
  hot-reload; без кэша каждый reload открывал бы новый пул и выжрал лимит
  коннектов Neon. В проде — свежий инстанс на процесс.

Использование в коде: `import { prisma } from "@/lib/db"` (или относительным
путём, пока не настроен alias).

---

## 3. Модели и соглашения именования

- Модели — **PascalCase, ед. число** (`User`, `Photo`, `Album`, `AlbumPhoto`,
  `Comment`). Поля — **camelCase**.
- Реальные имена таблиц/колонок в БД — **snake_case** (как в `SPEC.md`), через
  `@@map` / `@map`. Пример: `avatarUrl String? @map("avatar_url")`,
  модель `User { … @@map("users") }`.
- **Идентификаторы:** `id String @id @default(uuid(7)) @db.Uuid` — UUIDv7
  (поддержка аргумента версии в `uuid()` есть с Prisma ≥5.14), нативный тип
  `uuid` в Postgres.
- **Таймстемпы:** `@default(now()) @db.Timestamptz`.
- **FK** разбит на пару «скаляр + relation»: например `created_by` →
  `createdById String @map("created_by")` + `createdBy User @relation(...)`.
  В БД остаётся одна колонка `created_by`.
- **`album_photos`** — явная модель m2m с составным PK: `@@id([albumId, photoId])`
  + поле `position Int` для ручного порядка.
- Типы из спеки: `text`→`String` (Postgres `text` по умолчанию),
  `text null`→`String?`, `text unique`→`@unique`, `int null`→`Int?`,
  `enum admin|member`→`enum Role { admin member }`.

Источник истины по полям — **`SPEC.md`, раздел «Data model»**. Сверх спеки не
добавлено: referential actions (`onDelete`/`onUpdate`) оставлены на дефолтах
Prisma; ручных индексов сверх авто-созданных нет.

---

## 4. Рабочие команды

```bash
# Изменил schema.prisma → создать и применить миграцию (dev):
npx prisma migrate dev --name <имя>

# Регенерировать клиент после правок схемы (migrate dev делает это сам,
# но с новым генератором иногда нужно явно):
npx prisma generate

# Проверить статус миграций / что БД в синхроне:
npx prisma migrate status

# Применить уже существующие миграции на проде (CI/deploy) — БЕЗ создания новых:
npx prisma migrate deploy

# Проверить валидность схемы (без обращения к БД):
npx prisma validate
```

### migrate dev vs db push vs generate
- **`migrate dev`** — генерит версионируемый SQL-файл в `prisma/migrations/`,
  применяет его и фиксирует в истории (`_prisma_migrations`). Это то, что
  коммитим в git и катим на прод (`migrate deploy`). Используем это.
- **`db push`** — толкает схему прямо в БД **без файлов и истории**. Только для
  черновых прототипов; на прод не годится.
- **`generate`** — БД не трогает, лишь генерит Prisma Client из схемы.

---

## 5. Как проверить, что подключение живо

```bash
# Прямое подключение (CLI / DATABASE_URL_UNPOOLED): валидно и доступно
npx prisma validate
printf 'SELECT 1;\n' | npx prisma db execute --stdin   # "Script executed successfully"
npx prisma migrate status                               # "Database schema is up to date!"
```

Для проверки **рантайм-пути** (pooled, через `lib/db.ts`) — временный
tsx-скрипт с `prisma.user.count()` / `prisma.$queryRaw\`SELECT 1\``. Такой
скрипт был, проверка прошла (`users count: 0`, `[{ ok: 1 }]`), затем удалён
вместе с dev-зависимостью `tsx`. При нужде воспроизводится за минуту.

### Где увидеть таблицы в Neon
[console.neon.tech](https://console.neon.tech) → проект → база `neondb`, схема
`public`, ветка `production`. Раздел **Tables** или **SQL Editor**:
`select tablename from pg_tables where schemaname='public';`
Ожидаемые: `users`, `photos`, `albums`, `album_photos`, `comments`,
`_prisma_migrations`.

---

## 6. Отличия Prisma 7 от v6 (почему чужие гайды врут)

| Тема | Prisma ≤6 | Prisma 7 (здесь) |
|------|-----------|------------------|
| `datasource.url` / `directUrl` | в `schema.prisma` | **убраны**; url для CLI → `prisma.config.ts` |
| Подключение CLI | авто из `.env` | `prisma.config.ts` + `import "dotenv/config"` |
| Driver adapter | опционально | **обязателен** в рантайме |
| Генератор | `prisma-client-js` | `prisma-client` (TS-исходники в `output`) |
| Импорт клиента | `@prisma/client` | `../generated/prisma/client` |

---

## 7. Грабли и заметки

- **`.env`, не `.env.local`** — Prisma CLI читает `.env`. Файл под git-ignore
  (содержит секреты R2 + строки БД).
- **`@prisma/adapter-pg`, не neon** — выбран ради простоты на Node 20: чистый
  TCP, без `ws`/`neonConfig`. Цена: не работает на Edge Runtime. Если позже
  понадобится Edge — переехать на `@prisma/adapter-neon` (+`ws` на Node 20).
- **SSL-warning от `pg`**: `sslmode=require` теперь трактуется как `verify-full`
  (строже). Сейчас безвредно. Если всплывут проблемы с сертификатом — задать
  `sslmode` в строке подключения явно.
- **`generated/prisma/` под git-ignore** — после `npm install` / clone нужно
  выполнить `npx prisma generate`, иначе импорт клиента не разрешится.
- **Порядок env в скриптах**: `import "dotenv/config"` строго до импорта
  `lib/db.ts` — адаптер читает `DATABASE_URL` в момент создания.
- **Node 20**: установлен на машине; часть пакетов просит Node ≥22 (EBADENGINE
  warnings) — пока работает, но при апгрейде окружения держать в уме.

---

## 8. Версии (на момент настройки)

`prisma` / `@prisma/client` / `@prisma/adapter-pg` — **7.8.0**.
Первая миграция: `prisma/migrations/20260622183321_init/`.
