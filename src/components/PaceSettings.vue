<template>
  <div class="mx-4 mt-3 rounded-xl border border-stone-200 overflow-hidden">
    <button
      class="w-full flex items-center justify-between px-3 py-2.5 bg-stone-50 text-left"
      @click="open = !open"
    >
      <div class="flex items-center gap-2">
        <span class="text-sm">⚡</span>
        <span class="text-xs font-semibold text-stone-600">Allures personnalisées</span>
        <span v-if="!store.tenKmTimeLui && !store.tenKmTimeElle" class="text-[10px] text-orange-500 font-semibold">
          — renseigner les temps 10km
        </span>
      </div>
      <span class="text-stone-400 text-xs">{{ open ? '▲' : '▼' }}</span>
    </button>

    <div v-if="open" class="px-3 py-3 bg-white border-t border-stone-100 space-y-3">
      <p class="text-[11px] text-stone-500 leading-relaxed">
        Entrez vos temps au 10km pour calculer automatiquement les allures de chaque séance (méthode Daniels VDOT).
      </p>

      <div class="grid grid-cols-2 gap-2">
        <!-- LUI -->
        <div>
          <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wide block mb-1">👨 Lui — 10km</label>
          <input
            type="text"
            placeholder="ex: 48:30"
            :value="formatTime(store.tenKmTimeLui)"
            @change="e => save('lui', e.target.value)"
            class="w-full text-xs border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-violet-400"
          />
        </div>
        <!-- ELLE -->
        <div>
          <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wide block mb-1">👩 Elle — 10km</label>
          <input
            type="text"
            placeholder="ex: 57:00"
            :value="formatTime(store.tenKmTimeElle)"
            @change="e => save('elle', e.target.value)"
            class="w-full text-xs border border-stone-200 rounded-lg px-2.5 py-2 focus:outline-none focus:border-violet-400"
          />
        </div>
      </div>

      <div v-if="store.tenKmTimeLui || store.tenKmTimeElle" class="grid grid-cols-2 gap-2 pt-1">
        <div v-if="store.tenKmTimeLui" class="bg-stone-50 rounded-lg px-2 py-1.5 text-center">
          <p class="text-[10px] text-stone-400 mb-0.5">VDOT 👨</p>
          <p class="text-xs font-bold text-stone-700">{{ vdotLui }}</p>
        </div>
        <div v-if="store.tenKmTimeElle" class="bg-stone-50 rounded-lg px-2 py-1.5 text-center">
          <p class="text-[10px] text-stone-400 mb-0.5">VDOT 👩</p>
          <p class="text-xs font-bold text-stone-700">{{ vdotElle }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useTrainingStore } from '@/stores/training'
import { calcVDOT } from '@/utils/paceCalculator'

const store = useTrainingStore()
const open  = ref(false)

// "48:30" → 2910 secondes
function parseTime(str) {
  if (!str) return null
  const parts = str.trim().split(':')
  if (parts.length === 2) {
    const m = parseInt(parts[0]), s = parseInt(parts[1])
    if (isNaN(m) || isNaN(s)) return null
    return m * 60 + s
  }
  return null
}

// 2910 → "48:30"
function formatTime(sec) {
  if (!sec) return ''
  const m = Math.floor(sec / 60)
  const s = String(sec % 60).padStart(2, '0')
  return `${m}:${s}`
}

function save(who, value) {
  const sec = parseTime(value)
  store.setTenKmTime(who, sec)
}

const vdotLui  = computed(() => store.tenKmTimeLui  ? Math.round(calcVDOT(10000, store.tenKmTimeLui)  * 10) / 10 : null)
const vdotElle = computed(() => store.tenKmTimeElle ? Math.round(calcVDOT(10000, store.tenKmTimeElle) * 10) / 10 : null)
</script>
