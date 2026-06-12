<template>
  <div class="mb-5 pace-card rounded-2xl overflow-hidden border border-stone-200/80 shadow-sm">

    <!-- Header -->
    <div class="px-4 pt-4 pb-1">
      <h3 class="text-[10px] uppercase tracking-[0.18em] font-bold text-emerald-600">Déroulé de la séance</h3>
    </div>

    <!-- Bars -->
    <div class="px-4">
      <div class="pace-grid flex items-end gap-[3px]" style="height: 88px">
        <div
          v-for="(seg, i) in segments"
          :key="i"
          class="pace-bar flex-none"
          :class="{ 'pace-bar-hot': seg.type === 'tempo' }"
          :style="{
            flex: String(seg.duration),
            minWidth: '4px',
            height: STYLE(seg.type).h,
            background: `linear-gradient(180deg, ${STYLE(seg.type).top} 0%, ${STYLE(seg.type).bottom} 100%)`,
            animationDelay: `${Math.min(i * 35, 600)}ms`,
          }"
        />
      </div>
      <!-- Time axis -->
      <div class="flex justify-between border-t border-stone-200 pt-1.5 pb-1">
        <span class="text-[10px] font-medium text-stone-400 tabular-nums">0 min</span>
        <span class="text-[10px] font-medium text-stone-400 tabular-nums">{{ totalMin }} min</span>
      </div>
    </div>

    <!-- Timeline : étapes dans l'ordre -->
    <div class="px-4 pb-4 pt-2">
      <div v-for="(step, i) in steps" :key="i" class="step-row flex gap-3">

        <!-- Dot + connector -->
        <div class="flex flex-col items-center flex-shrink-0 pt-[5px]">
          <span
            class="w-2.5 h-2.5 rounded-full"
            :style="{ background: `linear-gradient(135deg, ${STYLE(step.type).top}, ${STYLE(step.type).bottom})` }"
          />
          <span v-if="i < steps.length - 1" class="w-px flex-1 bg-stone-200 my-1" />
        </div>

        <!-- Content -->
        <div class="flex-1 min-w-0 pb-3" :class="{ 'pb-0': i === steps.length - 1 }">
          <div class="flex items-center gap-2">
            <span class="text-[13px] font-bold text-stone-800 leading-tight">{{ step.title }}</span>
            <span class="ml-auto flex items-center gap-1 flex-shrink-0">
              <template v-if="step.paces && store.isDuoMixte">
                <span class="pace-chip" :style="chipStyle(step.type)">👨 {{ step.paces.lui }}</span>
                <span class="pace-chip" :style="chipStyle(step.type)">👩 {{ step.paces.elle }}</span>
              </template>
              <span v-else-if="step.paces" class="pace-chip" :style="chipStyle(step.type)">{{ store.showElle ? step.paces.elle : step.paces.lui }}</span>
            </span>
          </div>
          <div v-if="step.meta || step.recoveryLabel" class="flex items-center gap-2 mt-0.5 flex-wrap">
            <span v-if="step.meta" class="text-[11px] font-medium text-stone-400 tabular-nums">{{ step.meta }}</span>
            <span v-if="step.recoveryLabel" class="text-[11px] font-medium text-stone-400 tabular-nums">{{ step.recoveryLabel }}</span>
          </div>
          <p v-if="step.sub" class="text-[11px] text-stone-500 leading-snug mt-0.5">{{ step.sub }}</p>
        </div>

      </div>
    </div>

  </div>
</template>

<script setup>
import { computed } from 'vue'
import { extractRunningSegmentsFromStructured } from '@/services/sessionParser'
import { useTrainingStore } from '@/stores/training'

const store = useTrainingStore()

const props = defineProps({
  structuredDetails: { type: Array,    required: true },
  resolvePace:       { type: Function, default: null },
})

// Échelle thermique : froid = facile, chaud = intense
// chip = couleur foncée de la teinte, WCAG AA ≥4.5:1 sur fond blanc
const SEG_STYLES = {
  warmup:   { top: '#a3e635', bottom: '#65a30d', h: '46%', chip: '#65a30d' },
  easy:     { top: '#34d399', bottom: '#059669', h: '38%', chip: '#059669' },
  tempo:    { top: '#fbbf24', bottom: '#ef4444', h: '92%', chip: '#b45309' }, // amber-700
  recovery: { top: '#38bdf8', bottom: '#0284c7', h: '20%', chip: '#0369a1' },
  cooldown: { top: '#2dd4bf', bottom: '#0d9488', h: '34%', chip: '#0f766e' },
}

const STYLE = (type) => SEG_STYLES[type] ?? SEG_STYLES.easy

// Chip : texte foncé (chip) + fond teinté léger (top) → contraste WCAG AA garanti
function chipStyle(type) {
  const { top, chip } = STYLE(type)
  return {
    color: chip,
    background: top + '28',
    borderColor: chip + '44',
  }
}

const segments = computed(() => extractRunningSegmentsFromStructured(props.structuredDetails, props.resolvePace))
const totalMin = computed(() => Math.round(segments.value.reduce((sum, s) => sum + (s.duration || 0), 0)))

// Étapes ordonnées construites directement depuis structuredDetails
const steps = computed(() => {
  const out = []
  const sd = props.structuredDetails ?? []

  for (let i = 0; i < sd.length; i++) {
    const d = sd[i]
    switch (d.type) {
      case 'warmup':
        out.push({
          type: 'warmup',
          title: 'Échauffement',
          meta: `${d.durationMin} min`,
          sub: d.label || null,
          paces: props.resolvePace?.(d.paceZone ?? 'Z2') ?? null,
        })
        break

      case 'run': {
        const next = sd[i + 1]
        const zone = d.paceZone
          ?? (next?.type === 'target_pace' ? next.zone : null)
          ?? 'Z2'
        out.push({
          type: 'easy',
          title: 'Footing',
          meta: `${d.durationMin} min`,
          sub: d.label || null,
          paces: props.resolvePace?.(zone) ?? null,
        })
        break
      }

      case 'intervals': {
        const dist = d.setDistanceKm ? `${d.setDistanceKm} km` : `${d.setDurationMin} min`
        out.push({
          type: 'tempo',
          title: `${d.sets} × ${dist}`,
          meta: null,
          recoveryLabel: d.recoveryMin > 0 ? `récup ${d.recoveryMin} min` : null,
          sub: d.label || null,
          paces: d.paceZone ? props.resolvePace?.(d.paceZone) ?? null : null,
        })
        break
      }

      case 'cooldown':
        out.push({
          type: 'cooldown',
          title: 'Retour au calme',
          meta: `${d.durationMin} min`,
          sub: d.label || null,
          paces: props.resolvePace?.(d.paceZone ?? 'Z1') ?? null,
        })
        break
    }
  }

  return out
})
</script>

<style scoped>
.pace-card {
  background:
    radial-gradient(120% 90% at 85% -10%, rgba(16, 185, 129, 0.08) 0%, transparent 55%),
    linear-gradient(165deg, #ffffff 0%, #fafaf9 100%);
}

/* Lignes de repère horizontales discrètes derrière les barres */
.pace-grid {
  background-image: repeating-linear-gradient(
    180deg,
    rgba(28, 25, 23, 0.05) 0px,
    rgba(28, 25, 23, 0.05) 1px,
    transparent 1px,
    transparent 22px
  );
}

.pace-bar {
  border-radius: 4px 4px 2px 2px;
  transform-origin: bottom;
  animation: pace-grow 0.45s cubic-bezier(0.22, 1, 0.36, 1) both;
}

.pace-bar-hot {
  box-shadow: 0 2px 10px rgba(239, 68, 68, 0.3);
}

@keyframes pace-grow {
  from { transform: scaleY(0); opacity: 0.4; }
  to   { transform: scaleY(1); opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .pace-bar { animation: none; }
}

.recovery-badge {
  font-size: 11px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: #0369a1;
  background: #e0f2fe;
  border: 1px solid #7dd3fc;
  border-radius: 9999px;
  padding: 2px 8px;
  white-space: nowrap;
}

.pace-chip {
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  font-size: 11px;
  border-radius: 9999px;
  border: 1px solid;
  padding: 2px 8px;
  white-space: nowrap;
}
</style>
