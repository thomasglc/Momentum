<template>
  <div v-if="session">

    <!-- Hero header -->
    <div class="px-4 pt-5 pb-6" :class="cfg.heroBg">
      <!-- Badge aligné à droite — laisse la gauche libre pour le bouton retour flottant -->
      <div class="flex items-center justify-end gap-2 mb-3 flex-wrap">
        <span class="text-xs font-bold uppercase tracking-widest px-2.5 py-1 rounded-full bg-white/20 text-white flex items-center gap-1.5">
          <span>{{ cfg.icon }}</span>{{ cfg.label }}
        </span>
        <span v-if="session.optional" class="text-xs font-semibold px-2.5 py-1 rounded-full bg-white/10 text-white/70">Optionnel</span>
      </div>
      <h2 class="text-xl font-bold text-white leading-snug mb-2">{{ session.title }}</h2>
      <div class="flex items-center gap-2 text-sm flex-wrap" :class="cfg.heroText">
        <span>{{ session.day }}</span>
        <template v-if="session.duration > 0">
          <span>·</span><span>{{ session.duration }} min</span>
        </template>
        <span>·</span>
        <span class="font-medium">{{ session.intensity }}</span>
      </div>
    </div>

    <!-- Body -->
    <div class="px-4 py-4">

      <!-- Note optionnelle -->
      <div v-if="session.optional" class="mb-4 bg-violet-50 border-l-4 border-violet-300 rounded-r-lg px-3 py-2">
        <p class="text-xs text-violet-700">
          Cette séance est <strong>optionnelle</strong>. À faire uniquement si vous vous sentez bien — le repos complet prime toujours.
        </p>
      </div>

      <!-- Description -->
      <p class="text-sm text-stone-600 mb-4 leading-relaxed">{{ session.description }}</p>

      <!-- Graphique allures (running uniquement) -->
      <SessionPaceChart
        v-if="session.type === 'running' && session.details?.length"
        :details="session.details"
      />

      <!-- Programme -->
      <div v-if="session.details?.length" class="mb-6">
        <h3 class="text-xs uppercase tracking-widest font-semibold text-stone-400 mb-3">Programme</h3>
        <div class="space-y-2">
          <SessionProgramBlock
            v-for="(block, i) in parsedBlocks"
            :key="i"
            :block="block"
          />
        </div>
      </div>

      <!-- Bouton valider -->
      <button
        v-if="session.duration > 0 || session.type === 'race'"
        @click="emit('toggle')"
        class="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
        :class="completed ? cfg.completedBtn : cfg.pendingBtn"
      >
        {{ completed ? '✓ Séance validée — Annuler' : 'Valider la séance' }}
      </button>

    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getSessionTypeConfig } from '@/constants/sessionTypes'
import { parseBlock } from '@/services/sessionParser'
import SessionPaceChart    from './session/SessionPaceChart.vue'
import SessionProgramBlock from './session/SessionProgramBlock.vue'

const props = defineProps({
  session:   { type: Object,  required: true },
  completed: { type: Boolean, default: false },
})

const emit = defineEmits(['toggle'])

const cfg          = computed(() => getSessionTypeConfig(props.session?.type))
const parsedBlocks = computed(() => (props.session?.details ?? []).map(parseBlock))
</script>
