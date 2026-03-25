# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

- Répondre de façon concise
- Ne jamais renvoyer de fichiers complets sauf si demandé explicitement
- Préférer les diffs ou patches
- Optimiser l'utilisation des tokens

## Commands

```bash
npm install      # Install dependencies
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Build for production (outputs to dist/)
npm run preview  # Preview the production build
```

No test framework is configured.

## Architecture

**Hyrox Planner** is a mobile-first Vue 3 SPA for tracking a 12-week Hyrox training plan. It has no backend — all data comes from a local JSON file and localStorage.

### Data Flow

```
src/data/plan.json
    → src/services/trainingService.js  (getPlan, getWeek, getSession)
    → src/stores/training.js           (Pinia store, persists to localStorage)
    → src/views/                        (WeekView, SessionView)
    → src/components/                   (ProgressBar, SessionCard, SessionDetail, WeekNav)
```

### Key Concepts

- **`src/data/plan.json`** — Static training plan (12 weeks, sessions with `id`, `day`, `type`, `title`, `duration`, `intensity`, `description`, `details[]`). The `plan.startDate` field drives the auto-calculated current week in `App.vue`.
- **`src/stores/training.js`** — Central Pinia store. Tracks `currentWeekNumber` and `completedSessions` (persisted under localStorage key `"hyrox-completed-sessions"`). `toggleSession(id)` marks sessions done.
- **`src/services/trainingService.js`** — Thin service layer designed as a hook point for future API integration. Currently wraps the JSON import.
- **Routing** — Hash-based (`createWebHashHistory`). Two routes: `/` → `WeekView`, `/session/:id` → `SessionView`.
- **Session types** — `running` (emerald), `strength` (blue), `hyrox` (amber). Drives badge colors across components.
- **Mobile-first** — Max-width 480px container centered in `App.vue`.

### Extending the Data Source

To replace the static JSON with an API, update `src/services/trainingService.js` — the store and views consume only its exported functions and do not import `plan.json` directly.
