# Family Albums

Приватная, по приглашениям, семейная фото-библиотека. Не клон Google Photos:
смысл — **альбомы-как-истории** (заголовок, описание, обложка, ручной порядок),
**семейный голос** (подписи и комментарии) и тёплая, бережная визуальная
идентичность с богатой анимацией. Всё — за авторизацией; публичного доступа к
фото нет.

## Стек

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind v4** (CSS-first `@theme`)
- **Neon** (Postgres, serverless) через **Prisma 7** — только метаданные
- **Cloudflare R2** (S3-совместимое, приватный бакет) — байты фото
- **Auth.js v5** — Google OAuth + email-allowlist, JWT-сессии
- **framer-motion** + **Lenis** — анимации и smooth-scroll
- Хостинг: **Vercel** (push-to-deploy)

Подробности архитектуры и конвенций — в [`CLAUDE.md`](./CLAUDE.md); видение и
модель данных — в [`SPEC.md`](./SPEC.md); слой БД — в [`PRISMA_NEON.md`](./PRISMA_NEON.md);
визуальный/motion-бриф — в [`DESIGN_PROMPT.md`](./DESIGN_PROMPT.md).

## Как устроена работа с файлами

Сервер никогда не проксирует байты. Браузер грузит фото **прямо в R2** по
presigned PUT (после проверки сессии и allowlist), а для отображения сервер
подписывает короткоживущие presigned GET. БД хранит только метаданные + R2-ключ.

## Разработка

```bash
npm install
cp .env.example .env   # заполнить секреты R2 / Neon / Google / AUTH_SECRET
npm run dev            # http://localhost:3000
```

Локально можно войти без Google: выставить `DEV_AUTH=true` и
`NEXT_PUBLIC_DEV_AUTH=true` в `.env` (email должен быть в `ALLOWLIST_EMAILS`).
В продакшене dev-вход недоступен по построению.

## Команды

```bash
npm run build   # prisma generate && next build
npm run lint
npm run test    # vitest run (unit)
npm run test:e2e
```

> ⚠️ `npm run test:int` (интеграционные) **трункейтит реальную БД** — не запускать
> против боевого Neon.

## Лицензия

Частный проект, не для распространения.
