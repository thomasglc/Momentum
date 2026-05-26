<script setup>
import { shallowRef, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'

const emit = defineEmits(['success'])

const auth    = useAuthStore()
const gender  = shallowRef(null)
const minutes = shallowRef(50)
const seconds = shallowRef(0)
const loading = shallowRef(false)
const error   = shallowRef(null)

const minuteOptions = Array.from({ length: 61 }, (_, i) => i + 30) // 30 → 90
const secondOptions = Array.from({ length: 12 }, (_, i) => i * 5)  // 0, 5, 10, …, 55

const totalSec  = computed(() => minutes.value * 60 + seconds.value)
const canSubmit = computed(() => !!gender.value && !loading.value)

function pad(n) { return String(n).padStart(2, '0') }

async function submit() {
  if (!canSubmit.value) return
  loading.value = true
  error.value   = null
  try {
    await auth.saveProfile(gender.value, totalSec.value)
    emit('success')
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <form @submit.prevent="submit" class="flex flex-col gap-6">

    <!-- Genre -->
    <div class="flex flex-col gap-2">
      <p class="text-xs font-semibold text-stone-500 uppercase tracking-widest">Je suis</p>
      <div class="grid grid-cols-2 gap-3">
        <button
          v-for="opt in [{ value: 'homme', label: 'Homme', icon: '👨' }, { value: 'femme', label: 'Femme', icon: '👩' }]"
          :key="opt.value"
          type="button"
          @click="gender = opt.value"
          class="flex flex-col items-center gap-2 py-4 rounded-xl border-2 font-semibold text-sm transition-all"
          :class="gender === opt.value
            ? 'border-orange-500 bg-orange-50 text-orange-600'
            : 'border-stone-200 bg-stone-50 text-stone-500'"
        >
          <span class="text-2xl">{{ opt.icon }}</span>
          <span>{{ opt.label }}</span>
        </button>
      </div>
    </div>

    <!-- Temps 10km -->
    <div class="flex flex-col gap-2">
      <p class="text-xs font-semibold text-stone-500 uppercase tracking-widest">Meilleur temps au 10km</p>

      <div class="flex items-center gap-2">
        <!-- Minutes -->
        <div class="flex-1 flex flex-col gap-1">
          <label class="text-[10px] text-stone-400 font-medium text-center">Minutes</label>
          <select
            v-model.number="minutes"
            class="w-full px-3 py-3 rounded-xl bg-stone-100 border border-transparent text-sm text-stone-800 text-center outline-none focus:border-orange-400 focus:bg-white transition-colors appearance-none"
          >
            <option v-for="m in minuteOptions" :key="m" :value="m">{{ m }}</option>
          </select>
        </div>

        <span class="text-xl font-bold text-stone-400 mt-4">:</span>

        <!-- Secondes -->
        <div class="flex-1 flex flex-col gap-1">
          <label class="text-[10px] text-stone-400 font-medium text-center">Secondes</label>
          <select
            v-model.number="seconds"
            class="w-full px-3 py-3 rounded-xl bg-stone-100 border border-transparent text-sm text-stone-800 text-center outline-none focus:border-orange-400 focus:bg-white transition-colors appearance-none"
          >
            <option v-for="s in secondOptions" :key="s" :value="s">{{ pad(s) }}</option>
          </select>
        </div>
      </div>

      <p class="text-[11px] text-stone-400 text-center">
        Allures calculées via la méthode VDOT — temps estimé : {{ minutes }}:{{ pad(seconds) }}
      </p>
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
      {{ loading ? 'Enregistrement…' : 'Commencer' }}
    </button>

  </form>
</template>
