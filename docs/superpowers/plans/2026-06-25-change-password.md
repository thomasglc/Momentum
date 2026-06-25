# Change Password Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Forcer le changement de mot de passe à la première connexion (critères ANSSI) et permettre à l'utilisateur de le modifier depuis les paramètres.

**Architecture:** Un champ `password_changed` (boolean) dans `athlete_profiles` Directus détecte la première connexion. Le router guard redirige vers une vue `/change-password` dédiée si ce champ est `false`. La même vue est accessible depuis `GuideView` (paramètres) avec un champ "mot de passe actuel" supplémentaire.

**Tech Stack:** Vue 3 Composition API (`<script setup>`), Pinia, Directus 11, Tailwind CSS, Vue Router hash history.

---

## Fichiers

| Fichier | Action |
|---|---|
| `scripts/add-password-changed-field.cjs` | Créer — script prod Directus |
| `src/stores/auth.js` | Modifier — `passwordChanged` computed + `changePassword()` + `email` dans profil |
| `src/views/ChangePasswordView.vue` | Créer — vue changement de mot de passe |
| `src/router/index.js` | Modifier — route + guard |
| `src/views/GuideView.vue` | Modifier — bouton dans section Compte |

---

### Task 1 : Script Directus — ajouter le champ `password_changed`

**Files:**
- Create: `scripts/add-password-changed-field.cjs`

- [ ] **Step 1 : Créer le script**

```js
// scripts/add-password-changed-field.cjs
const DIRECTUS_URL = process.env.DIRECTUS_URL || 'http://localhost:8056'
const TOKEN = process.env.DIRECTUS_TOKEN || '4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb'

async function run() {
  // Vérifier si le champ existe déjà
  const checkRes = await fetch(`${DIRECTUS_URL}/fields/athlete_profiles/password_changed`, {
    headers: { Authorization: `Bearer ${TOKEN}` },
  })
  if (checkRes.ok) {
    console.log('✓ Le champ password_changed existe déjà, rien à faire.')
    return
  }

  // Créer le champ
  const res = await fetch(`${DIRECTUS_URL}/fields/athlete_profiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({
      field: 'password_changed',
      type: 'boolean',
      meta: {
        interface: 'boolean',
        display: 'boolean',
        note: 'false = mot de passe temporaire, true = mot de passe personnalisé',
      },
      schema: {
        default_value: false,
        is_nullable: true,
      },
    }),
  })

  if (!res.ok) {
    const err = await res.json()
    throw new Error(JSON.stringify(err, null, 2))
  }
  console.log('✓ Champ password_changed créé avec succès.')
}

run().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2 : Tester le script en local**

```bash
node scripts/add-password-changed-field.cjs
```

Résultat attendu : `✓ Champ password_changed créé avec succès.`
Relancer : `✓ Le champ password_changed existe déjà, rien à faire.`

- [ ] **Step 3 : Commit**

```bash
git add scripts/add-password-changed-field.cjs
git commit -m "feat: script Directus pour ajouter password_changed dans athlete_profiles"
```

---

### Task 2 : Modifier `auth.js`

**Files:**
- Modify: `src/stores/auth.js`

Trois modifications :
1. Ajouter `email` dans `_getDirectusUser` pour pouvoir re-vérifier le mot de passe actuel
2. Exposer `passwordChanged` computed
3. Ajouter `changePassword(currentPassword, newPassword, isFirstLogin)`

- [ ] **Step 1 : Ajouter `email` dans `_getDirectusUser` et `fetchProfile`**

Remplacer la ligne `_getDirectusUser` :
```js
// Avant
const res = await _authedFetch(`${DIRECTUS_URL}/users/me?fields=id,first_name,last_name`)

// Après
const res = await _authedFetch(`${DIRECTUS_URL}/users/me?fields=id,first_name,last_name,email`)
```

Dans `fetchProfile`, là où `user.value` est construit :
```js
// Avant
user.value = {
  ...profile,
  directus_user_id: me.id,
  first_name: me.first_name,
  last_name: me.last_name,
}

// Après
user.value = {
  ...profile,
  directus_user_id: me.id,
  first_name: me.first_name,
  last_name: me.last_name,
  email: me.email,
}
```

- [ ] **Step 2 : Ajouter `password_changed` dans les champs fetchés**

Dans `fetchProfile`, modifier le `searchParams` :
```js
// Avant
url.searchParams.set('fields', 'id,name,gender,ten_km_time_sec,plan_id,tutorial_seen')

// Après
url.searchParams.set('fields', 'id,name,gender,ten_km_time_sec,plan_id,tutorial_seen,password_changed')
```

- [ ] **Step 3 : Ajouter `passwordChanged` computed**

Après la ligne `const profileComplete = computed(...)`, ajouter :
```js
const passwordChanged = computed(() => user.value?.password_changed === true)
```

- [ ] **Step 4 : Ajouter la méthode `changePassword`**

Après la méthode `markTutorialSeen`, ajouter :
```js
async function changePassword(currentPassword, newPassword, isFirstLogin = false) {
  if (!isFirstLogin) {
    // Re-vérifier le mot de passe actuel
    const verifyRes = await fetch(`${DIRECTUS_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.value?.email ?? '', password: currentPassword }),
    })
    if (!verifyRes.ok) throw new Error('Mot de passe actuel incorrect')
  }

  // Appliquer le nouveau mot de passe
  const res = await _authedFetch(`${DIRECTUS_URL}/users/me`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: newPassword }),
  })
  if (!res.ok) throw new Error('Erreur lors du changement de mot de passe')

  // Marquer password_changed = true
  const existingId = user.value?.id
  if (existingId) {
    await _authedFetch(`${DIRECTUS_URL}/items/athlete_profiles/${existingId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password_changed: true }),
    })
  }
  user.value = { ...user.value, password_changed: true }
}
```

- [ ] **Step 5 : Exposer les nouvelles propriétés dans le `return`**

```js
// Avant
return { token, user, isAuthenticated, profileComplete, init, login, logout, fetchProfile, saveProfile, markTutorialSeen }

// Après
return { token, user, isAuthenticated, profileComplete, passwordChanged, init, login, logout, fetchProfile, saveProfile, markTutorialSeen, changePassword }
```

- [ ] **Step 6 : Commit**

```bash
git add src/stores/auth.js
git commit -m "feat(auth): ajouter passwordChanged computed et changePassword()"
```

---

### Task 3 : Créer `ChangePasswordView.vue`

**Files:**
- Create: `src/views/ChangePasswordView.vue`

La vue gère deux modes selon `?from=settings` :
- **première connexion** : bannière de bienvenue, pas de champ "mot de passe actuel"
- **paramètres** : champ "mot de passe actuel" affiché

La checklist ANSSI s'affiche en temps réel sous le champ "nouveau mot de passe". Le bouton est désactivé tant que tous les critères ne sont pas remplis.

- [ ] **Step 1 : Créer le fichier**

```vue
<script setup>
import { shallowRef, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const route  = useRoute()
const router = useRouter()
const auth   = useAuthStore()

const isFirstLogin = computed(() => route.query.from !== 'settings')

const currentPassword = shallowRef('')
const newPassword     = shallowRef('')
const confirmPassword = shallowRef('')
const loading         = shallowRef(false)
const error           = shallowRef(null)
const success         = shallowRef(false)

// ── Validation ANSSI ────────────────────────────────────────────────────────

const SPECIAL_RE = /[!@#$%^&*()\-_=+\[\]{}|;:,.<>?/~`'"\\]/

const criteria = computed(() => {
  const p = newPassword.value
  return {
    length:  p.length >= 8,
    upper:   /[A-Z]/.test(p),
    lower:   /[a-z]/.test(p),
    digit:   /[0-9]/.test(p),
    special: SPECIAL_RE.test(p),
    match:   p.length > 0 && p === confirmPassword.value,
  }
})

const isValid = computed(() => Object.values(criteria.value).every(Boolean))

const canSubmit = computed(() =>
  isValid.value &&
  !loading.value &&
  (isFirstLogin.value || currentPassword.value.length > 0)
)

// ── Soumission ──────────────────────────────────────────────────────────────

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value   = null
  try {
    await auth.changePassword(currentPassword.value, newPassword.value, isFirstLogin.value)
    success.value = true
    setTimeout(() => {
      if (isFirstLogin.value) {
        router.replace(auth.profileComplete ? '/' : '/onboarding')
      } else {
        router.replace('/guide')
      }
    }, 1200)
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

const CRITERIA_LABELS = [
  { key: 'length',  label: '8 caractères minimum' },
  { key: 'upper',   label: 'Une majuscule' },
  { key: 'lower',   label: 'Une minuscule' },
  { key: 'digit',   label: 'Un chiffre' },
  { key: 'special', label: 'Un caractère spécial (!@#…)' },
  { key: 'match',   label: 'Les mots de passe correspondent' },
]
</script>

<template>
  <div class="min-h-dvh bg-stone-100 flex flex-col items-center justify-center px-6">
    <div class="w-full max-w-sm">

      <!-- En-tête -->
      <div class="text-center mb-8">
        <p class="text-xs font-black tracking-[0.35em] text-stone-400 uppercase mb-2">Momentum</p>
        <h1 class="text-2xl font-black text-stone-800 leading-tight">
          {{ isFirstLogin ? 'Bienvenue !' : 'Mot de passe' }}
        </h1>
        <p class="text-sm text-stone-500 mt-1.5 font-medium">
          {{ isFirstLogin
              ? 'Choisissez un mot de passe personnel pour sécuriser votre compte.'
              : 'Modifiez votre mot de passe.' }}
        </p>
      </div>

      <!-- Carte -->
      <div class="bg-white rounded-2xl shadow-sm border border-stone-100 p-6">

        <!-- Succès -->
        <div v-if="success" class="text-center py-4">
          <p class="text-2xl mb-2">✓</p>
          <p class="text-sm font-semibold text-stone-800">Mot de passe modifié !</p>
          <p class="text-xs text-stone-400 mt-1">Redirection en cours…</p>
        </div>

        <!-- Formulaire -->
        <form v-else @submit.prevent="submit" class="flex flex-col gap-4">

          <!-- Mot de passe actuel (mode paramètres uniquement) -->
          <div v-if="!isFirstLogin" class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-stone-500 uppercase tracking-widest">
              Mot de passe actuel
            </label>
            <input
              v-model="currentPassword"
              type="password"
              autocomplete="current-password"
              placeholder="••••••••"
              required
              class="w-full px-4 py-3 rounded-xl bg-stone-100 border border-transparent text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-orange-400 focus:bg-white transition-colors"
            />
          </div>

          <!-- Nouveau mot de passe -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-stone-500 uppercase tracking-widest">
              Nouveau mot de passe
            </label>
            <input
              v-model="newPassword"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••"
              required
              class="w-full px-4 py-3 rounded-xl bg-stone-100 border border-transparent text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-orange-400 focus:bg-white transition-colors"
            />
          </div>

          <!-- Checklist ANSSI -->
          <ul v-if="newPassword.length > 0 || confirmPassword.length > 0" class="flex flex-col gap-1 px-1">
            <li
              v-for="c in CRITERIA_LABELS"
              :key="c.key"
              class="flex items-center gap-2 text-xs transition-colors"
              :class="criteria[c.key] ? 'text-emerald-600' : 'text-stone-400'"
            >
              <span class="w-3.5 text-center font-bold">{{ criteria[c.key] ? '✓' : '·' }}</span>
              {{ c.label }}
            </li>
          </ul>

          <!-- Confirmation -->
          <div class="flex flex-col gap-1.5">
            <label class="text-xs font-semibold text-stone-500 uppercase tracking-widest">
              Confirmer le mot de passe
            </label>
            <input
              v-model="confirmPassword"
              type="password"
              autocomplete="new-password"
              placeholder="••••••••"
              required
              class="w-full px-4 py-3 rounded-xl bg-stone-100 border border-transparent text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-orange-400 focus:bg-white transition-colors"
            />
          </div>

          <p v-if="error" class="text-xs text-red-500 font-medium text-center">{{ error }}</p>

          <button
            type="submit"
            :disabled="!canSubmit"
            class="w-full py-3.5 rounded-xl font-bold text-sm transition-all active:scale-[0.98]"
            :class="canSubmit
              ? 'bg-orange-500 text-white shadow-sm shadow-orange-200 hover:bg-orange-600'
              : 'bg-stone-200 text-stone-400 cursor-not-allowed'"
          >
            {{ loading ? 'Enregistrement…' : 'Enregistrer le mot de passe' }}
          </button>

          <!-- Lien retour (mode paramètres uniquement) -->
          <button
            v-if="!isFirstLogin"
            type="button"
            @click="router.replace('/guide')"
            class="text-xs text-stone-400 text-center w-full py-1 hover:text-stone-600 transition-colors"
          >
            Annuler
          </button>

        </form>
      </div>
    </div>
  </div>
</template>
```

- [ ] **Step 2 : Commit**

```bash
git add src/views/ChangePasswordView.vue
git commit -m "feat: vue ChangePasswordView avec validation ANSSI"
```

---

### Task 4 : Modifier `router/index.js`

**Files:**
- Modify: `src/router/index.js`

- [ ] **Step 1 : Importer `ChangePasswordView` et ajouter la route**

Après les imports existants des views, ajouter :
```js
import ChangePasswordView from '@/views/ChangePasswordView.vue'
```

Dans le tableau `routes`, après la route `/tutorial` :
```js
{ path: '/change-password', component: ChangePasswordView, meta: { changePassword: true } },
```

- [ ] **Step 2 : Ajouter le guard dans `router.beforeEach`**

Dans `router.beforeEach`, après la ligne `if (!auth.isAuthenticated) return '/login'`, ajouter :
```js
if (!auth.passwordChanged && !to.meta.changePassword) return '/change-password'
```

La section du guard doit ressembler à :
```js
if (to.meta.public)        return
if (!auth.isAuthenticated) return '/login'
if (!auth.passwordChanged && !to.meta.changePassword) return '/change-password'
if (!auth.profileComplete && !to.meta.onboarding) return '/onboarding'
if (auth.profileComplete  && to.meta.onboarding)  return '/'
if (auth.profileComplete && !auth.user?.tutorial_seen && !to.meta.tutorial) return '/tutorial'
if (to.path === '/login')  return '/'
```

- [ ] **Step 3 : Commit**

```bash
git add src/router/index.js
git commit -m "feat(router): guard password_changed + route /change-password"
```

---

### Task 5 : Modifier `GuideView.vue`

**Files:**
- Modify: `src/views/GuideView.vue`

- [ ] **Step 1 : Ajouter le bouton dans la section Compte**

Dans la section "Compte", ajouter ce bouton **entre** "Revoir le tuto" et "Actualiser les données" :

```html
<button
  @click="router.push('/change-password?from=settings')"
  class="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-stone-50 transition-colors"
>
  <span class="text-sm text-stone-600">Changer mon mot de passe</span>
  <span class="text-stone-300">›</span>
</button>
```

- [ ] **Step 2 : Commit**

```bash
git add src/views/GuideView.vue
git commit -m "feat(guide): bouton changer mot de passe dans les paramètres"
```

---

## Pour appliquer en production

1. S'assurer que Directus tourne
2. Exécuter le script une seule fois :
   ```bash
   DIRECTUS_URL=https://ton-domaine.com DIRECTUS_TOKEN=<admin_token> node scripts/add-password-changed-field.cjs
   ```
3. Déployer le build frontend (`npm run build`)
4. Les utilisateurs existants ayant `password_changed = null / false` seront redirigés au prochain login
