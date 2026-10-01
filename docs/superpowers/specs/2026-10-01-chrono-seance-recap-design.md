# Design — Chrono de séance, chrono de repos et récap

Date : 2026-10-01

## Contexte

Suite de la saisie des séries (`2026-10-01-suivi-seance-muscu-design.md`). En séance de muscu, Thomas veut démarrer la séance pour la chronométrer, avoir un compte à rebours de récupération dès qu'il valide une série, avec un son à la fin, et un récap quand il valide la séance.

## Comportement

### Démarrer la séance

- Bouton « Démarrer la séance » en tête du programme, sur les séances qui contiennent des lignes de muscu et ne sont pas validées.
- Valider une série sans avoir démarré démarre la séance à ce moment-là.
- Une seule séance en cours à la fois ; en démarrer une autre remplace la précédente.
- L'heure de début est gardée dans `localStorage` : un rechargement ne perd pas le chrono. Au-delà de 6 h, la séance en cours est considérée abandonnée.
- L'écran reste allumé pendant la séance quand le navigateur le permet (Wake Lock).

### Chrono de repos

- Part quand une nouvelle série est cochée, pour la durée de repos du bloc (`rest_sec`). Modifier une série déjà cochée ne le relance pas ; décocher l'arrête.
- Boutons « −15 s », « +15 s » et « Passer ».
- À zéro : trois bips (Web Audio, sans fichier son), vibration si disponible, et la barre passe au vert quelques secondes.

### Barre de séance

Barre flottante au-dessus des onglets, visible sur la page de la séance : temps écoulé, ou compte à rebours du repos avec sa progression.

### Récap

À la validation d'une séance de muscu, un panneau remplace le retour automatique à la semaine :

- durée (si la séance a été démarrée), séries faites sur séries prévues, volume, reps ;
- par exercice : les séries et le volume ;
- « Terminer » ramène à la semaine.

Volume = somme de charge × reps telles que saisies. Les séries sans charge et les séries en durée comptent dans les séries, pas dans le volume.

## Code

| Fichier | Rôle |
|---|---|
| `src/utils/workout.js` | logique pure : horloge, repos, lignes de muscu d'une séance, récap |
| `src/utils/beep.js` | déverrouillage du son dans un geste, trois bips |
| `src/stores/workout.js` | séance en cours, repos en cours, horloge, Wake Lock |
| `src/components/session/WorkoutBar.vue` | barre flottante |
| `src/components/session/WorkoutRecap.vue` | panneau de récap |
| `src/components/session/BottomSheet.vue` | panneau bas commun, extrait de `ExerciseSheet.vue` |
| `SessionDetail.vue`, `SessionView.vue`, `StrengthBlock.vue`, `ExerciseLogCard.vue` | branchement |

Aucun changement dans Directus : la durée reste locale à l'appareil.

## Limites connues

- Le son et le compte à rebours supposent l'app au premier plan et l'écran allumé : un site web ne peut pas sonner en arrière-plan.
- Sur iPhone, le mode silencieux peut couper les sons Web Audio. Le type de session audio « transient » est demandé quand Safari le propose, pour que le bip se superpose à la musique ; non vérifié sur téléphone.
- La durée n'est pas enregistrée dans Directus (pas d'historique des durées, pas de vue coach). Possible plus tard avec un champ `duration_sec` sur `session_completions`.

## Vérification

- Tests unitaires de `utils/workout.js` avec `node --test`.
- Parcours dans le navigateur sur le faux Directus local : démarrage, série cochée, repos ajusté, passé, arrivé à terme, récap, rechargement en cours de séance.
