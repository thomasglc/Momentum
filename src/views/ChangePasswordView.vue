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
