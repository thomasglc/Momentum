# Design — Séance de muscu : saisie des séries, historique et images d'exercices

Date : 2026-10-01

## Contexte

La séance de muscu s'affiche aujourd'hui comme une grille de cartes à emoji (`ExerciseGrid`), en lecture seule. L'athlète ne peut que cocher la séance entière. Thomas veut, pour sa prépa Hyrox solo, une vue de séance proche de Hevy : une image par mouvement, la saisie des charges et des reps réalisées série par série, et l'historique par exercice.

Décisions prises sous « carte blanche » ; chaque choix est listé ici pour pouvoir être contesté.

## Périmètre

1. **Saisie des séries** dans les blocs de muscu : charge, reps (ou durée pour le gainage), enregistrées dans Directus.
2. **Rappel de la séance précédente** pour chaque série, et **historique** par exercice.
3. **Refonte du bloc de muscu** : une carte par exercice avec image, objectif, note du coach et tableau des séries.
4. **Images** à la place des emojis partout où un mouvement en a une (muscu, circuits, stations) ; l'emoji reste en repli.

## Source des images : free-exercise-db plutôt qu'ExerciseDB

La clé RapidAPI fournie fonctionne, mais l'offre gratuite d'ExerciseDB (AscendAPI) ne convient pas :

| | ExerciseDB gratuit | free-exercise-db |
|---|---|---|
| Exercices disponibles | 200, surtout poids de corps et étirements | 876 |
| Couverture de notre catalogue | 9 exercices sur 28, aucune station Hyrox | 28 sur 28, plus 6 stations sur 11 |
| Filigrane | oui, en travers de l'image | non |
| Stockage | interdit (« Caching Allowed » décoché, URL changées chaque lundi) | libre |
| Quota | 2 000 requêtes par mois | aucun |
| Clé côté client | oui, donc proxy serveur obligatoire | non |

`yuhonas/free-exercise-db` est publié sous Unlicense. Chaque exercice a deux photos (position de départ, position d'arrivée). Les images sont servies par jsDelivr, épinglées sur un commit pour rester stables. Réserve : la licence est celle affichée par le dépôt, l'origine des photos n'a pas été vérifiée au-delà.

Le champ ajouté au catalogue contient de simples URL : n'importe quelle autre source reste possible, exercice par exercice.

## Modèle de données (Directus, ajouts uniquement)

### Collection `set_logs`

| Champ | Type | Notes |
|---|---|---|
| `id` | integer, auto | |
| `athlete_profile_id` | M2O → `athlete_profiles`, requis | `ON DELETE CASCADE`, comme `session_completions` |
| `session_id` | M2O → `sessions` | `SET NULL` : l'historique survit si la séance est régénérée |
| `block_strength_exercise_id` | M2O → `block_strength_exercises` | ligne prévue, `SET NULL` |
| `exercise_id` | M2O → `exercise_catalog` | clé de l'historique, `SET NULL` |
| `set_number` | integer, requis | à partir de 1 |
| `weight_kg` | float | vide = poids de corps |
| `reps` | integer | |
| `duration_sec` | integer | gainage |
| `user_created` | uuid, spécial `user-created` | propriétaire de la ligne |
| `date_created`, `date_updated` | timestamp | |

### Droits de l'Athlete Policy sur `set_logs`

- `create` : champs métier uniquement.
- `read`, `update`, `delete` : filtre `user_created = $CURRENT_USER`.

Le filtre porte sur `user_created`, rempli par le serveur, et non sur `athlete_profile_id`, que le client envoie. Un athlète ne peut donc ni lire ni modifier les séries d'un autre. (`session_completions` n'a aucun filtre aujourd'hui ; ce n'est pas corrigé ici.)

### Catalogues

`exercise_catalog.image_urls` et `station_catalog.image_urls` : JSON, liste d'URL (0 à 2). Déjà lisibles par l'Athlete Policy, qui a `*` en lecture.

### Scripts (dans `scripts/`, idempotents, URL et token lus dans l'environnement)

- `add-set-logs.cjs` : collection, relations, champs `image_urls`, droits.
- `set-exercise-images.cjs` : associe chaque entrée de catalogue à un exercice de free-exercise-db, vérifie que les images répondent, écrit `image_urls`.

## App athlète

### Données

- `trainingService.js` renvoie, pour un bloc de muscu, des lignes structurées (`rows` : id de ligne, id d'exercice, nom, séries, reps, durée, charge prévue, note, images) en plus des chaînes actuelles ; pour les blocs à stations, les images en parallèle des chaînes. Les deux chemins (`fetchBlock`, `prefetchAll`) passent par les mêmes fonctions de `blockMappers.js`.
- Le préfixe du cache local des séances passe à `momentum-session-v2-` ; les anciennes entrées sont purgées.
- `directus.js` : un `request()` commun qui rafraîchit le jeton une fois sur 401, pour ne pas perdre une saisie en pleine séance.
- `setLogService.js` : lecture des séries d'une séance, des séries précédentes par exercice, de l'historique ; création, modification, suppression.
- `stores/setLogs.js` : séries de la séance affichée et séries précédentes.
- `utils/setLogs.js` : logique pure (lecture d'un nombre saisi, mise en forme, regroupement de l'historique, lignes du tableau).

### Écran

- `StrengthBlock.vue` : en-tête « Force », repos lisible (« 2 min 30 »), note du bloc, puis une `ExerciseLogCard` par exercice.
- `ExerciseLogCard.vue` : vignette, nom, objectif (« 4 × 5 »), note, compteur de séries faites, tableau `Série | Précédent | kg | Reps | ✓`.
  - Une ligne par série prévue, plus les séries ajoutées (« + Ajouter une série »).
  - Les champs vides proposent en filigrane la valeur précédente, sinon la valeur prévue. Cocher sans rien saisir enregistre cette valeur.
  - Toucher « Précédent » recopie la série précédente.
  - Cocher enregistre, décocher supprime, modifier une série cochée la met à jour.
  - Exercice en durée : la colonne Reps devient « s ».
  - En cas d'échec réseau, la ligne revient à son état et un message s'affiche dans la carte.
- `ExerciseThumb.vue` : image carrée, emoji en repli si pas d'image ou erreur de chargement. Utilisée aussi dans `ExerciseGrid` et dans les listes de stations.
- `ExerciseSheet.vue` : panneau bas ouvert en touchant la vignette ou le nom. Grande image alternant départ et arrivée, objectif, note, historique des dernières séances.

La validation de la séance (« Valider la séance ») ne change pas.

## Tests et vérification

- Tests unitaires de la logique pure avec le lanceur intégré de Node (`node --test`), sans nouvelle dépendance : `utils/setLogs.js`, `blockMappers.js`, `sessionParser.js`.
- `npm run build` sans erreur.
- Vérification visuelle sur un faux Directus local (port 8056, hors dépôt) : contenu du plan lu en prod, écritures gardées en mémoire. Aucune écriture de test en prod.
- Schéma et droits relus par l'API après création. Le comportement avec un vrai compte athlète reste à valider par Thomas.

## Hors périmètre

- Saisie pour les blocs à stations, donc pour le farmer's carry tel qu'il est modélisé (circuit). À traiter avec la phase 2.
- Minuteur de repos, RIR, charge suggérée par la double progression, volume hebdo par groupe musculaire, courbes.
- Affichage des séries dans le back office, sélecteur d'image dans le back office.
