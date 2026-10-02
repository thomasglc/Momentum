<template>
  <section class="bg-white rounded-2xl shadow-sm border border-stone-100 p-4">
    <!-- Ce qu'il en est d'aujourd'hui quand la séance proposée n'est pas celle du jour -->
    <p v-if="context" class="text-sm font-semibold text-stone-700 pb-3 mb-3 border-b border-stone-100">{{ context }}</p>

    <p class="text-xs font-bold uppercase tracking-wider mb-2.5" :class="focus.kind === 'late' ? 'text-amber-600' : 'text-stone-400'">
      {{ label }}
    </p>

    <div class="flex items-center gap-3">
      <div class="w-12 h-12 flex-shrink-0 rounded-xl flex items-center justify-center text-2xl" :class="cfg.iconBg" aria-hidden="true">
        {{ cfg.icon }}
      </div>
      <div class="flex-1 min-w-0">
        <p class="font-bold text-stone-900 text-base leading-snug">{{ focus.session.title }}</p>
        <p v-if="meta || focus.session.optional" class="mt-0.5 flex items-center gap-1.5 flex-wrap text-xs text-stone-500">
          <span v-if="meta">{{ meta }}</span>
          <span v-if="focus.session.optional" class="font-semibold px-1.5 py-0.5 rounded-full bg-stone-100 text-stone-500">Optionnel</span>
        </p>
      </div>
    </div>

    <button
      type="button"
      class="w-full mt-4 py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
      :class="focus.kind === 'next' ? 'bg-stone-100 text-stone-700' : cfg.pendingBtn"
      @click="emit('open', focus.session)"
    >{{ cta }}</button>
  </section>
</template>

<script setup>
import { computed } from 'vue'
import { getSessionTypeConfig } from '@/constants/sessionTypes'

const props = defineProps({
  focus:     { type: Object, required: true }, // { kind: 'today' | 'late' | 'next', session, week, date }
  context:   { type: String, default: '' },    // « Repos aujourd'hui », « Séance du jour validée »
  setsCount: { type: Number, default: 0 },     // séries prévues, connues une fois la séance chargée
  first:     { type: Boolean, default: false }, // le plan n'a pas commencé : c'est la première séance
})

const emit = defineEmits(['open'])

const cfg = computed(() => getSessionTypeConfig(props.focus.session.type))

const longDate = iso => new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

const label = computed(() => {
  const { kind, date, session } = props.focus
  if (kind === 'today') return `Aujourd'hui · ${longDate(date)}`
  if (kind === 'late') return `À rattraper · prévue ${session.day.toLowerCase()}`
  const heading = props.first ? 'Première séance' : 'Prochaine séance'
  return date ? `${heading} · ${longDate(date)}` : heading
})

const meta = computed(() => [
  props.focus.session.duration > 0 ? `${props.focus.session.duration} min` : '',
  props.setsCount > 0 ? `${props.setsCount} séries` : '',
].filter(Boolean).join(' · '))

const cta = computed(() => {
  if (props.focus.kind === 'next') return 'Voir la séance'
  return props.focus.session.type === 'strength' ? 'Commencer la séance' : 'Voir la séance'
})
</script>
