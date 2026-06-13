# LogiCora — Design System (v1)

> **Paste this whole file into v0 / any AI design tool BEFORE the feature prompt.**
> It is the single source of truth. Do NOT invent new colors, spacings, or radii — use only what is below. These tokens already exist in the codebase (`client/src/index.css`, Tailwind v4 `@theme`).

---

## 0. The Vibe

LogiCora is **not a dashboard** — it's a **gamified AI learning universe** for students aged **10–25**.
Feel = **Duolingo (warmth) + Discord (social) + Notion (clean) + AAA game lobby (power)**.
Three golden rules:
1. Every screen has **one dopamine moment** (XP fills, streak fire, level-up).
2. **Logi & Cora** (the AI companions) are always alive — they react, never static.
3. **Mobile-first.** Designed for one thumb. Desktop expands later.

---

## 1. Tech constraints (for the AI tool)

- **React + Tailwind CSS v4** (uses `@theme` custom properties, NOT a `tailwind.config.js` color map).
- Font is **Sora** (already loaded globally).
- Animations: **framer-motion** (`motion`, `useInView`) — already installed.
- Charts: **recharts** — already installed.
- Use the **existing utility class names** below where possible (`.card`, `.btn-primary`, etc.).
- Output plain React + Tailwind. Avoid pulling in new UI libraries (no MUI, no Chakra). shadcn-style markup is fine but keep it dependency-light.

---

## 2. Color tokens (use as Tailwind utilities)

In Tailwind v4 each `--color-x` becomes a utility (`bg-x`, `text-x`, `border-x`).

| Token | Hex | Utility | Use for |
|-------|-----|---------|---------|
| `bg-primary` | `#0D0D0D` | `bg-bg-primary` | App background |
| `bg-secondary` | `#111827` | `bg-bg-secondary` | Raised sections |
| `bg-card` | `rgba(255,255,255,.05)` | `bg-bg-card` | Cards (glassy) |
| `border` | `rgba(255,255,255,.1)` | `border-border` | All borders |
| `accent-green` | `#58CC02` | `bg-accent-green` | **PRIMARY brand / CTA / success** |
| `accent-purple` | `#9333EA` | `bg-accent-purple` | **SECONDARY brand / highlights** |
| `accent-cyan` | `#06B6D4` | `text-accent-cyan` | Info / links |
| `accent-orange` | `#F97316` | `text-accent-orange` | Streak / energy |
| `accent-pink` | `#EC4899` | `text-accent-pink` | Cora accents |
| `logi` | `#3B82F6` | `text-logi` | Logi companion (blue) |
| `cora` | `#9333EA` | `text-cora` | Cora companion (purple) |
| `text-primary` | `#FFFFFF` | `text-white` | Headlines |
| `text-secondary` | `#9CA3AF` | `text-text-secondary` | Muted text |
| `success/warning/danger` | `#10b981 / #f59e0b / #ef4444` | — | Status |
| Leagues | bronze `#cd7f32` · silver `#c0c0c0` · gold `#ffd700` · platinum `#e5e4e2` · diamond `#b9f2ff` | `text-gold` … | Rank tiers |

**Rules**
- Background is always `bg-bg-primary`. Cards always `bg-bg-card` + `border-border`.
- **Green `#58CC02` = primary action & XP/progress.** Purple `#9333EA` = secondary/highlight.
- Orange = streak/fire ONLY. Each color keeps its meaning — never decorative.

---

## 3. Typography (Sora)

| Role | Classes |
|------|---------|
| Hero / game title | `text-3xl sm:text-5xl font-extrabold tracking-tight` |
| Section heading | `text-lg font-bold` |
| Big number (XP, level, rank) | `font-black tabular-nums` (digits must not jump) |
| Body | `text-sm font-medium text-white/80` |
| Muted | `text-xs text-text-secondary` |

Scale: `text-xs(12) · sm(14) · base(16) · lg(18) · xl(20) · 3xl(30) · 5xl(48)`.

---

## 4. Spacing, radius, elevation

- **Spacing scale (only these):** `gap/​p/​m` of `1·2·3·4·6·8` (4–32px). No `p-5`-off-grid randomness beyond this.
- **Radius:** card `rounded-2xl` (16px, `--radius-card`) · button `rounded-xl` (10px, `--radius-btn`) · pill `rounded-full`.
- **Elevation:** raised → `shadow-[0_8px_30px_rgba(0,0,0,0.4)]`.
- **Glow (focus a key element):** `shadow-[0_0_24px_rgba(147,51,234,0.15)]` (purple) or green for success. (Existing class: `.card-glow`.)
- **Touch targets:** min height `h-11` (44px) for anything tappable.

---

## 5. Existing component classes (REUSE these)

```
.card          → glassy card: bg-bg-card, border, rounded-2xl, p-5, backdrop-blur
.card-glow     → card + purple glow
.btn-primary   → green CTA button
.btn-purple    → purple button
.btn-outline   → bordered ghost button
.input / .label
.badge-green / .badge-purple / .badge-gold → pill chips
```

---

## 6. New dashboard component patterns

**XP / progress bar (dopamine element)**
```tsx
<div className="h-3 bg-white/5 rounded-full overflow-hidden">
  <motion.div className="h-full rounded-full bg-gradient-to-r from-accent-green to-accent-cyan"
    initial={{ width: 0 }} animate={{ width: `${pct}%` }}
    transition={{ type: 'spring', stiffness: 60 }} />
</div>
```

**Quest card** — icon (circle) left · title + mini progress center · reward `⚡XP` right · on complete: green glow + ✓.

**Rank / clan row** — avatar · name · league badge · XP (`tabular-nums`) right · own row gets `ring-2 ring-accent-purple`.

**Streak flame** — `🔥` + `font-black tabular-nums text-accent-orange`, pulse animation when active.

**Stat tile** — `.card text-center`: big `font-black` number on top, muted label under.

---

## 7. Logi & Cora (AI companions) — visibility rules

- **Persistent:** floating widget bottom-right (already exists in the app).
- **Dashboard greeting strip (top):** companion avatar + contextual line, e.g. *"Salam! Bu gün 2 quest qalıb 🔥"*.
- **React to events:** on level-up / streak, widget animates + speaks (*"Əla! 5-ci səviyyə!"*).
- Selected companion tints the user's accent: **Logi → blue `#3B82F6`**, **Cora → purple `#9333EA`**.

---

## 8. Mobile-first dashboard layout

```
┌──────────────────────────────┐
│ Greeting strip + Logi/Cora    │  companion avatar + message
│ [ Level · XP bar · 🔥Streak ] │  status header (sticky top)
├──────────────────────────────┤
│ Today's Quests                │  horizontal-scroll cards
│ Clan / League snapshot        │  your rank + nearby players
│ Quick actions (2×2 grid)      │  Yarış · Dərslər · Portfolio · Mağaza
│ Social feed (mini)            │  friends' recent wins
└──────────────────────────────┘
   [ bottom nav: 5 icons ]        sticky bottom, mobile only
```

- **Desktop (`lg:`):** cards flow into a 12-column grid; add a left sidebar; bottom nav → sidebar.
- All text is **Azerbaijani** (e.g. *Yarış, Dərslər, Portfolio, Mağaza, Səviyyə, Sual*).

---

## 9. Motion guidelines

- Enter: `initial opacity-0 y-8` → `animate opacity-1 y-0`, stagger children by `i * 0.06`.
- Press: `active:scale-95 transition`.
- Numbers count up; bars spring-fill. Keep it snappy (≤ 0.4s) — energetic, not slow.

---

*Version 1 · keep this file updated as the design evolves. When generating any new screen, obey this document.*
