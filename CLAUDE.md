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

---

## Migration Directus — état courant

L'app est en cours de migration vers une base **Directus 11** locale.

- URL : `http://localhost:8056`
- Token admin : `4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb`
- Scripts dans `scripts/` (tous en `.cjs` car `"type":"module"` dans package.json)

### Ce qui est fait ✓

**Schéma** (`scripts/create-directus-schema.cjs`) — 16 collections créées :
- `plans`, `weeks`, `sessions`, `session_details`, `athlete_profiles`
- `block_warmup`, `block_cooldown`, `block_circuit`, `block_mini_race`, `block_station_activation`, `block_strength`, `block_run`, `block_intervals`, `block_target_pace`, `block_brick_run`, `block_station_block`

**Données importées** (`scripts/import-to-directus.cjs`) — 19 semaines, 111 séances, 171 blocs.
- `sessions.slug` = id lisible original (ex: `"w1-hyrox-a"`)
- Les PKs sont des **integers auto-increment** (pas des UUIDs malgré la définition initiale)
- `sessions.week_id` est varchar et stocke l'integer en string (ex: `"12"`) — fonctionne
- `block_intervals.paceZone` nullable (séances simu sans zone)
- `block_station_block.brickFormat` est string (valeurs : standard, pyramid, follow_the_leader, emom)

**Liens inverses O2M** (`scripts/add-reverse-relations.cjs`) — fonctionnels :
- `plans.weeks` → liste les semaines d'un plan
- `plans.athletes` → liste les profils athlètes
- `weeks.sessions` → liste les séances d'une semaine

### Problème ouvert ⚠️

Le lien **M2A sessions → blocs** n'est pas encore opérationnel dans l'UI Directus.

Historique :
1. Ajout du champ alias `sessions.blocks` (M2A) → erreur "relationship not configured properly"
2. Tentative de fix → "Page Not Found" sur le détail session
3. Suppression de `sessions.blocks` pour stabiliser → détail session OK, mais blocs pas visibles

État actuel de `session_details.item` relation :
- `junction_field: "session_id"`, `one_collection_field: "collection"`, `one_allowed_collections: [...]`
- `one_field: "blocks"` — **cassé** (le champ sessions.blocks a été supprimé)
- À corriger : soit remettre `one_field: null`, soit recréer le champ proprement

**Approche recommandée pour la suite** : recréer le lien M2A directement via l'UI Directus :
> Data Model > sessions > Add field > Many to Any > junction: session_details, FK: item, collection field: collection

### Prochaine étape

Après avoir réparé le M2A, migrer `src/services/trainingService.js` pour lire depuis Directus :
- `GET /items/plans?fields=*,weeks.*,weeks.sessions.*`
- `GET /items/sessions/{slug}?filter[slug][_eq]={slug}&fields=*,blocks.*.*`

Le store et les vues n'ont pas besoin de changer — seul `trainingService.js` est à modifier.
