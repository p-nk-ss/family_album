# CLAUDE.md

Проект `family_albums` — будущее веб-приложение. Анимации реализуются через **framer-motion**.

## framer-motion

- Установлено: `framer-motion@12.40.0` (`npm install framer-motion`).
- Peer-зависимости: `react` и `react-dom` (≥18). Их нужно добавить, когда появится React/Next.js.
- Бренд переименован в **motion**. Пакет `framer-motion` продолжает работать и обновляться; новый рекомендуемый пакет — `motion` с импортом из `motion/react`. В этом проекте используем `framer-motion` (как установлено). Соответствие путей:
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
