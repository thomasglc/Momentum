# Tuto de bienvenue (carrousel 5 slides)

**Date** : 2026-06-10
**Statut** : validé

## Objectif

Après la première connexion (post-onboarding), présenter le fonctionnement de l'app
sous forme d'un carrousel de 5 slides, centré sur la partie programme.

## Décisions

- **Format** : carrousel d'intro plein écran (pas de coach-marks ni tooltips contextuels)
- **Illustrations** : réutilisation des vrais composants (WeekNav, SessionCard, ProgressBar)
  avec données factices, en `pointer-events: none` — aucune capture d'écran à maintenir
- **Persistance** : champ Directus `athlete_profiles.tutorial_seen` (boolean, défaut `false`),
  synchronisé entre appareils — pas de localStorage
- **Athlètes existants** : gardent `tutorial_seen = false` → verront le tuto une fois
  à leur prochaine connexion (souhaité, la feature est nouvelle)

## Flow

```
login → onboarding (si profil incomplet) → /tutorial (si !tutorial_seen) → /
```

- Nouvelle route `/tutorial` (vue plein écran, meta dédiée comme `/onboarding`)
- Guard router : après le check `profileComplete`, si `!auth.user.tutorial_seen`
  et destination ≠ `/tutorial` → redirect `/tutorial`
- Fin du tuto (bouton « C'est parti ! » slide 5) ou bouton « Passer » (discret, en haut) :
  PATCH `tutorial_seen = true` puis `router.replace('/')`

## Côté Directus

Script `scripts/add-tutorial-field.cjs` (même esprit que les scripts existants) :

1. Créer le champ `athlete_profiles.tutorial_seen` — boolean, `default_value: false`,
   `is_nullable: false`
2. Mettre à jour la permission **update** de l'Athlete Policy
   (policy `bc59f79d-1d78-4cd3-8d0e-8312f3c66701`, permission id 79) :
   `fields: ["gender", "ten_km_time_sec", "tutorial_seen"]`
   ⚠️ C'est exactement la restriction qui a causé le bug d'onboarding corrigé le 2026-06-10 —
   ne pas oublier cette étape.

## Côté app

### `src/stores/auth.js`

- Ajouter `tutorial_seen` à la liste `fields` de `fetchProfile`
- Nouvelle action `markTutorialSeen()` : PATCH `/items/athlete_profiles/{id}`
  body `{ tutorial_seen: true }`, puis met à jour `user.value`

### `src/router/index.js`

- Route `{ path: '/tutorial', component: TutorialView, meta: { tutorial: true } }`
- Guard : `if (auth.profileComplete && !auth.user?.tutorial_seen && !to.meta.tutorial && !to.meta.public) return '/tutorial'`
- En mode replay (`?replay=1`), le guard ne force rien (la route est accessible librement)

### `src/views/TutorialView.vue`

Carrousel 5 slides : swipe tactile + boutons Précédent/Suivant + dots de progression.
Chaque slide = titre + texte court + zone mockup (vrais composants, données factices,
`pointer-events: none`, cadre stylisé).

1. **Bienvenue** — logo Momentum, « Ton plan de N semaines est prêt »
   (N réel via `getPlan()`)
2. **Ta semaine** — mockup `WeekNav` (flèches, badge phase) + encart note de semaine
3. **Tes séances** — 2-3 `SessionCard` factices : une course, une hyrox, une optionnelle
   (types/couleurs visibles)
4. **Tes allures** — visuel simple des zones d'allure + « calculées depuis ton temps au 10km »
5. **Valide tes séances** — `ProgressBar` + une `SessionCard` à l'état coché,
   bouton final « C'est parti ! »

Bouton « Passer » visible sur toutes les slides (coin supérieur).

### `src/views/GuideView.vue`

Lien discret « Revoir le tuto » en bas → `/tutorial?replay=1`.
En mode replay : pas de PATCH à la fin, la sortie fait `router.back()` (retour Guide).

## Hors scope

- Slide sur les onglets Stations / Phases / Guide (écarté : focus programme)
- Coach-marks contextuels sur la vraie UI
- Versionnement du tuto (re-montrer après une grosse mise à jour)
