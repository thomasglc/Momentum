# Séance de muscu — refonte de l'affichage

Date : 2 octobre 2026. Demande : rendre le détail d'une séance de muscu plus agréable, à partir des données de prod (plan solo, Muscu A et C de la semaine 3).

## Ce qui gênait

| Constat | Mesure |
|---|---|
| Trois cadres imbriqués : bloc bleu, carte d'exercice, tableau | une séance de 5 exercices faisait 2 230 px de haut |
| Tous les exercices dépliés en permanence : on ne voit pas où on en est | aucun avancement de séance à l'écran |
| Champs et boutons de 36 px, texte de 10 et 11 px, valeurs proposées en gris très pâle | l'écran semblait désactivé avant la première série |
| Objectif et fourchette dits deux fois : « 3 × 6 » puis « 6-8 reps » | — |
| Le circuit (farmer's carry) dans un autre style, « repos 1.5 min » | — |
| Fiche de l'exercice accessible seulement en devinant qu'il faut toucher l'en-tête | — |

## Ce qui change

- **Un exercice ouvert à la fois.** À l'arrivée, le premier à faire. Quand sa dernière série est cochée, il se replie et le suivant s'ouvre ; on peut ouvrir n'importe lequel d'un geste. La même séance tient en 1 390 px.
- **Exercice replié** : vignette, nom, objectif (« 3 × 6-8 reps · RIR 2 »), compte des séries. Une fois entamé ou fini : ce qui a été fait (« 62,5 kg × 5, 5, 5, 4 ») et une coche.
- **Cartes plates.** Le bloc n'est plus un cadre : un intitulé (« Polyarticulaires · RIR 1-2 ») et son repos, puis une carte blanche par exercice, comme sur l'accueil.
- **Saisie.** Champs et bouton de 44 px ; la prochaine série à faire porte un bouton bleu ; les séries cochées passent au vert.
- **Avancement.** « 7 / 17 séries » et une barre en tête du programme, repris dans la barre de séance.
- **Repos.** La barre dit ce qui suit : « Front Squat · série 3 sur 4 », puis « Ensuite : Romanian Deadlift ».
- **Objectif.** La fourchette de la note rejoint l'objectif : « 3 × 6-8 reps », « 2 × 30-45 s ».
- **Fiche.** Lien « Technique et historique », repères en pastilles, tendance des dernières séances, historique compact.
- **Circuit** d'une séance de muscu : même présentation, « repos 1 min 30 ».
- Aucun texte sous 12 px sur ces écrans.

Les séances d'un autre type gardent leur présentation.

## Code

- `src/utils/workout.js` : `sessionProgress`, `nextOpenLine`, `restLabelAfter`, `describeLine` ; `src/utils/setLogs.js` : `summarizeSets`, `historyTrend`. Testés dans `tests/sessionFlow.test.js`.
- `src/components/SessionDetail.vue` fournit le déroulé (exercice ouvert, passage au suivant) aux cartes par `provide`.
- `src/components/session/` : `StrengthBlock`, `ExerciseLogCard`, `SetRow`, `ExerciseSheet`, `WorkoutBar`, `ExerciseGrid` (présentation plate).
