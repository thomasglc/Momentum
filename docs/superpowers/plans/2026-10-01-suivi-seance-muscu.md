# Suivi de séance de muscu — plan d'implémentation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Saisir charge et reps série par série dans les blocs de muscu de l'app athlète, avec rappel de la séance précédente, historique par exercice et images à la place des emojis.

**Architecture:** Une collection Directus `set_logs` (droits filtrés sur `user_created`) et un champ `image_urls` sur les deux catalogues. Côté app, `trainingService` expose des lignes structurées pour les blocs de muscu ; un store Pinia porte les séries de la séance affichée ; la logique pure vit dans `utils/setLogs.js` et `services/blockMappers.js`, testée avec `node --test`.

**Tech Stack:** Vue 3 (`<script setup>`, JS), Pinia 2, Tailwind 3, Vite 5, Directus 11 (REST), Node 22 (`node:test`).

Spec : `docs/superpowers/specs/2026-10-01-suivi-seance-muscu-design.md`. Plan volontairement condensé (interfaces et cas de test, pas le code complet) : `CLAUDE.md` demande d'économiser les tokens.

---

## Fichiers

| Fichier | Rôle |
|---|---|
| `scripts/_directus.cjs` (créé) | `api(method, path, body)` ; lit `DIRECTUS_URL` et `DIRECTUS_TOKEN` dans l'environnement |
| `scripts/add-set-logs.cjs` (créé) | collection `set_logs`, relations, champs `image_urls`, droits Athlete Policy ; idempotent |
| `scripts/set-exercise-images.cjs` (créé) | table catalogue → exercice free-exercise-db, contrôle des URL, écriture de `image_urls` ; `--write` pour écrire |
| `src/utils/setLogs.js` (créé) | logique pure des séries |
| `src/services/blockMappers.js` (créé) | passage ligne Directus → détail de bloc, partagé par `fetchBlock` et `prefetchAll` |
| `src/services/sessionParser.js` (modifié) | transmet `rows`, `restSec`, `note` et les images |
| `src/services/trainingService.js` (modifié) | utilise les mappers ; cache `momentum-session-v2-` |
| `src/services/directus.js` (créé) | `request(method, path, { params, body })` authentifié |
| `src/services/setLogService.js` (créé) | appels REST `set_logs` |
| `src/stores/auth.js` (modifié) | expose `authedFetch` |
| `src/stores/setLogs.js` (créé) | séries de la séance affichée, séries précédentes |
| `src/components/session/ExerciseThumb.vue` (créé) | image carrée, emoji en repli |
| `src/components/session/StrengthBlock.vue` (créé) | bloc de muscu |
| `src/components/session/ExerciseLogCard.vue` (créé) | carte d'exercice et tableau des séries |
| `src/components/session/ExerciseSheet.vue` (créé) | panneau image + historique |
| `src/components/session/ExerciseGrid.vue`, `SessionProgramBlock.vue`, `src/components/SessionDetail.vue` (modifiés) | branchement |
| `tests/*.test.js` (créés), `package.json` (script `test`) | tests unitaires |

## Interfaces

```js
// src/utils/setLogs.js
parseDecimal(input)            // "62,5" → 62.5 ; "" | "abc" | négatif → null
formatNumber(n)                // 62.5 → "62,5" ; 60 → "60" ; null → ""
formatRest(sec)                // 150 → "2 min 30" ; 120 → "2 min" ; 45 → "45 s" ; 0|null → ""
formatSet(set)                 // "60 kg × 8" | "8 reps" | "5 kg × 45 s" | "45 s" | ""
formatTarget(line)             // "4 × 5" | "3 × 45 s" | "4 × 5 · 60 kg"
isTimed(line)                  // reps absent et durée présente
toSet(log)                     // log Directus → { id, lineId, exerciseId, sessionId, setNumber, weightKg, reps, durationSec, date }
groupHistory(sets)             // → [{ key, date, sets }] plus récent d'abord
previousByExercise(sets, currentSessionId)   // → { [exerciseId]: { date, sets } }
buildSetRows(line, lineSets, previousSets, extraCount)  // → [{ setNumber, logged, previous, planned }]
resolveSetValues(line, row, draft)  // draft { weight, value } → { weightKg, reps, durationSec } | null

// src/services/blockMappers.js
formatExercise(row), formatStation(row)      // déplacés depuis trainingService, inchangés
imagesOf(catalogItem)                        // → string[]
toExerciseRow(row)   // → { id, exerciseId, name, sets, reps, durationSec, weightKg, note, images }
strengthDetail(block, rows)  // → { type:'strength', restSec, note, exercises, rows }
stationsDetail(rows)         // → { stations, stationImages }
```

---

### Task 1 : schéma Directus

**Files:** `scripts/_directus.cjs`, `scripts/add-set-logs.cjs`

- [ ] Écrire `_directus.cjs` : sort avec un message si `DIRECTUS_URL` ou `DIRECTUS_TOKEN` manque.
- [ ] Écrire `add-set-logs.cjs`, chaque étape sautée si déjà faite :
  1. collection `set_logs` avec les champs de la spec ;
  2. relations : `athlete_profile_id` → `athlete_profiles` (CASCADE), `session_id` → `sessions`, `block_strength_exercise_id` → `block_strength_exercises`, `exercise_id` → `exercise_catalog`, `user_created` → `directus_users` (SET NULL pour ces quatre) ;
  3. `image_urls` (json, interface `tags`) sur `exercise_catalog` et `station_catalog` ;
  4. droits de la policy nommée « Athlete Policy » : `create` (8 champs métier), `read` (`*`), `update` (`set_number, weight_kg, reps, duration_sec`), `delete`, les trois derniers filtrés par `{"user_created":{"_eq":"$CURRENT_USER"}}` ;
  5. relecture : champs, relations, droits.
- [ ] Lancer contre la prod, puis relancer : la seconde exécution ne crée rien.
- [ ] Essai de bout en bout avec le token admin : créer, lire, modifier, supprimer une ligne de test.

### Task 2 : images du catalogue

**Files:** `scripts/set-exercise-images.cjs`

- [ ] Table nom de catalogue → identifiant free-exercise-db (28 exercices, stations quand un équivalent fidèle existe). URL : `https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@f00c92c7dcf1216a928a52c3706c7ce8e2f71ed5/exercises/<id>/{0,1}.jpg`.
- [ ] Sans `--write` : liste ce qui serait écrit et vérifie que chaque URL répond 200. Avec `--write` : `PATCH` des lignes dont la valeur diffère.
- [ ] Lancer, relire le catalogue. Mettre à jour les chiffres de couverture dans la spec.
- [ ] Commit : `feat(directus): scripts set_logs et images du catalogue`.

### Task 3 : logique pure des séries (TDD)

**Files:** `src/utils/setLogs.js`, `tests/setLogs.test.js`, `package.json`

- [ ] Ajouter `"test": "node --test \"tests/*.test.js\""`.
- [ ] Écrire les tests, les voir échouer, puis implémenter. Cas :
  - `parseDecimal` : `"62,5"`, `"62.5"`, `" 60 "`, `""`, `"abc"`, `"-5"`, `0`.
  - `formatRest` : 150, 120, 90, 45, 0, null. `formatNumber` : 62.5, 60, null.
  - `formatSet` : charge + reps, reps seules, charge 0, durée seule, charge + durée, vide.
  - `formatTarget` : reps, durée, avec charge prévue, sans séries.
  - `groupHistory` : deux séances triées de la plus récente à la plus ancienne, séries triées par numéro ; logs sans `sessionId` regroupés par jour.
  - `previousByExercise` : ignore la séance courante, prend la plus récente des autres, exercice sans passé absent du résultat.
  - `buildSetRows` : 4 prévues sans log ; log sur la série 2 ; série loguée au-delà du prévu ; `extraCount` ; précédent apparié par numéro.
  - `resolveSetValues` : saisie prioritaire ; repli sur précédent puis prévu ; exercice en durée ; reps manquantes → `null` ; charge vide sans repli → `null` pour la charge mais série valide.
- [ ] Commit : `feat(seance): logique des séries réalisées`.

### Task 4 : données de séance structurées (TDD)

**Files:** `src/services/blockMappers.js`, `src/services/sessionParser.js`, `src/services/trainingService.js`, `tests/blockMappers.test.js`, `tests/sessionParser.test.js`

- [ ] Tests `blockMappers` : `formatExercise` et `formatStation` rendent les mêmes chaînes qu'avant (cas : séries × reps, séries × durée, note, charges F/H) ; `imagesOf` (liste, null, valeurs non-chaînes) ; `toExerciseRow` (zéros traités comme absents, nom du catalogue prioritaire) ; `strengthDetail` ; `stationsDetail`.
- [ ] Tests `sessionParser` : le cas `strength` transmet `rows`, `restSec`, `note` ; `circuit`, `mini_race`, `station_activation`, `station_block` attachent `images` à chaque station ; sans `stationImages`, `images` vaut `[]` ; une chaîne de la phase 1 (`"3×45s Planche (45-60 s · à lester une fois 60 s tenues)"`) se découpe toujours en nom, valeur, note.
- [ ] Implémenter les mappers, les brancher dans `fetchBlock` et dans `resolveBlock` de `prefetchAll`, retirer les deux formateurs de `trainingService`.
- [ ] Cache : constante `SESSION_LS_PREFIX = 'momentum-session-v2-'` aux quatre lectures/écritures ; purge au chargement du module des clés `momentum-session-` d'ancien format.
- [ ] `npm test` et `npm run build` passent. Commit : `feat(seance): lignes d'exercice structurées et images`.

### Task 5 : accès aux séries

**Files:** `src/stores/auth.js`, `src/services/directus.js`, `src/services/setLogService.js`, `src/stores/setLogs.js`

- [ ] `auth.js` : ajouter `authedFetch: _authedFetch` à l'objet retourné.
- [ ] `directus.js` : `request()` ; 204 → `null` ; réponse non OK → `Error` avec `.status`.
- [ ] `setLogService.js` : `fetchSessionLogs(profileId, sessionId)`, `fetchExerciseLogs(profileId, exerciseIds, { limit })`, `createSetLog`, `updateSetLog`, `deleteSetLog`.
- [ ] `stores/setLogs.js` : état `sessionId, sets, previous, ready, loadError` ; `loadSession(id, exerciseIds)` (ignore une réponse arrivée après un changement de séance), `setsForLine(lineId)`, `saveSet(line, setNumber, values)` (crée ou met à jour), `removeSet(id)`, `loadHistory(exerciseId)`. L'état ne change qu'après la réponse du serveur.
- [ ] `npm run build` passe. Commit : `feat(seance): service et store des séries`.

### Task 6 : écran

**Files:** les quatre composants créés, `ExerciseGrid.vue`, `SessionProgramBlock.vue`, `SessionDetail.vue`

- [ ] `ExerciseThumb` : props `images`, `emoji`, `alt` ; `<img loading="lazy">` ; repli emoji sur absence ou erreur.
- [ ] `ExerciseLogCard` : en-tête (vignette, nom, objectif, note, compteur), tableau des séries, ajout et retrait d'une série supplémentaire, message d'erreur dans la carte. Champs `inputmode="decimal"` / `"numeric"`.
- [ ] `StrengthBlock` : en-tête, repos, note, cartes, ouverture du panneau.
- [ ] `ExerciseSheet` : `<Teleport to="body">`, `z-[60]` (au-dessus de la barre d'onglets), image alternée toutes les secondes, historique chargé à l'ouverture.
- [ ] `SessionProgramBlock` : branche `strength` avec `rows` vers `StrengthBlock`, sinon `ExerciseGrid` ; vignettes dans les listes de stations. `ExerciseGrid` : vignette à la place de l'emoji.
- [ ] `SessionDetail` : à l'arrivée de `structuredDetails`, appeler `loadSession` si la séance contient des lignes de muscu.
- [ ] `npm test`, `npm run build`. Commit : `feat(seance): saisie des séries et images dans la vue séance`.

### Task 7 : vérification

- [ ] Faux Directus local sur le port 8056 (hors dépôt) : authentification factice, contenu lu en prod, `set_logs` et `session_completions` en mémoire.
- [ ] `npm run dev`, largeur mobile : séance de muscu de S1 (cocher, modifier, décocher, ajouter une série, erreur de saisie), puis S2 pour le rappel « Précédent », panneau d'historique, séance à stations d'un autre plan pour les vignettes, séance de course sans bloc.
- [ ] Corriger ce qui ressort, relancer tests et build.
