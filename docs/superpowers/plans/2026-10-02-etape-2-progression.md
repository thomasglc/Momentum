# Étape 2, lot 1 — progression visible : plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Un accueil « Aujourd'hui » et un onglet « Progression » qui disent à l'athlète où il en est, quoi faire et ce qu'il a accompli.

**Architecture:** La logique de progression est un module pur testé (`utils/progress.js`). Un store `progress` charge les semaines du plan et les séries de l'athlète et expose les valeurs calculées ; les vues ne font qu'afficher. Aucun changement Directus.

**Tech Stack:** Vue 3, Pinia 2, vue-router 4, Tailwind 3, `node:test`.

Spec : `docs/superpowers/specs/2026-10-02-etape-2-progression-design.md`. Plan condensé : interfaces et étapes ; le code vit dans le dépôt.

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `src/utils/progress.js` (créé) | règles de progression, pures |
| `tests/progress.test.js` (créé) | leurs tests |
| `src/stores/progress.js` (créé) | chargement et valeurs calculées |
| `src/stores/training.js` | `today` dans le store, état du plan calculé |
| `src/stores/app.js` | onglet d'origine d'une séance |
| `src/services/trainingService.js` | `getAllWeeks()`, dates recalculées à la lecture du cache |
| `src/services/setLogService.js` | `fetchAllLogs()` |
| `src/views/TodayView.vue` (créé), `src/components/today/*` | accueil |
| `src/views/ProgressView.vue` (créé), `src/components/progress/*` | progression |
| `src/views/ProfileView.vue` (ex-`GuideView`), `StationsView.vue`, `LexiqueView.vue` | profil et ses sous-pages |
| `src/router/index.js`, `src/App.vue`, `src/views/SessionView.vue` | routes, onglets, retour |
| `src/views/PhasesView.vue` (retiré), `getPlanOverview`, `groupPhases` (retirés) | remplacés par la frise |

## Interfaces

```js
// src/utils/progress.js — `isDone(id)` dit si une séance est validée ; `today` vaut 'YYYY-MM-DD' ou null.
// Semaine : { weekNumber, phase, theme, isDeload, startDate, endDate, sessions: [{ id, day, optional, duration, … }] }
DAYS                                    // ['Lundi', …, 'Dimanche']
sessionDate(weekStart, day)             // → iso | null
weekCompletion(week, isDone)            // → { done, total, complete }   (séances obligatoires)
weekDays(week, isDone, today)           // → 7 × { day, letter, date, isToday, state, sessions }
                                        //   state : 'done' | 'todo' | 'late' | 'rest' | 'bonus'
focusSession(weeks, isDone, today)      // → { kind: 'today'|'late'|'next', session, week, date } | null
completeWeekStreak(weeks, isDone, { upTo, inProgress })   // → nombre de semaines
planTotals(weeks, isDone, today)        // → { sessionsDone, due, dueDone, adherence, minutes }
planTimeline(weeks, totalWeeks, isDone, { status, weekNumber })
  // → [{ number, written, phase, theme, isDeload, startDate, endDate, done, total, state }]
  //   state : 'done' | 'partial' | 'missed' | 'current' | 'upcoming' | 'none'
groupByPhase(entries)                   // → [{ phase, entries }]
toProgressSet(log)                      // ligne set_logs → { exerciseId, name, sessionId, weightKg, reps, durationSec, date }
exerciseProgress(sets)                  // → [{ exerciseId, name, unit: 'kg'|'reps'|'s', first, last, best, sessions, lastDate }]
totalVolumeKg(sets)
formatHours(minutes)                    // 580 → "9 h 40"
formatTonnage(kg)                       // 14200 → "14,2 t", 850 → "850 kg"

// src/stores/progress.js
weeks, sets, status                     // état : null tant que rien n'est chargé ; 'loading' | 'ready' | 'error'
load(), reset()
week, days, completion, focus, streak, totals, volumeKg, timeline, loads   // calculés

// src/stores/training.js
today                                   // 'YYYY-MM-DD', rafraîchi au retour au premier plan
planState, todayWeekNumber              // calculés depuis plan et today
refreshToday()

// src/services
getAllWeeks()                           // semaines écrites du plan avec leurs séances
fetchAllLogs(profileId)                 // séries de l'athlète, avec le nom de l'exercice
```

---

### Task 1 : logique pure (TDD)

**Files:** `src/utils/progress.js`, `tests/progress.test.js`, `src/utils/workout.js` (exporter le volume d'une série)

- [ ] Tests d'abord, sur un plan de trois semaines (muscu lundi-mercredi-vendredi, course mardi, mobilité optionnelle jeudi). Cas : jour d'une séance ; semaine complète avec et sans optionnelle ; les sept jours un mercredi (fait, en retard, aujourd'hui, à venir, repos, bonus) ; séance mise en avant dans l'ordre de priorité, avant le début du plan, sans calendrier, plan fini ; série de semaines avec semaine en cours incomplète ; totaux et assiduité ; frise avant, pendant, après, avec semaines non écrites ; charges en kg, en reps, en secondes ; formats.
- [ ] Voir les tests échouer, écrire le module, voir les tests passer.
- [ ] Commit : `feat(progression): règles de progression testées`.

### Task 2 : données

**Files:** `src/services/trainingService.js`, `src/services/setLogService.js`, `src/stores/training.js`, `src/stores/progress.js`, `src/utils/planCalendar.js`, `tests/planCalendar.test.js`

- [ ] `trainingService` : `getAllWeeks()` (deux requêtes partagées avec le préchargement, puis le cache) ; dates d'une semaine recalculées à la lecture du cache ; retirer `getPlanOverview`.
- [ ] `planCalendar` : retirer `groupPhases` et ses tests.
- [ ] `setLogService` : `fetchAllLogs()`.
- [ ] `training` : `today`, `planState` et `todayWeekNumber` calculés, `refreshToday()`.
- [ ] `progress` : store.
- [ ] Commit : `feat(progression): chargement des semaines et des séries`.

### Task 3 : navigation

**Files:** `src/router/index.js`, `src/App.vue`, `src/stores/app.js`, `src/views/SessionView.vue`, `scripts/build-icons.cjs`, `src/icons/ion.json`

- [ ] Routes `/`, `/programme`, `/progression`, `/profil`, `/profil/lexique`, `/profil/stations` ; redirections des anciennes.
- [ ] Onglets `Aujourd'hui · Programme · Progression · Profil`, libellés en 12 px ; l'onglet d'origine reste allumé sur une séance ; le retour y ramène.
- [ ] Icônes : `today-outline`, `person-outline` ; retirer celles qui ne servent plus.
- [ ] `App.vue` : `refreshToday()` quand l'app revient au premier plan.

### Task 4 : accueil

**Files:** `src/views/TodayView.vue`, `src/components/today/PlanHeader.vue`, `FocusCard.vue`, `WeekDots.vue`, `TotalsCard.vue`

- [ ] Quatre cartes, états du plan (pas commencé, en cours, semaine non écrite, terminé, sans calendrier), squelette et erreur.
- [ ] Commit : `feat(accueil): écran « Aujourd'hui »`.

### Task 5 : progression

**Files:** `src/views/ProgressView.vue`, `src/components/progress/PlanTimeline.vue`, `StatTiles.vue`, `LoadList.vue`, `PlanWeeks.vue` ; retirer `src/views/PhasesView.vue`

- [ ] Frise, tuiles, charges, semaines par phase.
- [ ] Commit : `feat(progression): onglet Progression`.

### Task 6 : profil et textes

**Files:** `src/views/ProfileView.vue` (renommé depuis `GuideView.vue`), `StationsView.vue`, `LexiqueView.vue`, `ChangePasswordView.vue`, `TutorialView.vue`

- [ ] Profil : date de course, lien vers les stations ; retour des sous-pages ; « Actualiser les données » vide aussi le store de progression.
- [ ] Tuto : l'accueil et les onglets décrits tels qu'ils sont.
- [ ] Commit : `feat(app): onglet Profil, tuto à jour`.

### Task 7 : vérification

- [ ] `npm test`, `npm run build`.
- [ ] Faux Directus local, validations et séries injectées : les états de la spec, console sans erreur, captures.
