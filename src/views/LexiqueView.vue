<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { Icon } from '@iconify/vue'

const router   = useRouter()
const appStore = useAppStore()

function goBack() {
  appStore.markProgrammaticBack()
  router.push('/guide')
}

const TERMS = [
  {
    category: 'Formats de séance',
    items: [
      {
        term: 'AMRAP',
        full: 'As Many Rounds As Possible',
        def: 'Tu effectues le plus de tours possible d\'un circuit fixe dans un temps imparti. Pas de pause imposée — tu gères ton rythme pour tenir la durée.',
      },
      {
        term: 'EMOM',
        full: 'Every Minute On the Minute',
        def: 'Toutes les minutes, tu démarres un exercice. Le temps restant après l\'avoir terminé est ta récupération. Plus tu vas vite, plus tu récupères.',
      },
      {
        term: 'Intervalles',
        full: null,
        def: 'Alternance entre des blocs d\'effort intense et des blocs de récupération. Ex : 4 × 4 min en Z4 / 3 min récup. Le nombre de répétitions et les durées sont fixés.',
      },
      {
        term: 'Circuit',
        full: null,
        def: 'Enchaînement de plusieurs exercices différents exécutés les uns après les autres, généralement sans (ou avec peu de) repos entre eux. Un tour = un passage complet sur tous les exercices.',
      },
      {
        term: 'Round',
        full: null,
        def: 'Un passage complet sur l\'ensemble des exercices d\'un circuit. "3 rounds" signifie répéter le circuit 3 fois.',
      },
    ],
  },
  {
    category: 'Hyrox spécifique',
    items: [
      {
        term: 'Brick run',
        full: null,
        def: 'Course à pied effectuée immédiatement après une station, sans transition. Simule les runs entre chaque station en compétition Hyrox. Les jambes sont lourdes — c\'est voulu.',
      },
      {
        term: 'Station',
        full: null,
        def: 'L\'un des 8 exercices fonctionnels du Hyrox (SkiErg, Sled Push, Sled Pull, Burpee Broad Jump, Rowing, Farmer\'s Carry, Sandbag Lunges, Wall Balls). Chaque station est précédée d\'un run de 1 km.',
      },
      {
        term: 'Simulation Hyrox',
        full: null,
        def: 'Séance qui reproduit le format race : alternance runs + stations dans l\'ordre officiel, avec les poids et distances de compétition. Objectif : tester le rythme de course complet.',
      },
    ],
  },
  {
    category: 'Allures & intensité',
    items: [
      {
        term: 'Zone (Z1 → Z5)',
        full: null,
        def: 'Découpage de l\'effort en 5 niveaux d\'intensité basés sur la fréquence cardiaque et/ou l\'allure. Z1 = très facile (récupération active), Z5 = effort maximal court (VMA). Tes allures exactes par zone sont dans l\'onglet Paramètres.',
      },
      {
        term: 'VDOT',
        full: null,
        def: 'Indice de condition aérobie calculé depuis ton temps au 10 km (méthode Jack Daniels). Il sert à calculer tes allures cibles pour chaque zone d\'entraînement.',
      },
      {
        term: 'Seuil',
        full: 'Zone 4 — seuil lactique',
        def: 'Allure à laquelle l\'acide lactique commence à s\'accumuler plus vite qu\'il ne peut être éliminé. C\'est l\'effort le plus élevé que tu peux maintenir sur 20–60 min. Très important dans la progression Hyrox.',
      },
      {
        term: 'VMA',
        full: 'Vitesse Maximale Aérobie — Zone 5',
        def: 'Vitesse à laquelle tu consommes ton maximum d\'oxygène (VO₂max). Efforts courts et très intenses (30 s à 3 min). Améliore le "plafond" de toutes tes autres zones.',
      },
      {
        term: 'RPE',
        full: 'Rate of Perceived Exertion',
        def: 'Echelle de ressenti de l\'effort de 1 à 10. RPE 5 = conversation possible, RPE 8 = phrases courtes seulement, RPE 10 = effort maximal. Utilisé quand l\'allure exacte importe moins que la sensation.',
      },
    ],
  },
  {
    category: 'Récupération',
    items: [
      {
        term: 'Récup active',
        full: null,
        def: 'Récupération en continuant à bouger à très basse intensité (Z1) — trot très lent, marche, vélo léger. Maintient la circulation et accélère l\'élimination des déchets musculaires vs un arrêt complet.',
      },
      {
        term: 'Déload',
        full: null,
        def: 'Semaine de charge réduite (volume et/ou intensité abaissés de 30–50 %) planifiée pour permettre la super-compensation. Ce n\'est pas une semaine de repos — tu t\'entraînes, mais moins fort.',
      },
    ],
  },
]

const open = ref(new Set())
function toggle(key) {
  if (open.value.has(key)) open.value.delete(key)
  else open.value.add(key)
  open.value = new Set(open.value)
}
</script>

<template>
  <div class="pb-8">

    <!-- Header -->
    <div class="sticky top-0 z-10 bg-stone-100 border-b border-stone-200 px-4 py-3 flex items-center gap-3">
      <button
        @click="goBack"
        class="w-8 h-8 flex items-center justify-center rounded-full text-stone-500 active:bg-stone-200 transition-colors -ml-1"
        aria-label="Retour"
      >
        <Icon icon="ion:chevron-back" class="text-xl" />
      </button>
      <h1 class="text-base font-black text-stone-800 tracking-tight">Lexique</h1>
    </div>

    <!-- Contenu -->
    <div class="px-4 pt-5 flex flex-col gap-6">
      <section v-for="cat in TERMS" :key="cat.category">
        <h2 class="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">{{ cat.category }}</h2>
        <div class="bg-white rounded-2xl shadow-sm border border-stone-100 divide-y divide-stone-100 overflow-hidden">
          <div v-for="item in cat.items" :key="item.term">
            <button
              @click="toggle(cat.category + item.term)"
              class="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-stone-50 transition-colors"
            >
              <div>
                <span class="text-sm font-bold text-stone-800">{{ item.term }}</span>
                <span v-if="item.full" class="ml-2 text-xs text-stone-400">{{ item.full }}</span>
              </div>
              <Icon
                icon="ion:chevron-down"
                class="text-stone-300 text-lg flex-shrink-0 transition-transform duration-200"
                :class="open.has(cat.category + item.term) ? 'rotate-180' : ''"
              />
            </button>
            <div
              v-if="open.has(cat.category + item.term)"
              class="px-4 pb-4 text-sm text-stone-600 leading-relaxed bg-stone-50 border-t border-stone-100"
            >
              <p class="pt-3">{{ item.def }}</p>
            </div>
          </div>
        </div>
      </section>
    </div>

  </div>
</template>
