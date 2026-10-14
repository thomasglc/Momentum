# Une note par exercice, pour la prochaine fois

Date : 14 octobre 2026. Demande de Thomas : sur un exercice trouvé facile, laisser une note pour la prochaine fois (« c'était simple, je peux monter la charge la semaine prochaine »). Facultatif, donc discret sur l'écran de muscu. Spec et plan condensés dans ce seul document.

Les chronos AMRAP et EMOM sont abandonnés : il n'en veut pas.

## Ce qui change pour l'athlète

- Sous le tableau des séries d'un exercice ouvert, une ligne discrète : « Note pour la prochaine fois ». La toucher ouvre un champ de texte. Pas de bouton d'enregistrement : la note est gardée dès qu'il s'arrête de taper.
- La prochaine fois que l'exercice revient, la note s'affiche en haut de la carte, avant les séries : « La dernière fois : c'était simple, monter la charge ».
- La fiche de l'exercice (technique et historique) montre chaque note sous les séries de sa séance.
- Vider le champ efface la note.
- Même chose pour une station de circuit (le farmer's carry).
- Comme les séries : rien n'attend le réseau. Une note tapée sans réseau reste sur le téléphone et part dès que possible ; le bandeau d'attente la compte.

## Règles

- Une note par exercice et par séance, 300 caractères au plus.
- Note rappelée : celle de la dernière séance où l'exercice a été travaillé. Une note plus ancienne ne revient pas si l'exercice a été refait depuis sans note : « monte la charge » ne doit pas ressortir trois semaines plus tard.
- Tant que Directus n'a pas la collection, la note n'apparaît nulle part.

## Données

Nouvelle collection `exercise_notes`, créée par `scripts/add-exercise-notes.cjs` (simulation par défaut, `--write`) :

| Champ | Rôle |
|---|---|
| `athlete_profile_id` | l'athlète (suppression en cascade) |
| `session_id` | la séance où la note a été écrite |
| `exercise_id` ou `station_id` | ce que la note concerne |
| `note` | le texte |
| `user_created`, `date_created`, `date_updated` | remplis par Directus ; les droits de l'athlète portent sur `user_created`, comme pour `set_logs` |

## Code

- `src/utils/notes.js` : nettoyage, clé d'une note, note rappelée, notes dans l'historique.
- `src/services/noteService.js` : lecture et écriture, repli quand la collection manque.
- `src/stores/exerciseNotes.js` : notes de la séance et notes passées, envoi par la même boîte d'envoi que les séries (`services/syncQueue`).
- `src/components/session/NoteField.vue` ; `ExerciseLogCard.vue` (note rappelée, champ), `ExerciseSheet.vue` (historique), `SyncNotice.vue` (notes en attente).

## Plan

- [x] Tests puis règles pures.
- [x] Service, store, bandeau d'attente.
- [x] Carte et fiche.
- [x] Script Directus : simulation sur la prod, écriture essayée sur une copie locale.
- [x] Vérification dans le navigateur, `npm test`, `npm run build`.

## Mise en ligne

La branche `feat/notes-exercice` part de `feat/saisie-stations` (tours des circuits), pas encore dans `master` : la fusionner apporte les deux. Le script des stations est déjà passé en prod.

1. `node scripts/add-exercise-notes.cjs` (simulation), puis `node scripts/add-exercise-notes.cjs --write`.
2. Déployer l'app. L'ordre inverse ne casse rien : sans la collection, les notes n'apparaissent pas.

## Vérifié

Le 14 octobre 2026, sur un faux Directus local (structure lue en prod, écritures en mémoire), séance du vendredi de la semaine 2 :

- La note laissée la semaine 1 sur les dips s'affiche en haut de la carte, avant les séries. Capture : `notes-exercice.jpg`.
- Écrire une note : rien ne part pendant la frappe, la note part après une pause ; la corriger la met à jour ; vider le champ l'efface et le replie.
- Sans réseau : la note reste sur le téléphone, le bandeau dit « 1 note gardée sur ton téléphone, en attente de réseau », elle part au retour du réseau, sans doublon.
- Rechargement de la page : la note est toujours là. La fiche de l'exercice montre chaque note sous les séries de sa séance, et la séance du jour, qui n'a encore qu'une note.
- Note sur une station (farmer's carry) enregistrée avec sa station.
- Directus sans la collection (état de la prod avant le script) : aucune trace des notes à l'écran, une seule lecture refusée, la saisie des séries intacte.
- Script : simulation sur la prod (collection, 5 relations, 4 droits à créer), écriture puis relance sans effet sur une copie locale.
- Aucune erreur ni avertissement Vue. `npm test` : 295 tests. Onze bogues volontaires glissés dans les règles des notes sont tous vus par les tests.

## Limites

- Rien n'a été essayé sur un vrai téléphone.
- La note rappelée ne s'affiche que dans la carte ouverte ; ni sur la carte repliée, ni dans le récap, ni dans le CRM.
- Une note par exercice et par séance : un exercice présent deux fois dans la même séance partage sa note.
