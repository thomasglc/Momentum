# Schéma Directus — Momentum Training Plan

## Collections principales

### `plans`
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| title | string | |
| startDate | date | Seule date saisie — toutes les dates de semaines en dérivent |

Relation : `plans` → `weeks` (O2M)

---

### `weeks`
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| plan_id | M2O → plans | |
| weekNumber | integer | |
| phase | integer | |
| theme | string | |
| isDeload | boolean | |
| weekNote | string | |

> `startDate` et `endDate` ne sont **pas stockées** — calculées :
> `startDate = plan.startDate + (weekNumber - 1) × 7 jours`
> `endDate   = startDate + 6 jours`

Relation : `weeks` → `sessions` (O2M)

---

### `sessions`
| Champ | Type | Notes |
|---|---|---|
| id | string (PK) | Slug lisible ex: `w10-hyrox-a` |
| week_id | M2O → weeks | |
| day | string | "Lundi" … "Dimanche" |
| type | string | `hyrox` \| `running` \| `strength` \| `brick` \| `recovery` \| `mobility` |
| optional | boolean | |
| title | string | |
| description | string | |
| duration | integer | minutes |
| intensityScore | integer | 1–10 — seule source de vérité pour l'intensité |
| focus | string | ex: `Race_Simulation`, `Endurance` |
| coachTip | string | |

> `intensityLabel` et `intensityZones` ne sont **pas stockés** — dérivés de `intensityScore` :
>
> | Score | Zone | Label affiché |
> |---|---|---|
> | 0 | — | Repos |
> | 1–2 | Z1 | Léger |
> | 3–4 | Z2 | Modéré |
> | 5–6 | Z3 | Modéré / Élevé |
> | 7 | Z4 | Élevé |
> | 8–10 | Z5 | Très élevé |

Relation : `sessions` → `session_details` (O2M, triée par `position`)

---

### `session_details` — jonction polymorphique (M2A)
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| session_id | M2O → sessions | |
| position | integer | Ordre d'affichage |
| block_type | string | Discriminant : voir liste des blocs ci-dessous |
| item_id | string | FK vers la collection du bloc |
| collection | string | Nom de la collection cible (géré par Directus M2A) |

---

### `athlete_profiles`
Stocke les données physiques de chaque athlète. Les allures ne sont **jamais stockées** — elles sont calculées à la volée (méthode Daniels VDOT) depuis `tenKmTimeSec`.

| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| plan_id | M2O → plans | |
| name | string | ex: "Lui", "Elle" |
| tenKmTimeSec | integer (nullable) | Temps au 10km en secondes |

> `tenKmTimeSec` est la seule source de vérité pour les allures.
> `paceForZone(zone, tenKmTimeSec)` calcule l'allure à l'affichage.
> Modifier ce champ met à jour automatiquement toutes les allures de toutes les séances.

---

## Blocs (collections polymorphiques)

### `block_warmup` / `block_cooldown`
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| durationMin | integer | |
| label | string | |
| paceZone | enum (nullable) | `Z1` \| `Z2` \| `Z3` \| `Z4` \| `Z5` |

---

### `block_circuit`
Remplace la convention `rounds = 0` pour les AMRAP par un enum explicite.

| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| format | enum | `rounds` \| `amrap` |
| label | string (nullable) | Titre court ex: "AMRAP 18 min", null si format rounds |
| rounds | integer (nullable) | Nombre de passages — null si format amrap |
| durationMin | integer (nullable) | Durée totale — null si format rounds |
| restBetweenMin | float | |
| stations | json | string[] |

> Le header affiché est calculé :
> - `amrap` → `"AMRAP ${durationMin} min"`
> - `rounds` → `"Circuit × ${rounds} passage(s)"`

---

### `block_mini_race`
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| rounds | integer | Nombre de répétitions course+station |
| runDistanceKm | float | Distance de course par round |
| paceZone | enum | `Z1` \| `Z2` \| `Z3` \| `Z4` \| `Z5` |
| restBetweenRoundsMin | float | |
| stations | json | string[], 1 par round dans l'ordre |

---

### `block_station_activation`
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| note | string | Consigne générale |
| rounds | integer (nullable) | Nombre de tours si applicable |
| stations | json | string[] |

---

### `block_strength`
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| sets | integer | |
| restSec | integer | |
| exercises | json | string[] |

---

### `block_run`
| Champ | Type |
|---|---|
| id | uuid (PK) |
| durationMin | integer |

---

### `block_intervals`
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| sets | integer | |
| distanceKm | float (nullable) | null si durée |
| durationMin | float (nullable) | null si distance |
| recoveryMin | float | |
| paceZone | enum | `Z1` \| `Z2` \| `Z3` \| `Z4` \| `Z5` |

---

### `block_target_pace`
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| zone | enum | `Z1` \| `Z2` \| `Z3` \| `Z4` \| `Z5` |

---

### `block_brick_run`
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| durationMin | integer | |
| paceZone | enum | `Z1` \| `Z2` \| `Z3` \| `Z4` \| `Z5` |
| note | string (nullable) | Consigne spécifique |

---

### `block_station_block`
| Champ | Type | Notes |
|---|---|---|
| id | uuid (PK) | |
| brickFormat | enum | `emom` \| `standard` |
| formatNote | string | |
| stations | json | string[] |

---

## Zones d'allure (référence)

Les zones sont définies selon la méthode **Jack Daniels VDOT** ("Running Formula", 3e éd.).
Elles sont stockées comme clés dans la base de données et résolues à l'affichage.

| Zone | % VDOT | Objectif |
|---|---|---|
| Z1 | 60–64 % | Récupération active |
| Z2 | 65–74 % | Endurance fondamentale (EF) |
| Z3 | 75–84 % | Économie de course / marathon |
| Z4 | 85–88 % | Seuil lactique |
| Z5 | 95–100 % | VO2max / fractionné |

---

## Récapitulatif — champs supprimés car calculables

| Champ supprimé | Collection | Règle de calcul |
|---|---|---|
| `startDate` | `weeks` | `plan.startDate + (weekNumber - 1) × 7j` |
| `endDate` | `weeks` | `startDate + 6j` |
| `intensityLabel` | `sessions` | table `intensityScore → label` |
| `intensityZones` | `sessions` | table `intensityScore → zone` |
| `rounds = 0` (convention) | `block_circuit` | remplacé par `format: "amrap"` + `durationMin` |
| `paceHim` / `paceHer` | tous les blocs | remplacés par `paceZone` + calcul Daniels |

---

## Notes d'implémentation

- **Aucune allure n'est stockée en base.** Seules les clés de zone (`Z1`–`Z5`) et `tenKmTimeSec` sont persistées. Le calcul se fait côté client via `paceForZone(zone, tenKmTimeSec)` (`src/utils/paceCalculator.js`).
- Les champs `stations` restent en `json` (tableau de strings) — pas besoin de table dédiée tant qu'on ne requête pas les stations individuellement.
- La relation `session_details` → blocs est une **Many-to-Any (M2A)** native Directus.
- Le champ `id` de `sessions` utilise un slug string (`w10-hyrox-a`) plutôt qu'un UUID pour faciliter la migration depuis le JSON.
- La collection `athlete_profiles` est liée à `plans` (pas à un système d'auth Directus) — simplicité maximale pour une app duo sans gestion de comptes.
