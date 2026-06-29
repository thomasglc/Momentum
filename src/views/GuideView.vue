<script setup>
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useTrainingStore } from '@/stores/training'
import { useAuthStore } from '@/stores/auth'
import { calcVDOT, calcZones } from '@/utils/paceCalculator'
import { clearPlanCache } from '@/services/trainingService'

const router = useRouter()
const store  = useTrainingStore()
const auth   = useAuthStore()

// ── Allures ────────────────────────────────────────────────────────────────

function parseTime(str) {
  const parts = str.trim().split(':')
  if (parts.length !== 2) return null
  const m = parseInt(parts[0]), s = parseInt(parts[1])
  if (isNaN(m) || isNaN(s) || s >= 60) return null
  return m * 60 + s
}

function formatTime(sec) {
  if (!sec) return ''
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, '0')}`
}

function savePace(who, value) {
  store.setTenKmTime(who, parseTime(value))
}

const vdotLui  = computed(() => store.tenKmTimeLui  ? Math.round(calcVDOT(10000, store.tenKmTimeLui)  * 10) / 10 : null)
const vdotElle = computed(() => store.tenKmTimeElle ? Math.round(calcVDOT(10000, store.tenKmTimeElle) * 10) / 10 : null)

// ── Zones ──────────────────────────────────────────────────────────────────

const ZONE_STYLES = {
  Z1: { bg: 'bg-slate-100',   text: 'text-slate-600',   bar: 'bg-slate-400'   },
  Z2: { bg: 'bg-emerald-50',  text: 'text-emerald-700', bar: 'bg-emerald-400' },
  Z3: { bg: 'bg-amber-50',    text: 'text-amber-700',   bar: 'bg-amber-400'   },
  Z4: { bg: 'bg-orange-50',   text: 'text-orange-700',  bar: 'bg-orange-500'  },
  Z5: { bg: 'bg-red-50',      text: 'text-red-700',     bar: 'bg-red-500'     },
}

const ZONE_KEYS = ['Z1', 'Z2', 'Z3', 'Z4', 'Z5']

const athletes = computed(() => {
  const list = []
  if (store.isDuoMixte) {
    if (store.tenKmTimeLui)  list.push({ label: '👨 Lui',  zones: calcZones(store.tenKmTimeLui) })
    if (store.tenKmTimeElle) list.push({ label: '👩 Elle', zones: calcZones(store.tenKmTimeElle) })
  } else if (store.showLui && store.tenKmTimeLui) {
    list.push({ label: 'Votre temps', zones: calcZones(store.tenKmTimeLui) })
  } else if (store.showElle && store.tenKmTimeElle) {
    list.push({ label: 'Votre temps', zones: calcZones(store.tenKmTimeElle) })
  }
  return list
})

// ── Compte ─────────────────────────────────────────────────────────────────

function refreshCache() {
  clearPlanCache()
  router.replace('/')
}

function logout() {
  auth.logout()
  clearPlanCache()
  router.replace('/login')
}
</script>

<template>
  <div class="px-4 py-5 pb-8 flex flex-col gap-6">

    <!-- Section allures -->
    <section>
      <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Allures de course</h2>
      <div class="bg-white rounded-2xl shadow-sm border border-stone-100 p-4 flex flex-col gap-4">
        <p class="text-xs text-stone-500 leading-relaxed">
          Temps au 10km utilisés pour calculer automatiquement les allures de chaque séance (méthode VDOT).
        </p>

        <!-- Duo mixte : deux colonnes Lui / Elle -->
        <div v-if="store.isDuoMixte" class="grid grid-cols-2 gap-3">
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wide">👨 Lui</label>
            <input
              type="text"
              placeholder="ex: 48:30"
              :value="formatTime(store.tenKmTimeLui)"
              @change="e => savePace('lui', e.target.value)"
              class="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400 transition-colors"
            />
            <p v-if="vdotLui" class="text-[10px] text-stone-400 text-center">VDOT {{ vdotLui }}</p>
          </div>
          <div class="flex flex-col gap-1.5">
            <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wide">👩 Elle</label>
            <input
              type="text"
              placeholder="ex: 57:00"
              :value="formatTime(store.tenKmTimeElle)"
              @change="e => savePace('elle', e.target.value)"
              class="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400 transition-colors"
            />
            <p v-if="vdotElle" class="text-[10px] text-stone-400 text-center">VDOT {{ vdotElle }}</p>
          </div>
        </div>

        <!-- Solo / double men / double women : un seul champ -->
        <div v-else class="flex flex-col gap-1.5">
          <label class="text-[10px] font-bold text-stone-400 uppercase tracking-wide">Votre temps</label>
          <input
            v-if="store.showLui"
            type="text"
            placeholder="ex: 48:30"
            :value="formatTime(store.tenKmTimeLui)"
            @change="e => savePace('lui', e.target.value)"
            class="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400 transition-colors"
          />
          <input
            v-else
            type="text"
            placeholder="ex: 57:00"
            :value="formatTime(store.tenKmTimeElle)"
            @change="e => savePace('elle', e.target.value)"
            class="w-full text-sm border border-stone-200 rounded-xl px-3 py-2.5 focus:outline-none focus:border-orange-400 transition-colors"
          />
          <p v-if="store.showLui && vdotLui" class="text-[10px] text-stone-400 text-center">VDOT {{ vdotLui }}</p>
          <p v-else-if="store.showElle && vdotElle" class="text-[10px] text-stone-400 text-center">VDOT {{ vdotElle }}</p>
        </div>
      </div>
    </section>

    <!-- Section zones -->
    <section v-if="athletes.length">
      <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Zones de course</h2>
      <div class="flex flex-col gap-3">
        <div
          v-for="athlete in athletes"
          :key="athlete.label"
          class="bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden"
        >
          <!-- En-tête -->
          <div class="px-4 pt-4 pb-3 flex items-center justify-between border-b border-stone-100">
            <span class="text-sm font-bold text-stone-800">{{ athlete.label }}</span>
            <span class="text-xs font-semibold text-stone-400">VDOT {{ athlete.zones.vdot }}</span>
          </div>

          <!-- Zones -->
          <div class="divide-y divide-stone-50">
            <div
              v-for="key in ZONE_KEYS"
              :key="key"
              class="flex items-center gap-3 px-4 py-2.5"
              :class="ZONE_STYLES[key].bg"
            >
              <div class="w-1 self-stretch rounded-full flex-shrink-0" :class="ZONE_STYLES[key].bar" />
              <div class="flex-1 min-w-0">
                <p class="text-[10px] font-bold uppercase tracking-wider" :class="ZONE_STYLES[key].text">
                  {{ key }} · {{ athlete.zones[key].label }}
                </p>
              </div>
              <span class="text-xs font-semibold text-stone-700 tabular-nums flex-shrink-0">
                {{ athlete.zones[key].display }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Placeholder si aucun temps renseigné -->
    <section v-else>
      <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Zones de course</h2>
      <div class="bg-white rounded-2xl border border-stone-100 px-4 py-6 text-center">
        <p class="text-sm text-stone-400">Renseigne un temps au 10km ci-dessus pour voir tes zones.</p>
      </div>
    </section>

    <!-- Section compte -->
    <section>
      <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">Compte</h2>
      <div class="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-100">

        <div class="px-4 py-3.5 flex items-center justify-between">
          <span class="text-sm text-stone-500">Connecté en tant que</span>
          <span class="text-sm font-semibold text-stone-800">{{ [auth.user?.first_name, auth.user?.last_name].filter(Boolean).join(' ') || '—' }}</span>
        </div>

        <div class="px-4 py-3.5 flex items-center justify-between">
          <span class="text-sm text-stone-500">Genre</span>
          <span class="text-sm font-semibold text-stone-800 capitalize">{{ auth.user?.gender ?? '—' }}</span>
        </div>

        <button
          @click="router.push('/tutorial?replay=1')"
          class="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-stone-50 transition-colors"
        >
          <span class="text-sm text-stone-600">Revoir le tuto</span>
          <span class="text-stone-300">›</span>
        </button>

        <button
          @click="router.push('/change-password?from=settings')"
          class="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-stone-50 transition-colors"
        >
          <span class="text-sm text-stone-600">Changer mon mot de passe</span>
          <span class="text-stone-300">›</span>
        </button>

        <button
          @click="refreshCache"
          class="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-stone-50 transition-colors"
        >
          <span class="text-sm text-stone-600">Actualiser les données</span>
          <span class="text-stone-300">↺</span>
        </button>

        <button
          @click="logout"
          class="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-stone-50 transition-colors"
        >
          <span class="text-sm font-semibold text-red-500">Se déconnecter</span>
          <span class="text-stone-300">›</span>
        </button>

      </div>
    </section>

  </div>
</template>
