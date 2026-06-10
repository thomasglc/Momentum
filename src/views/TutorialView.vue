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
  { id: 'demo-strength', day: 'Jeudi', type: 'strength', title: 'Renfo haut du corps',     duration: 45, intensityScore: 6, optional: false },
  { id: 'demo-hyrox', day: 'Samedi',   type: 'hyrox',    title: 'Circuit stations + runs', duration: 60, intensityScore: 9, optional: false },
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
    class="fixed inset-0 bg-stone-100 flex flex-col"
    style="padding-top: env(safe-area-inset-top)"
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
            Ton plan est prêt
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
          <div class="pointer-events-none select-none" aria-hidden="true">
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
          <div class="pointer-events-none select-none flex flex-col gap-2.5" aria-hidden="true">
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
          <div class="pointer-events-none select-none bg-white rounded-2xl shadow-sm border border-stone-100 overflow-hidden divide-y divide-stone-50" aria-hidden="true">
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
    <div class="px-6 flex flex-col gap-5" style="padding-bottom: calc(env(safe-area-inset-bottom) + 2rem)">
      <div class="flex justify-center gap-2">
        <button
          v-for="n in TOTAL" :key="n"
          @click="slide = n - 1"
          class="w-2 h-2 rounded-full transition-all"
          :class="slide === n - 1 ? 'bg-orange-500 w-5' : 'bg-stone-300'"
          :aria-label="`Aller à l'écran ${n}`"
        />
      </div>
      <div class="flex gap-3">
        <button
          v-if="slide > 0"
          @click="prev"
          class="px-5 py-3.5 rounded-xl font-bold text-sm bg-stone-200 text-stone-600 active:scale-[0.98] transition-all"
          aria-label="Écran précédent"
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
