# Étape 2, lot 2 — récap à la validation et durée réelle

Date : 2 octobre 2026. Suite de `2026-10-02-etape-2-progression-design.md`. Spec et plan condensés dans ce seul document.

## But

Valider une séance doit rendre quelque chose à l'athlète, et ce qu'il saisit doit ressortir tout de suite ailleurs. Règle du lot : aucune saisie qui ne réapparaisse pas dans l'app.

## Périmètre

| Retenu | Écarté |
|---|---|
| Récap à la validation de toute séance, avec le bilan de la semaine quand la séance la clôt | Ressenti (facile, correct, dur) : rien ne l'exploite avant la vue coach de l'étape 3 |
| Durée réelle enregistrée ; distance pour les courses | Aide contextuelle sur le jargon : reportée à l'étape 4 |
| Heures réelles et kilomètres dans la progression | Mesure d'audience : abandonnée |

## Ce que voit l'athlète

**Récap** (panneau du bas, à chaque validation) :
- muscu : durée, séries, volume, reps, détail par exercice (l'existant) ;
- autres séances : deux champs facultatifs, durée en minutes et distance en km (distance pour les séances de course, brick et Hyrox) ;
- « 4 / 6 séances cette semaine ».

**Bilan de semaine**, ajouté au récap quand la séance validée est la dernière séance obligatoire de sa semaine : séances, heures, tonnage et kilomètres de la semaine ; charges qui ont monté par rapport à la séance précédente de l'exercice ; semaines complètes d'affilée ; ce qui suit (thème de la semaine suivante, décharge, changement de phase, fin du plan).

## Données

`session_completions` reçoit deux champs facultatifs : `duration_sec` (entier) et `distance_km` (nombre). L'athlète peut déjà créer ses validations ; il reçoit le droit de modifier ces deux champs sur les siennes. Script `scripts/add-completion-details.cjs`, à lancer par Thomas.

- Muscu : la durée du chrono part avec la validation. Sans chrono lancé, rien n'est envoyé.
- Autres séances : la validation reste en un geste ; durée et distance s'enregistrent au bouton « Terminer » du récap, si elles sont saisies.
- **Sans le script**, l'app marche comme avant : elle détecte que les champs manquent (la lecture détaillée des validations est refusée), n'envoie rien et masque les deux champs.

## Règles de calcul

- **Heures** : durée réelle d'une séance validée quand elle est notée, durée prévue sinon.
- **Kilomètres** : somme des distances notées.
- **Charges en hausse** de la semaine : pour chaque exercice travaillé dans la semaine, meilleure valeur de la semaine comparée à celle de sa séance précédente ; on liste ceux qui montent.
- **Saisie** : durée de 1 à 600 minutes, entière ; distance de 0,1 à 200 km. Vide = non renseigné.

## Code

- `src/utils/progress.js` (+ tests) : `toCompletion`, `planTotals` avec durées réelles et km, `weekSummary`, `weekOutlook`, `parseCompletionDetails`.
- `src/services/trainingService.js` : lecture détaillée des validations avec repli, création avec durée, modification.
- `src/stores/training.js` : validations complètes (`completions`), `completionOf`, `saveCompletionDetails` ; `completedSessions` en découle.
- `src/stores/progress.js` : totaux avec détails, `summaryFor(sessionId)`.
- `src/components/session/SessionRecap.vue` remplace `WorkoutRecap.vue` ; `src/views/SessionView.vue` l'ouvre pour toute séance.
- `src/components/progress/StatTiles.vue` : tuile Distance quand il y a des kilomètres.

## Plan

- [ ] Tests puis logique pure (`progress.js`).
- [ ] Service et stores.
- [ ] Récap et page de séance ; tuiles.
- [ ] Script Directus, lancé en simulation.
- [ ] Vérification sur le faux Directus : muscu avec chrono, course avec et sans saisie, saisie invalide, semaine clôturée, changement de phase, repli sans les champs. `npm test`, `npm run build`.
