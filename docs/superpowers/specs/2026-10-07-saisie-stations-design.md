# Étape 3, lot 4 — saisir les circuits à tours

Date : 7 octobre 2026. Dernière action de l'étape 3 de l'audit (3.5 : « saisie pour les stations et les courses ; chrono pour AMRAP, EMOM et tours »). Spec et plan condensés dans ce seul document.

## Cadrage

Thomas est le seul utilisateur : le lot se règle sur ses séances, pas sur la liste de l'audit.

| Action de l'audit | Ce lot |
|---|---|
| Saisie pour les stations | Fait pour les circuits à tours : son farmer's carry du vendredi, puis les wall balls et les portés de la phase 2 |
| Chrono des tours | Fait : le repos part après chaque tour |
| Saisie pour les courses | Déjà là depuis l'étape 2 : durée et distance au récap |
| Chronos AMRAP et EMOM | Pas faits : aucune de ses séances n'en contient |

À proposer ensuite, à la place d'AMRAP et EMOM : le chrono « course + station » avec temps intermédiaires, pour sa séance C de la phase 3 (4 tours de 1 km + une station, à partir du 28 décembre) et ses deux simulations.

## Ce qui change pour l'athlète

Un circuit à tours (« 4 tours, repos 1 min 30 ») se saisit comme un exercice de muscu : une ligne par tour, la charge et la distance (ou les reps, ou la durée), une coche.

- Cocher un tour lance le repos du circuit. Avec plusieurs stations, on enchaîne les stations et le repos part quand le tour est bouclé.
- La colonne « Précédent » rappelle ce qui a été fait la dernière fois sur la station, la fiche donne son historique.
- Les tours comptent dans l'avancement de la séance et dans le récap. Le chrono de séance part au premier tour coché.
- Tout ce qui vaut pour les séries vaut pour les tours : rien n'attend le réseau, les valeurs se reportent d'un tour au suivant.

Les autres circuits (AMRAP, EMOM, au temps) et les autres blocs de stations s'affichent comme avant.

## Données

Les tours vont dans `set_logs`, avec trois champs de plus :

| Champ | Rôle |
|---|---|
| `station_id` | la station du catalogue : clé de l'historique |
| `line_key` | la ligne prévue, sous la forme `block_circuit_stations:173`. Une chaîne, parce que les lignes de stations vivent dans quatre collections ; elle pourra désigner plus tard un segment de course |
| `distance_m` | la distance, pour ce qui ne se compte ni en reps ni en secondes |

`scripts/add-station-logs.cjs` les crée, avec la relation vers `station_catalog` et les droits de l'athlète (simulation par défaut, `--write`).

Tant que le script n'est pas passé, l'app s'en aperçoit (Directus refuse les champs) et reste comme aujourd'hui : séries de muscu saisissables, circuits en lecture.

## Règles

- Circuit saisissable : format « tours », au moins un tour, au moins une station.
- Ce qu'on compte sur une ligne : la distance si elle est prévue, sinon les reps, sinon la durée.
- Charge proposée : celle de la dernière fois, sinon celle prévue pour le genre de l'athlète.
- Distance, reps ou durée proposées sur une station : le prévu. Le tour de la dernière fois n'est repris que s'il tient dans la fourchette prévue (« 30-40 m » : 40 m faits la semaine passée sont reproposés, 60 m faits dans un autre circuit ne le sont pas). La même station revient dans des circuits qui n'en demandent pas autant ; pour la muscu rien ne change, la série précédente reste proposée.
- Circuit à plusieurs stations : l'app ouvre la station la moins avancée ; pas de repos tant que le tour n'est pas bouclé.

## Code

- `src/utils/setLogs.js` : mesure d'une ligne (reps, durée, distance), clé d'historique (exercice ou station), valeur proposée (`proposedMain`).
- `src/utils/workout.js` : lignes à saisir d'une séance (muscu et circuits) avec le haut de leur fourchette prévue, enchaînement des stations, repos après un tour.
- `src/services/blockMappers.js`, `sessionParser.js` : lignes de stations structurées.
- `src/services/setLogService.js` : champs des stations, repli quand Directus ne les a pas.
- `src/components/session/CircuitBlock.vue` ; `ExerciseLogCard.vue` et `SetRow.vue` savent compter en mètres.
- CRM : la fiche athlète nomme les tours par leur station.

## Plan

- [x] Tests puis règles pures : mesures, lignes de circuits, enchaînement, repos.
- [x] Service et store : champs des stations, repli.
- [x] Bloc de circuit, carte et ligne.
- [x] Script Directus : simulation sur la prod, écriture essayée sur une copie locale.
- [x] CRM : nom de la station dans la fiche athlète (branche `feat/suivi-stations` du dépôt `momentum-backoffice`).
- [x] Vérification dans le navigateur, `npm test`, `npm run build`.

## Ordre de mise en ligne

1. `node scripts/add-station-logs.cjs` (simulation), puis `node scripts/add-station-logs.cjs --write`.
2. Déployer l'app. L'ordre inverse ne casse rien : sans les champs, les circuits restent en lecture.
3. Déployer le CRM quand on veut : il lit avec ou sans les champs.

## Vérifié

Le 7 octobre 2026, sur un faux Directus local (structure lue en prod, écritures en mémoire) :

- Séance du vendredi (circuit n° 59, farmer's carry 4 × 30-40 m, repos 1 min 30) : tours saisis en kg et en mètres, repos lancé à chaque tour, charge et distance tapées reportées sur les tours suivants, tour corrigé après coup, rechargement de la page, fiche avec historique, récap, « Mes charges » de la progression. Capture : `saisie-tours-farmers-carry.jpg`.
- Semaine suivante : la colonne « Précédent » reprend les tours de la semaine passée, un tour coché sans rien taper les reprend.
- Sans réseau : le tour est coché et le repos part dans le geste, l'envoi reprend au retour du réseau ; réponse perdue : pas de doublon.
- Circuit à six stations du plan n° 3 (séance n° 61) : les stations s'enchaînent, le repos part quand le tour est bouclé, puis avant le bloc suivant.
- Directus sans les champs (état de la prod avant le script) : circuits en lecture, séries de muscu saisissables, aucune écriture refusée.
- CRM, athlètes fictifs : la fiche nomme les tours par leur station (« Farmers Carry 24 kg × 30, 30, 40, 40 m ») et suit sa charge ; sans les champs, la fiche se charge comme avant.
- Script : simulation sur la prod (3 champs, 1 relation, 2 droits à ajouter), écriture puis relance sans effet sur une copie locale.
- Aucune erreur ni avertissement Vue pendant ces parcours. `npm test` : 284 tests (app), 34 (CRM). Dix bogues volontaires glissés dans la règle de proposition sont tous vus par les tests.

Défaut trouvé pendant la vérification, corrigé : la distance de la dernière fois remplaçait celle du jour quand la station revenait dans un circuit plus long (30 m proposés pour 60 m prévus). D'où la règle de la fourchette.

## Limites

- Rien n'a été essayé sur un vrai téléphone.
- Seuls les circuits à tours se saisissent. AMRAP, EMOM, circuits au temps, mini-courses et blocs de stations restent en lecture.
- La colonne « kg » s'affiche aussi pour une station sans charge (SkiErg, RowErg, burpees) : elle reste vide.
- Le récap compte les tours, pas leur charge : le volume en kg reste celui de la muscu.
- L'avancement et le message d'attente de réseau parlent de « séries », tours compris.
- L'historique d'une station réunit tous ses circuits : « Précédent » peut venir d'un autre circuit. La charge proposée est alors la dernière utilisée, quelle que soit la distance.
- Première ouverture après la mise en ligne sans réseau : les circuits restent en lecture jusqu'à la première réponse de Directus ; le téléphone s'en souvient ensuite.
- Une ligne de station supprimée puis recréée dans le CRM change de numéro : ses tours déjà saisis ne s'affichent plus dans la séance, ils restent dans l'historique de la station.
