# Tuto de bienvenue — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Carrousel de 5 slides présentant le fonctionnement de l'app après l'onboarding, persisté via un champ Directus `tutorial_seen`.

**Architecture:** Nouvelle route `/tutorial` + guard router (login → onboarding → tutorial → `/`). La vue réutilise les vrais composants (WeekNav, SessionCard, ProgressBar) avec des données factices. Un script `.cjs` ajoute le champ Directus et étend la permission update de l'Athlete Policy.

**Tech Stack:** Vue 3 `<script setup>`, Pinia, vue-router (hash), Tailwind, Directus 11 (localhost:8056). Pas de framework de test — vérifications manuelles dans le navigateur.

**Spec:** `docs/superpowers/specs/2026-06-10-welcome-tutorial-design.md`

---

### Task 1: Champ Directus `tutorial_seen` + permission

**Files:**
- Create: `scripts/add-tutorial-field.cjs`

- [ ] **Step 1: Écrire le script**

```js
// scripts/add-tutorial-field.cjs
// Ajoute athlete_profiles.tutorial_seen (boolean, défaut false)
// et l'autorise dans la permission update de l'Athlete Policy.
const DIRECTUS_URL = 'http://localhost:8056'
const TOKEN = '4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb'
const ATHLETE_POLICY = 'bc59f79d-1d78-4cd3-8d0e-8312f3c66701'

async function api(method, path, body) {
  const res = await fetch(`${DIRECTUS_URL}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}: ${await res.text()}`)
  return res.status === 204 ? null : (await res.json()).data
}

async function main() {
  // 1. Champ tutorial_seen (idempotent : skip si déjà présent)
  const fields = await api('GET', '/fields/athlete_profiles')
  if (fields.some(f => f.field === 'tutorial_seen')) {
    console.log('Champ tutorial_seen déjà présent — skip')
  } else {
    await api('POST', '/fields/athlete_profiles', {
      field: 'tutorial_seen',
      type: 'boolean',
      schema: { default_value: false, is_nullable: false },
      meta: { interface: 'boolean', hidden: false, note: 'Tuto de bienvenue vu' },
    })
    console.log('Champ tutorial_seen créé')
  }

  // 2. Permission update de l'Athlete Policy : ajouter tutorial_seen aux fields
  const perms = await api('GET',
    `/permissions?filter[policy][_eq]=${ATHLETE_POLICY}&filter[collection][_eq]=athlete_profiles&filter[action][_eq]=update`)
  if (!perms.length) throw new Error('Permission update athlete_profiles introuvable')
  for (const p of perms) {
    const fieldSet = new Set([...(p.fields ?? []), 'tutorial_seen'])
    await api('PATCH', `/permissions/${p.id}`, { fields: [...fieldSet] })
    console.log(`Permission ${p.id} mise à jour : ${[...fieldSet].join(', ')}`)
  }
}

main().catch(e => { console.error(e); process.exit(1) })
```

- [ ] **Step 2: Exécuter le script**

Run: `node scripts/add-tutorial-field.cjs`
Expected:
```
Champ tutorial_seen créé
Permission 79 mise à jour : gender, ten_km_time_sec, tutorial_seen
```

- [ ] **Step 3: Vérifier côté Directus**

Run (PowerShell):
```powershell
$r = Invoke-RestMethod -Uri "http://localhost:8056/items/athlete_profiles?fields=id,tutorial_seen" -Headers @{Authorization="Bearer 4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb"}; $r.data
```
Expected: chaque profil existant a `tutorial_seen: False`.

- [ ] **Step 4: Commit**

```bash
git add scripts/add-tutorial-field.cjs
git commit -m "feat: add tutorial_seen field to athlete_profiles (Directus)"
```

---

### Task 2: Store auth — `tutorial_seen` + `markTutorialSeen()`

**Files:**
- Modify: `src/stores/auth.js`

- [ ] **Step 1: Ajouter `tutorial_seen` aux fields de `fetchProfile`**

Dans `fetchProfile()` (~ligne 83), remplacer :
```js
    url.searchParams.set('fields', 'id,name,gender,ten_km_time_sec,plan_id')
```
par :
```js
    url.searchParams.set('fields', 'id,name,gender,ten_km_time_sec,plan_id,tutorial_seen')
```

- [ ] **Step 2: Ajouter l'action `markTutorialSeen`**

Insérer après la fonction `saveProfile` (après sa ligne de fermeture `}`) :

```js
  async function markTutorialSeen() {
    const existingId = user.value?.id
    // Optimiste : on débloque la navigation même si le PATCH échoue
    user.value = { ...user.value, tutorial_seen: true }
    if (!existingId) return
    try {
      await _authedFetch(`${DIRECTUS_URL}/items/athlete_profiles/${existingId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tutorial_seen: true }),
      })
    } catch {} // réessayé implicitement au prochain login si échec
  }
```

- [ ] **Step 3: Exporter l'action**

Remplacer la ligne de return du store :
```js
  return { token, user, isAuthenticated, profileComplete, init, login, logout, fetchProfile, saveProfile }
```
par :
```js
  return { token, user, isAuthenticated, profileComplete, init, login, logout, fetchProfile, saveProfile, markTutorialSeen }
```

- [ ] **Step 4: Commit**

```bash
git add src/stores/auth.js
git commit -m "feat: track tutorial_seen in auth store"
```

---

### Task 3: Vue TutorialView (carrousel 5 slides)

**Files:**
- Create: `src/views/TutorialView.vue`

- [ ] **Step 1: Créer la vue complète**

```vue
<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { getPlan } from '@/services/trainingService'
import WeekNav from '@/components/WeekNav.vue'
import ProgressBar from '@/components/ProgressBar.vue'
import SessionCard from '@/components/SessionCard.vue'

const router = useRouter()
const route  = useRoute()
const auth   = useAuthStore()

const isReplay = computed(() => route.query.replay === '1')

const slide = ref(0)
const TOTAL = 5
const totalWeeks = ref(null)

onMounted(async () => {
  try { totalWeeks.value = (await getPlan()).plan.totalWeeks } catch {}
})

// Données factices pour les mockups
const demoSessions = [
  { id: 'demo-run',   day: 'Mardi',    type: 'running',  title: 'Intervalles 4×4 min Z4',  duration: 50, intensityScore: 8, optional: false },
  { id: 'demo-hyrox', day: 'Samedi',   type: 'hyrox',    title: 'Circuit stations + runs', duration: 60, intensityScore: 9, optional: false },
  { id: 'demo-opt',   day: 'Dimanche', type: 'running',  title: 'Footing récup Z1',        duration: 30, intensityScore: 2, optional: true },
]
const demoDone = { id: 'demo-done', day: 'Mardi', type: 'running', title: 'Intervalles 4×4 min Z4', duration: 50, intensityScore: 8, optional: false }

const ZONES = [
  { key: 'Z1', label: 'Récupération', bar: 'bg-slate-400',   bg: 'bg-slate-100'   },
  { key: 'Z2', label: 'Endurance',    bar: 'bg-emerald-400', bg: 'bg-emerald-50'  },
  { key: 'Z3', label: 'Tempo',        bar: 'bg-amber-400',   bg: 'bg-amber-50'    },
  { key: 'Z4', label: 'Seuil',        bar: 'bg-orange-500',  bg: 'bg-orange-50'   },
  { key: 'Z5', label: 'VMA',          bar: 'bg-red-500',     bg: 'bg-red-50'      },
]

function next() { if (slide.value < TOTAL - 1) slide.value++ }
function prev() { if (slide.value > 0) slide.value-- }

// Swipe tactile
let touchStartX = 0
function onTouchStart(e) { touchStartX = e.changedTouches[0].clientX }
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchStartX
  if (dx < -40) next()
  else if (dx > 40) prev()
}

async function finish() {
  if (isReplay.value) { router.back(); return }
  await auth.markTutorialSeen()
  router.replace('/')
}
</script>

<template>
  <div
    class="min-h-screen bg-stone-100 flex flex-col"
    @touchstart="onTouchStart"
    @touchend="onTouchEnd"
  >
    <!-- Header : Passer -->
    <div class="flex justify-end px-5 pt-5">
      <button
        @click="finish"
        class="text-xs font-semibold text-stone-400 px-3 py-1.5 rounded-full active:bg-stone-200 transition-colors"
      >{{ isReplay ? 'Fermer' : 'Passer' }}</button>
    </div>

    <!-- Slides -->
    <div class="flex-1 flex flex-col justify-center px-6 pb-4 overflow-hidden">
      <Transition name="slide-fade" mode="out-in">

        <!-- 1. Bienvenue -->
        <div v-if="slide === 0" key="s0" class="text-center">
          <p class="text-xs font-black tracking-[0.35em] text-stone-400 uppercase mb-3">Momentum</p>
          <p class="text-5xl mb-4">🎉</p>
          <h1 class="text-2xl font-black text-stone-800 leading-tight mb-2">
            Ton plan{{ totalWeeks ? ` de ${totalWeeks} semaines` : '' }} est prêt
          </h1>
          <p class="text-sm text-stone-500 leading-relaxed">
            Un programme structuré en phases qui montent en intensité jusqu'à ta course.
            Petit tour du fonctionnement en 4 écrans.
          </p>
        </div>

        <!-- 2. Ta semaine -->
        <div v-else-if="slide === 1" key="s1">
          <h2 class="text-xl font-black text-stone-800 text-center mb-2">Ta semaine</h2>
          <p class="text-sm text-stone-500 text-center leading-relaxed mb-4">
            L'écran d'accueil affiche la semaine en cours. Les flèches naviguent
            entre les semaines, le badge indique la phase du plan.
          </p>
          <div class="pointer-events-none select-none">
            <WeekNav
              :weekNumber="3" :todayWeekNumber="3"
              theme="Volume + technique stations"
              dateRange="22–28 Juin" :phase="1"
              :canGoPrev="true" :canGoNext="true"
            />
            <div class="mx-4 mt-3 bg-orange-50 border-l-4 border-orange-400 rounded-r-lg px-3 py-2">
              <p class="text-xs text-orange-800">Les notes de semaine donnent le focus du coach.</p>
            </div>
          </div>
        </div>

        <!-- 3. Tes séances -->
        <div v-else-if="slide === 2" key="s2">
          <h2 class="text-xl font-black text-stone-800 text-center mb-2">Tes séances</h2>
          <p class="text-sm text-stone-500 text-center leading-relaxed mb-4">
            Course, renfo ou Hyrox — chaque type a sa couleur. Touche une carte
            pour voir le détail complet. Les séances optionnelles sont en bonus.
          </p>
          <div class="pointer-events-none select-none flex flex-col gap-2.5">
            <SessionCard v-for="s in demoSessions" :key="s.id" :session="s" />
          </div>
        </div>

        <!-- 4. Tes allures -->
        <div v-else-if="slide === 3" key="s3">
          <h2 class="text-xl font-black text-stone-800 text-center mb-2">Tes allures</h2>
          <p class="text-sm text-stone-500 text-center leading-relaxed mb-4">
            Chaque course est prescrite en zone (Z1 à Z5), calculée depuis ton temps
            au 10km. Tes allures exactes sont dans l'onglet Guide.
          </p>
          <div class="pointer-events-none select-none bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden divide-y divide-stone-50">
            <div
              v-for="z in ZONES" :key="z.key"
              class="flex items-center gap-3 px-4 py-2.5" :class="z.bg"
            >
              <div class="w-1 self-stretch rounded-full flex-shrink-0" :class="z.bar" />
              <p class="flex-1 text-[11px] font-bold uppercase tracking-wider text-stone-600">
                {{ z.key }} · {{ z.label }}
              </p>
            </div>
          </div>
        </div>

        <!-- 5. Valide tes séances -->
        <div v-else key="s4">
          <h2 class="text-xl font-black text-stone-800 text-center mb-2">Valide tes séances</h2>
          <p class="text-sm text-stone-500 text-center leading-relaxed mb-4">
            Séance terminée ? Coche-la depuis son détail : la progression de ta
            semaine avance, et c'est synchronisé sur tous tes appareils.
          </p>
          <div class="pointer-events-none select-none">
            <ProgressBar :progress="67" />
            <div class="px-4 mt-1">
              <SessionCard :session="demoDone" :completed="true" />
            </div>
          </div>
        </div>

      </Transition>
    </div>

    <!-- Footer : dots + navigation -->
    <div class="px-6 pb-8 flex flex-col gap-5">
      <div class="flex justify-center gap-2">
        <button
          v-for="n in TOTAL" :key="n"
          @click="slide = n - 1"
          class="w-2 h-2 rounded-full transition-all"
          :class="slide === n - 1 ? 'bg-orange-500 w-5' : 'bg-stone-300'"
        />
      </div>
      <div class="flex gap-3">
        <button
          v-if="slide > 0"
          @click="prev"
          class="px-5 py-3.5 rounded-xl font-bold text-sm bg-stone-200 text-stone-600 active:scale-[0.98] transition-all"
        >‹</button>
        <button
          v-if="slide < TOTAL - 1"
          @click="next"
          class="flex-1 py-3.5 rounded-xl font-bold text-sm bg-orange-500 text-white shadow-sm shadow-orange-200 active:scale-[0.98] transition-all"
        >Suivant</button>
        <button
          v-else
          @click="finish"
          class="flex-1 py-3.5 rounded-xl font-bold text-sm bg-orange-500 text-white shadow-sm shadow-orange-200 active:scale-[0.98] transition-all"
        >C'est parti !</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.slide-fade-enter-active, .slide-fade-leave-active { transition: opacity 180ms, transform 180ms; }
.slide-fade-enter-from { opacity: 0; transform: translateX(24px); }
.slide-fade-leave-to   { opacity: 0; transform: translateX(-24px); }
</style>
```

- [ ] **Step 2: Commit**

```bash
git add src/views/TutorialView.vue
git commit -m "feat: welcome tutorial carousel view (5 slides)"
```

---

### Task 4: Route `/tutorial` + guard router

**Files:**
- Modify: `src/router/index.js`

- [ ] **Step 1: Importer la vue et déclarer la route**

Ajouter l'import après celui d'`OnboardingView` (ligne 12) :
```js
import TutorialView from '@/views/TutorialView.vue'
```

Dans le tableau `routes`, après la ligne `/onboarding` :
```js
  { path: '/tutorial',   component: TutorialView,   meta: { tutorial: true } },
```

- [ ] **Step 2: Ajouter le check dans le guard**

Dans `router.beforeEach`, remplacer :
```js
  if (!auth.profileComplete && !to.meta.onboarding) return '/onboarding'
  if (auth.profileComplete  && to.meta.onboarding)  return '/'
```
par :
```js
  if (!auth.profileComplete && !to.meta.onboarding) return '/onboarding'
  if (auth.profileComplete  && to.meta.onboarding)  return '/'
  if (auth.profileComplete && !auth.user?.tutorial_seen && !to.meta.tutorial) return '/tutorial'
```

Note : pas de redirect inverse quand `tutorial_seen = true` — la route reste
accessible librement pour le mode replay (`/tutorial?replay=1`).

- [ ] **Step 3: Vérification manuelle du flow complet**

1. `npm run dev`
2. Créer un user de test (PowerShell) :
```powershell
$body = '{"email":"test.tuto@test.com","password":"Test1234!","role":"c8d65f20-1b83-40f8-b171-c7a584dab0fe","first_name":"Test","last_name":"Tuto","status":"active"}'
Invoke-RestMethod -Uri "http://localhost:8056/users" -Method POST -Headers @{Authorization="Bearer 4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb"; "Content-Type"="application/json"} -Body $body
```
3. Se connecter avec `test.tuto@test.com` / `Test1234!` → onboarding s'affiche
4. Remplir genre + temps 10km, « Commencer » → **le tuto s'affiche** (slide 1)
5. Parcourir les 5 slides (boutons ET swipe), vérifier les mockups
6. « C'est parti ! » → arrive sur la semaine courante
7. Rafraîchir la page (F5) → **pas de tuto** (tutorial_seen persisté)
8. Vérifier en base :
```powershell
$r = Invoke-RestMethod -Uri "http://localhost:8056/items/athlete_profiles?filter[directus_user_id][_eq]=<USER_ID>&fields=tutorial_seen" -Headers @{Authorization="Bearer 4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb"}; $r.data
```
Expected: `tutorial_seen: True`

9. Nettoyage : supprimer le profil test puis le user test
```powershell
# récupérer l'id du profil puis :
Invoke-RestMethod -Uri "http://localhost:8056/items/athlete_profiles/<PROFILE_ID>" -Method DELETE -Headers @{Authorization="Bearer 4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb"}
Invoke-RestMethod -Uri "http://localhost:8056/users/<USER_ID>" -Method DELETE -Headers @{Authorization="Bearer 4pCpZ9L8D9c4F2W6YRiDKKrjMDtZRuBb"}
```

- [ ] **Step 4: Commit**

```bash
git add src/router/index.js
git commit -m "feat: route /tutorial + redirect after onboarding"
```

---

### Task 5: Lien « Revoir le tuto » dans le Guide

**Files:**
- Modify: `src/views/GuideView.vue`

- [ ] **Step 1: Ajouter le bouton dans la section Compte**

Dans la section Compte, insérer **avant** le bouton « Actualiser les données » :

```html
        <button
          @click="router.push('/tutorial?replay=1')"
          class="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-stone-50 transition-colors"
        >
          <span class="text-sm text-stone-600">Revoir le tuto</span>
          <span class="text-stone-300">›</span>
        </button>
```

(`router` est déjà disponible dans le `<script setup>` de GuideView.)

- [ ] **Step 2: Vérification manuelle du replay**

1. Connecté avec un compte ayant `tutorial_seen = true`, aller dans Guide
2. « Revoir le tuto » → carrousel s'ouvre, bouton haut = « Fermer »
3. Parcourir jusqu'à « C'est parti ! » → retour sur la page Guide (router.back)
4. « Fermer » en cours de route → retour Guide aussi

- [ ] **Step 3: Commit**

```bash
git add src/views/GuideView.vue
git commit -m "feat: replay tutorial link in guide view"
```

---

## Self-Review (fait à l'écriture)

- **Spec coverage** : flow + guard (Task 4), Directus champ + permission (Task 1),
  fetchProfile + markTutorialSeen (Task 2), carrousel 5 slides avec vrais composants (Task 3),
  replay depuis Guide (Task 5). Athlètes existants : couvert par le défaut `false` (Task 1).
- **Placeholders** : aucun — tout le code est complet.
- **Cohérence** : `markTutorialSeen` défini Task 2, utilisé Task 3 ; `meta.tutorial`
  défini Task 4, testé dans le guard Task 4 ; props SessionCard/WeekNav/ProgressBar
  vérifiées contre les composants réels.
