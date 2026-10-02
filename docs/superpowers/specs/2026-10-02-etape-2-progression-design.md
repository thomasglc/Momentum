# Étape 2, lot 1 — rendre la progression visible

Date : 2 octobre 2026. Source : `docs/audit-ux-2026-10-02.md`, section 6 (la cible) et étape 2.

## But

À chaque ouverture, l'app répond à trois questions : où j'en suis, quoi faire maintenant, ce que j'ai accompli. Aujourd'hui elle montre un programme et un pourcentage par semaine ; valider une séance ne rapporte rien à l'athlète.

## Périmètre

L'étape 2 est trop large pour un seul lot. Découpage :

| Lot | Actions de l'audit | Directus |
|---|---|---|
| **1 (ce document)** | 2.1 accueil « Aujourd'hui », 2.2 onglet Progression, 2.3 charges par exercice, 2.6 nouveaux onglets | aucun changement |
| 2 | 2.4 récap et ressenti à la validation, 2.5 bilan de semaine et passage de phase, 2.6 lexique et stations en aide contextuelle | champs à ajouter sur `session_completions` |
| à part | 2.7 mesure d'audience | choix de l'outil par Thomas |

Le socle 2.0 (calendrier par athlète, longueur du plan) est en ligne depuis l'étape 1.

## Approche

Tout se calcule dans l'app à partir de ce qu'elle lit déjà : les semaines et séances du plan (préchargées), les validations de l'athlète, ses séries enregistrées. Pas de champ ni de collection à créer : le lot se déploie sans script.

Écarté : des agrégats côté Directus (il faudrait une extension) et un résumé stocké dans le profil (à resynchroniser à chaque validation).

## Navigation

| Onglet | Route | Vue |
|---|---|---|
| Aujourd'hui | `/` | `TodayView`, nouvelle |
| Programme | `/programme` | `WeekView`, inchangée |
| Progression | `/progression` | `ProgressView`, nouvelle ; reprend « Mon plan » de l'onglet Phases |
| Profil | `/profil` | `ProfileView` (l'ancienne `GuideView`), avec `/profil/lexique` et `/profil/stations` |

Les anciennes routes (`/phases`, `/guide`, `/guide/lexique`, `/stations`) redirigent. Depuis une séance, le retour ramène à l'onglet d'où l'on vient ; cet onglet reste allumé pendant la séance.

## Accueil « Aujourd'hui »

Quatre cartes, de haut en bas.

1. **Où j'en suis.** « Bonjour Thomas », compte à rebours « J-117 », « Semaine 3 sur 19 », phase, barre d'une graduation par semaine.
2. **Quoi faire.** Une séance mise en avant, avec un bouton. Ordre de priorité : la séance du jour pas encore validée ; sinon une séance obligatoire de la semaine dont le jour est passé (« À rattraper ») ; sinon la prochaine séance obligatoire. Une ligne dit « Repos aujourd'hui » ou « Séance du jour validée » quand c'est le cas.
3. **Cette semaine.** Sept points, lundi à dimanche, et le compte des séances obligatoires validées. Toucher un jour ouvre sa séance.
4. **Ce que j'ai accompli.** Semaines complètes d'affilée, séances validées, heures, tonnage. Un lien mène à l'onglet Progression.

États d'un jour : `done` (séances obligatoires du jour validées), `todo`, `late` (jour passé, non validé), `rest` (aucune séance), `bonus` (seulement des séances optionnelles, non validées).

## Onglet Progression

1. **Mon plan.** Frise d'une case par semaine du plan, groupée par phase : faite, partielle, manquée, en cours, à venir ; en pointillé si la semaine n'est pas encore écrite.
2. **Totaux.** Séances validées, assiduité, heures, volume levé.
3. **Mes charges.** Par exercice : valeur de la première séance → valeur de la dernière, et l'écart.
4. **Semaines.** Les phases et leurs semaines (thème, dates, séances validées sur prévues) ; toucher une semaine l'ouvre dans Programme.

## Règles de calcul

- **Date d'une séance** : lundi de sa semaine + son jour. Une séance faite un autre jour coche son jour prévu.
- **Semaine complète** : toutes ses séances obligatoires sont validées. Les séances optionnelles ne comptent ni pour ni contre.
- **Semaines d'affilée** : on remonte depuis la semaine en cours ; celle-ci compte si elle est complète et ne casse pas la série si elle ne l'est pas encore.
- **Assiduité** : séances obligatoires validées ÷ séances obligatoires échues. Une séance est échue quand son jour est passé, ou dès qu'elle est validée.
- **Heures** : somme des durées prévues des séances validées. La durée réelle arrive au lot 2 ; une séance sans durée prévue (créneaux de course du plan solo) compte pour zéro.
- **Volume** : somme de charge × reps des séries enregistrées.
- **Charge d'un exercice** : la plus lourde série de la séance ; sans charge, le plus de reps ; en gainage, la plus longue tenue.

## États à couvrir

| État | Accueil | Progression |
|---|---|---|
| Plan pas commencé | « Ton plan commence lundi 5 octobre, dans 3 jours », première séance annoncée, semaine 1 | frise entièrement à venir |
| Plan en cours | tout | tout |
| Semaine pas encore écrite | « La semaine 9 n'est pas encore programmée. » | cases en pointillé |
| Plan terminé | « Ton plan est terminé », totaux | frise complète, totaux |
| Rien de validé | « Valide ta première séance pour lancer ton suivi. » | zéros, charges vides avec une phrase |
| Plan sans calendrier | pas de jour courant : première séance non validée | pas de dates |
| Chargement, erreur | squelette ; message et « Réessayer » | idem |

## Code

- `src/utils/progress.js` : toute la logique ci-dessus, pure et testée (`tests/progress.test.js`).
- `src/stores/progress.js` : charge les semaines du plan et les séries de l'athlète, expose les valeurs calculées.
- `src/stores/training.js` : `today` devient une donnée du store ; l'état du plan en découle, et se recalcule quand l'app revient au premier plan après minuit.
- `src/services/trainingService.js` : `getAllWeeks()` ; les dates d'une semaine se recalculent à la lecture du cache. `src/services/setLogService.js` : `fetchAllLogs()`.
- Composants : `components/today/` (en-tête du plan, séance mise en avant, points de la semaine, totaux) et `components/progress/` (frise, tuiles, charges, semaines).
- Retirés : `PhasesView.vue`, `getPlanOverview`, `groupPhases`.
- Texte : 12 px au minimum sur les nouveaux écrans, tutoiement, un chiffre avant une phrase.

## Vérification

Tests unitaires de `progress.js`. Faux Directus local avec validations et séries injectées : avant le début, en cours (jour de séance, jour de repos, séance en retard, séance validée), semaine non écrite, plan terminé, plan double. Console sans erreur, `npm test`, `npm run build`.
