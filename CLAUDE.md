# CLAUDE.md

`family_albums` — приватная, по приглашениям, семейная фото-библиотека. Не
конкурент Google Photos: key-дифференциатор — **альбомы-как-истории** (куратор-
ский заголовок/описание/обложка/ручной порядок), **семейный голос** (подписи и
комментарии) и **бережная тёплая визуальная идентичность** с богатой анимацией.

> **Источник правды:** `SPEC.md` (видение, модель данных, ключевые потоки, фазы).
> Визуальный/motion-бриф — `DESIGN_PROMPT.md`. Слой БД — `PRISMA_NEON.md`.
> Правило про версию Next.js — `AGENTS.md`.

## Стек

| Слой | Выбор |
| --- | --- |
| Фреймворк | Next.js 16 (App Router, Turbopack), React 19 |
| Язык | TypeScript 5 |
| Стили | Tailwind v4 (CSS-first `@theme` в `app/globals.css`, без конфиг-файла) |
| БД | Neon Postgres (serverless) через Prisma 7 — только метаданные, не байты |
| Хранилище | Cloudflare R2 (S3-совместимое), приватный бакет, `@aws-sdk/client-s3` |
| Auth | Auth.js v5 (`next-auth` beta), Google OAuth + allowlist, JWT-сессии |
| Анимации | framer-motion ^12.40, Lenis ^1.3.23 (smooth-scroll), lucide-react (иконки) |
| Валидация | zod 4 |
| Тесты | Vitest (unit), Playwright (e2e) |
| Хостинг | Vercel (push-to-deploy), cron `/api/cron/reconcile` |

## Архитектура и конвенции

- **Байты не проходят через сервер.** Загрузка: браузер генерит превью (canvas) →
  `POST /api/upload-url` (проверка сессии+allowlist, выдаёт presigned PUT) →
  браузер грузит прямо в R2 → `POST /api/photos` пишет строку в БД.
  Отдача: сервер подписывает короткоживущие presigned GET (превью в сетках,
  оригинал в детальном виде). Подпись — локальная крипто-операция, R2 не дёргает.
- **БД хранит только метаданные** + R2-ключ. Модель: `users`, `photos`, `albums`,
  `album_photos` (M2M + `position` для ручного порядка), `comments`.
- **Чистая логика — в `lib/*`** (юнит-тестируется): `r2.ts` (presignGet/Put/
  deleteObjects), `keys.ts`, `validation.ts`, `exif.ts`, `blurhash.ts`,
  `reorder.ts`, `on-this-day.ts`, `reconcile.ts`, `auth-allowlist.ts`, `env.ts`
  (читает обязательные env через `env("NAME")`). Route-хендлеры и серверные
  компоненты — тонкие обёртки.
- **Auth разнесён на два файла:** `auth.config.ts` — edge-safe (Google + dev
  Credentials + `signIn`-allowlist + session callback); `lib/auth.ts` —
  добавляет jwt-callback с upsert пользователя в БД. Сессии — JWT.
  Allowlist: `ALLOWLIST_EMAILS` (через запятую), `OWNER_EMAIL` → роль `admin`.
- **Dev-вход** (беспарольный) жёстко закрыт: провайдер регистрируется только при
  `NODE_ENV !== "production" && DEV_AUTH === "true"`, а кнопка на `/signin` —
  при `NODE_ENV !== "production" && NEXT_PUBLIC_DEV_AUTH === "true"`. В прод не
  переносить `DEV_AUTH` / `NEXT_PUBLIC_DEV_AUTH` / `DEV_LOGIN_EMAIL`.
- **framer-motion живёт в `"use client"`-островках** под `components/motion/*`
  (`SmoothScroll`, `Reveal`, `Parallax`, `Lightbox`, `ReducedMotionProvider`).
  Серверные компоненты держим без `"use client"`. Все motion-примитивы обязаны
  гейтить `prefers-reduced-motion` (см. `DESIGN_PROMPT.md` — это non-negotiable).

## Команды

```bash
npm run dev        # дев-сервер (Turbopack)
npm run build      # prisma generate && next build  ← гейт перед деплоем
npm run lint
npm run test       # vitest run (unit) — безопасно
npm run test:int   # ⚠️ интеграционные — ТРУНКЕЙТЯТ реальную БД, НЕ запускать
npm run test:e2e   # playwright
```

## Жёсткие правила (безопасность данных)

- **`.env` никогда не коммитить** (в `.gitignore`; содержит секреты R2 + Neon +
  Google + `AUTH_SECRET`).
- **Не запускать `test:int` / интеграционные тесты** — они трункейтят реальную
  Neon-БД с семейными фото пользователя.
- **Никаких bulk-операций против прод-Neon без явного разрешения** пользователя.
- **`graphify-out/`, `.agents/`, `.claude/settings.local.json`** — локальные/
  генерируемые, в гит не попадают (заигнорены).
- Push: `origin/main` → `github.com/p-nk-ss/family_album`. Коммит-сообщения
  заканчивать `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`.
- Прод Google OAuth (Vercel): redirect URI `https://<домен>/api/auth/callback/
  google`, выставить `AUTH_URL` (боевой домен) + `AUTH_TRUST_HOST=true`.
  Cron-роут требует `CRON_SECRET`, иначе reconcile отдаёт 401.

## Дизайн-система

Тёмная тема «вечер, фото светятся». Токены — в `@theme` в `app/globals.css`
(`--color-paper/ink/terracotta/danger`, editorial type-scale `--text-hero/h2`,
`.eyebrow`, hero-vignette, `--ease-hero`). Favicon — `app/icon.svg`.

> ⚠️ **Turbopack не хот-релоадит `@theme`.** После правки токенов: `rm -rf .next`
> + перезапуск дев-сервера.

## framer-motion

- Установлено: `framer-motion@^12.40` (рядом — `lenis` для smooth-scroll).
- Бренд переименован в **motion**; пакет `framer-motion` продолжает работать.
  Соответствие путей:
  | framer-motion          | motion (новое имя)      |
  | ---------------------- | ----------------------- |
  | `framer-motion`        | `motion/react`          |
  | `framer-motion/client` | `motion/react-client`   |
  | `framer-motion/m`      | `motion/react-m`        |

### Импорты

```js
// Клиентский код (компоненты с "use client"):
import { motion, AnimatePresence } from "framer-motion"

// Облегчённый компонент `m` (см. LazyMotion):
import * as m from "framer-motion/m"

// Готовые motion-компоненты, уже помеченные "use client" — для Server Components:
import * as motion from "framer-motion/client"
```

### "use client" (Next.js App Router / React Server Components)

`motion.*`, `AnimatePresence`, хуки (`useScroll`, `useTransform`, `useAnimate` и т.д.) используют состояние/эффекты браузера — это **клиентские** API.

- Любой файл, который импортирует `motion` из `framer-motion` и рендерит `<motion.div>`, **обязан** начинаться с директивы `"use client"` (самая первая строка файла, до импортов).
- Изолируй анимации в отдельные клиентские компоненты, а серверные компоненты держи без `"use client"` — так на клиент уходит меньше JS.
- Альтернатива: импортировать из `framer-motion/client` — эти компоненты уже помечены `"use client"`, поэтому их можно вставлять прямо в Server Component без своей директивы.

```tsx
"use client"

import { motion } from "framer-motion"

export function FadeIn({ children }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.div>
  )
}
```

### Базовый API

```tsx
<motion.div
  initial={{ opacity: 0 }}      // стартовое состояние (enter-анимация)
  animate={{ opacity: 1, x: 0 }} // целевое состояние, анимируется при изменении
  exit={{ opacity: 0 }}          // при удалении из DOM (нужен AnimatePresence)
  transition={{ ease: "easeOut", duration: 0.4 }}
  whileHover={{ scale: 1.05 }}   // жесты
  whileTap={{ scale: 0.95 }}
/>
```

### Variants (оркестрация состояний)

```tsx
const variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
}

<motion.div variants={variants} initial="hidden" whileInView="visible" />
```

### AnimatePresence (exit-анимации)

Оборачивает условно-рендеримые элементы, чтобы анимировать их удаление. Каждому элементу нужен уникальный `key`.

```tsx
"use client"
import { AnimatePresence, motion } from "framer-motion"

<AnimatePresence>
  {isVisible && (
    <motion.div
      key="modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    />
  )}
</AnimatePresence>
```

### LazyMotion — уменьшение бандла

Полный `motion` весит ~34kb. Компонент `m` + `LazyMotion` сокращают первый рендер до ~4.6kb, фичи догружаются лениво.

```tsx
"use client"
import { LazyMotion, domAnimation } from "framer-motion"
import * as m from "framer-motion/m"

// features: domAnimation (+15kb) — анимации, variants, exit, hover/tap/focus
//           domMax       (+25kb) — всё выше + drag/pan и layout-анимации
export function App({ children }) {
  return (
    <LazyMotion features={domAnimation}>
      <m.div animate={{ opacity: 1 }} />
      {children}
    </LazyMotion>
  )
}
```

Внутри `LazyMotion` используй `m.div`/`m.span` (не `motion.div`) — иначе фичи подтянутся целиком и экономия пропадёт.
