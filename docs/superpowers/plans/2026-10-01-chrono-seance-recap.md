# Chrono de séance et récap — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Chronométrer une séance de muscu, lancer un compte à rebours de repos sonore à chaque série validée, afficher un récap à la validation.

**Architecture:** Un store Pinia `workout` porte la séance et le repos en cours et une horloge qui bat toutes les 250 ms ; il délègue les calculs à `utils/workout.js` (pur, testé) et le son à `utils/beep.js`. La barre et le récap sont des composants de présentation.

**Tech Stack:** Vue 3, Pinia 2, Tailwind 3, Web Audio, Screen Wake Lock, `node:test`.

Spec : `docs/superpowers/specs/2026-10-01-chrono-seance-recap-design.md`. Plan condensé, comme le précédent.

---

## Interfaces

```js
// src/utils/workout.js
formatClock(totalSec)              // 65 → "1:05" ; 3725 → "1:02:05" ; négatif ou absent → "0:00"
elapsedSeconds(startedAt, now)     // secondes entières, jamais négatif
remainingSeconds(endsAt, now)      // arrondi supérieur, jamais négatif
isStale(startedAt, now)            // plus de 6 h
restProgress(totalSec, remaining)  // 0..1
strengthLinesOf(structuredDetails) // lignes des blocs de muscu, dans l'ordre
summarizeWorkout(lines, sets)      // { setsDone, setsPlanned, totalReps, volumeKg, exercises: [{ lineId, name, summary, volumeKg }] }
formatKg(n)                        // 1250 → "1 250 kg"

// src/stores/workout.js
sessionId, rest, isRunningFor(id), elapsed, restRemaining, restRatio, restJustDone
start(id), ensureStarted(id), finish(id) → durationSec | null
unlockSound(), startRest(totalSec, label), adjustRest(deltaSec), skipRest()
```

### Task 1 : logique pure (TDD)

**Files:** `src/utils/workout.js`, `tests/workout.test.js`

- [ ] Tests d'abord, les voir échouer, implémenter. Cas : horloge avec et sans heures, valeurs négatives ; secondes écoulées et restantes aux bornes ; séance abandonnée ; progression du repos bornée ; lignes de muscu extraites d'une séance mixte ; récap avec charge, sans charge, en durée, sans aucune série, exercices dans l'ordre du programme ; kilos avec séparateur de milliers.
- [ ] Commit : `feat(seance): logique du chrono et du récap`.

### Task 2 : son et store

**Files:** `src/utils/beep.js`, `src/stores/workout.js`

- [ ] `beep.js` : `unlockAudio()` (à appeler dans un geste), `playBeep()` (sans effet si le contexte audio n'est pas actif).
- [ ] `workout.js` : état, horloge démarrée seulement quand une séance ou un repos est actif, persistance `momentum-workout`, reprise au chargement sauf si abandonnée, Wake Lock redemandé au retour au premier plan, fin de repos = bip + vibration.
- [ ] `npm run build`. Commit : `feat(seance): store de la séance en cours`.

### Task 3 : écran

**Files:** `BottomSheet.vue`, `ExerciseSheet.vue`, `WorkoutBar.vue`, `WorkoutRecap.vue`, `SessionDetail.vue`, `SessionView.vue`, `StrengthBlock.vue`, `ExerciseLogCard.vue`

- [ ] Extraire `BottomSheet` de `ExerciseSheet` (téléport, fond, fermeture, Échap, blocage du défilement, animation).
- [ ] `WorkoutBar` : trois états (séance en cours, repos, repos terminé), téléportée au-dessus des onglets.
- [ ] `WorkoutRecap` : quatre chiffres, liste par exercice, bouton « Terminer ».
- [ ] `ExerciseLogCard` : une nouvelle série cochée déverrouille le son, démarre la séance si besoin, lance le repos ; décocher l'arrête. `StrengthBlock` lui passe `restSec`.
- [ ] `SessionDetail` : bouton « Démarrer la séance », barre, libellé du bouton de validation. `SessionView` : récap au lieu du retour automatique pour une séance de muscu.
- [ ] `npm test`, `npm run build`. Commit : `feat(seance): chrono de séance, repos et récap`.

### Task 4 : vérification dans le navigateur

- [ ] Faux Directus local : démarrer, cocher (repos lancé), ±15 s, passer, laisser arriver à zéro (bip appelé, barre verte), recharger en cours de séance, valider (récap), séance de course inchangée.
