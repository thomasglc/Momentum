<script setup>
import { shallowRef, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['success'])

const auth = useAuthStore()

const email    = shallowRef('')
const password = shallowRef('')
const loading  = shallowRef(false)
const error    = shallowRef(null)

const canSubmit = computed(() => email.value.trim() && password.value && !loading.value)

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value   = null
  try {
    await auth.login(email.value.trim(), password.value)
    emit('success')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="flex flex-col gap-4">

    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-semibold text-stone-500 uppercase tracking-widest">Email</label>
      <input
        v-model="email"
        type="email"
        autocomplete="email"
        placeholder="votre@email.com"
        required
        class="w-full px-4 py-3 rounded-xl bg-stone-100 border border-transparent text-sm text-stone-800 placeholder-stone-400 outline-none focus:border-orange-400 focus:bg-white transition-colors"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label class="text-xs font-semibold text-stone-500 uppercase tracking-widest">Mot de passe</label>
      <input
        v-model="password"
        type="password"
        autocomplete="current-password"
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
      {{ loading ? 'Connexion…' : 'Se connecter' }}
    </button>

  </form>
</template>
