# Design — Changement de mot de passe obligatoire & paramètres

Date : 2026-06-25

## Contexte

L'app Momentum utilise Directus 11 comme backend d'authentification. Les comptes sont créés par un administrateur avec un mot de passe temporaire. Il faut forcer chaque utilisateur à choisir son propre mot de passe dès la première connexion, et lui permettre de le modifier à tout moment depuis les paramètres.

## Critères de mot de passe

Conformément aux recommandations ANSSI (adaptées) :
- ≥ 8 caractères
- Au moins 1 majuscule
- Au moins 1 minuscule
- Au moins 1 chiffre
- Au moins 1 caractère spécial (ex : `!@#$%^&*()_+-=[]{}|;:,.<>?`)
- Confirmation identique au nouveau mot de passe

## Champ Directus

**Collection :** `athlete_profiles`
**Champ ajouté :** `password_changed` (boolean, nullable, défaut `false`)

Script : `scripts/add-password-changed-field.cjs`
- Appelle `POST /fields/athlete_profiles` via l'API Directus avec le token admin
- Idempotent : vérifie l'existence du champ avant de le créer
- À exécuter une fois en prod

## Flux première connexion

```
login() → fetchProfile() → password_changed = false
  → router guard → /change-password
  → formulaire sans champ "mot de passe actuel"
  → PATCH /users/me { password }
  → PATCH /items/athlete_profiles/{id} { password_changed: true }
  → mise à jour user.value en store
  → redirect vers /onboarding (ou /) selon profileComplete
```

## Flux changement depuis paramètres

```
GuideView → bouton "Changer mon mot de passe" → /change-password?from=settings
  → formulaire avec champ "mot de passe actuel"
  → vérification via POST /auth/login (email + mot de passe actuel)
  → si OK : PATCH /users/me { password }
  → redirect retour vers /guide
```

## Router guard

Dans `router/index.js`, après le check `isAuthenticated` et avant le check `profileComplete` :

```js
const passwordChanged = auth.user?.password_changed
if (!passwordChanged && !to.meta.changePassword) return '/change-password'
```

Meta `{ changePassword: true }` sur la route `/change-password` pour éviter la boucle.

## Composants

### `src/views/ChangePasswordView.vue` (nouvelle)

- Lit `?from=settings` pour décider du mode
- Mode première connexion : bannière de bienvenue, pas de champ mot de passe actuel
- Mode paramètres : champ mot de passe actuel
- Checklist ANSSI temps réel sous le champ "nouveau mot de passe"
- Bouton de soumission désactivé tant que critères non remplis
- Appels API : vérifient le mot de passe actuel (mode settings) puis PATCH

### `src/stores/auth.js` (modifications)

- Exposer `passwordChanged` computed
- Ajouter `changePassword(currentPassword, newPassword, isFirstLogin)` :
  - Si `!isFirstLogin` : re-auth via `/auth/login` pour valider `currentPassword`
  - `PATCH /users/me` avec `{ password: newPassword }`
  - `PATCH /items/athlete_profiles/{id}` avec `{ password_changed: true }`
  - Met à jour `user.value.password_changed = true`

### `src/views/GuideView.vue` (modification)

Ajout dans la section "Compte" entre "Revoir le tuto" et "Actualiser les données" :

```html
<button @click="router.push('/change-password?from=settings')">
  Changer mon mot de passe ›
</button>
```

## Fichiers touchés

| Fichier | Action |
|---|---|
| `scripts/add-password-changed-field.cjs` | Créer |
| `src/views/ChangePasswordView.vue` | Créer |
| `src/stores/auth.js` | Modifier |
| `src/router/index.js` | Modifier |
| `src/views/GuideView.vue` | Modifier |
