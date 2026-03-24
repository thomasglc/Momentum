<template>
  <div v-if="session" class="px-4 py-4">

    <!-- Badges type + optionnel -->
    <div class="flex items-center gap-2 mb-3 flex-wrap">
      <span class="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full" :class="badgeClass">
        {{ typeLabel }}
      </span>
      <span
        v-if="session.optional"
        class="text-xs font-semibold px-3 py-1 rounded-full bg-gray-100 text-gray-500"
      >Optionnel</span>
    </div>

    <!-- Titre + meta -->
    <h2 class="text-xl font-bold text-gray-900 mb-1">{{ session.title }}</h2>
    <div class="flex items-center gap-3 text-sm text-gray-500 mb-4 flex-wrap">
      <span>{{ session.day }}</span>
      <template v-if="session.duration > 0">
        <span>·</span>
        <span>{{ session.duration }} min</span>
      </template>
      <span>·</span>
      <span class="font-medium" :class="intensityColor">{{ session.intensity }}</span>
    </div>

    <!-- Note optionnel -->
    <div v-if="session.optional" class="mb-4 bg-violet-50 border-l-4 border-violet-300 rounded-r-lg px-3 py-2">
      <p class="text-xs text-violet-700">Cette séance est <strong>optionnelle</strong>. À faire uniquement si vous vous sentez bien — le repos complet prime toujours.</p>
    </div>

    <!-- Description -->
    <p class="text-sm text-gray-600 mb-4 leading-relaxed">{{ session.description }}</p>

    <!-- Graphique allures (running uniquement) -->
    <div v-if="session.type === 'running' && runSegments.length > 0" class="mb-5">
      <h3 class="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-2">Structure de séance</h3>
      <!-- Chart -->
      <div class="flex items-end gap-0.5 rounded-xl bg-gray-100 px-2 pb-2 overflow-hidden" style="height: 72px">
        <div
          v-for="(seg, i) in runSegments"
          :key="i"
          class="rounded-sm flex-none"
          :style="{
            flex: String(seg.duration),
            minWidth: '5px',
            height: SEG_STYLES[seg.type]?.h || '38%',
            backgroundColor: SEG_STYLES[seg.type]?.color || '#86efac',
          }"
        />
      </div>
      <!-- Légende + paces des blocs clés -->
      <div class="mt-2 flex flex-col gap-1.5">
        <div
          v-for="(seg, i) in runSegmentsSummary"
          :key="i"
          class="flex items-center gap-2"
        >
          <div class="w-2 h-5 rounded-sm flex-shrink-0" :style="{ backgroundColor: SEG_STYLES[seg.type]?.color }"></div>
          <div>
            <span class="text-xs font-semibold text-gray-700">{{ SEG_LABELS[seg.type] }}</span>
            <span v-if="seg.count > 1" class="text-xs text-gray-400 ml-1">× {{ seg.count }}</span>
            <span v-if="seg.paces" class="text-xs text-gray-500 ml-1.5">
              — 👨 {{ seg.paces.lui }} · 👩 {{ seg.paces.elle }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Programme -->
    <div v-if="session.details?.length" class="mb-6">
      <h3 class="text-xs uppercase tracking-widest font-semibold text-gray-400 mb-3">Programme</h3>
      <div class="space-y-2">
        <div v-for="(block, i) in parsedBlocks" :key="i">

          <!-- Warmup -->
          <div v-if="block.type === 'warmup'" class="rounded-xl overflow-hidden border border-orange-100">
            <div class="flex items-center gap-2 px-3 py-2 bg-orange-100">
              <span>🔥</span>
              <span class="text-xs font-bold text-orange-700 uppercase tracking-wide">{{ block.header }}</span>
            </div>
            <div v-if="block.content" class="px-3 py-2 bg-orange-50">
              <p class="text-xs text-gray-700 leading-relaxed">{{ block.content }}</p>
            </div>
          </div>

          <!-- Cooldown -->
          <div v-else-if="block.type === 'cooldown'" class="rounded-xl overflow-hidden border border-teal-100">
            <div class="flex items-center gap-2 px-3 py-2 bg-teal-100">
              <span>💧</span>
              <span class="text-xs font-bold text-teal-700 uppercase tracking-wide">{{ block.header }}</span>
            </div>
            <div v-if="block.content" class="px-3 py-2 bg-teal-50">
              <p class="text-xs text-gray-700 leading-relaxed">{{ block.content }}</p>
            </div>
          </div>

          <!-- Circuit — exercise grid -->
          <div v-else-if="block.type === 'circuit'" class="rounded-xl overflow-hidden border border-amber-200">
            <div class="flex items-center gap-2 px-3 py-2.5 bg-amber-400">
              <span>⚡</span>
              <span class="text-xs font-bold text-white uppercase tracking-wide">{{ block.header }}</span>
            </div>
            <div v-if="block.exercises?.length" class="p-2 bg-amber-50">
              <div class="grid grid-cols-2 gap-1.5">
                <div
                  v-for="(ex, j) in block.exercises"
                  :key="j"
                  class="bg-white rounded-xl p-2.5 border border-amber-100 flex flex-col items-center text-center"
                >
                  <span class="text-2xl leading-none mb-1.5">{{ ex.emoji }}</span>
                  <p class="text-[11px] font-semibold text-gray-700 leading-tight">{{ ex.name }}</p>
                  <p v-if="ex.value" class="text-sm font-bold text-amber-600 mt-1">{{ ex.value }}</p>
                  <p v-if="ex.note" class="text-[10px] text-gray-400 mt-0.5 leading-tight">{{ ex.note }}</p>
                </div>
              </div>
            </div>
            <div v-else-if="block.content" class="px-3 py-2 bg-amber-50">
              <p class="text-xs text-gray-700 leading-relaxed">{{ block.content }}</p>
            </div>
          </div>

          <!-- Strength — exercise grid -->
          <div v-else-if="block.type === 'strength'" class="rounded-xl overflow-hidden border border-blue-200">
            <div class="flex items-center gap-2 px-3 py-2.5 bg-blue-500">
              <span>💪</span>
              <span class="text-xs font-bold text-white uppercase tracking-wide">{{ block.header }}</span>
            </div>
            <div v-if="block.exercises?.length" class="p-2 bg-blue-50">
              <div class="grid grid-cols-2 gap-1.5">
                <div
                  v-for="(ex, j) in block.exercises"
                  :key="j"
                  class="bg-white rounded-xl p-2.5 border border-blue-100 flex flex-col items-center text-center"
                >
                  <span class="text-2xl leading-none mb-1.5">{{ ex.emoji }}</span>
                  <p class="text-[11px] font-semibold text-gray-700 leading-tight">{{ ex.name }}</p>
                  <p v-if="ex.value" class="text-sm font-bold text-blue-600 mt-1">{{ ex.value }}</p>
                  <p v-if="ex.note" class="text-[10px] text-gray-400 mt-0.5 leading-tight">{{ ex.note }}</p>
                </div>
              </div>
            </div>
            <div v-else-if="block.content" class="px-3 py-2 bg-blue-50">
              <p class="text-xs text-gray-700 leading-relaxed">{{ block.content }}</p>
            </div>
          </div>

          <!-- Finisher — exercise grid -->
          <div v-else-if="block.type === 'finisher'" class="rounded-xl overflow-hidden border border-red-200">
            <div class="flex items-center gap-2 px-3 py-2.5 bg-red-500">
              <span>🔥</span>
              <span class="text-xs font-bold text-white uppercase tracking-wide">{{ block.header }}</span>
            </div>
            <div v-if="block.exercises?.length" class="p-2 bg-red-50">
              <div class="grid grid-cols-2 gap-1.5">
                <div
                  v-for="(ex, j) in block.exercises"
                  :key="j"
                  class="bg-white rounded-xl p-2.5 border border-red-100 flex flex-col items-center text-center"
                >
                  <span class="text-2xl leading-none mb-1.5">{{ ex.emoji }}</span>
                  <p class="text-[11px] font-semibold text-gray-700 leading-tight">{{ ex.name }}</p>
                  <p v-if="ex.value" class="text-sm font-bold text-red-600 mt-1">{{ ex.value }}</p>
                  <p v-if="ex.note" class="text-[10px] text-gray-400 mt-0.5 leading-tight">{{ ex.note }}</p>
                </div>
              </div>
            </div>
            <div v-else-if="block.content" class="px-3 py-2 bg-red-50">
              <p class="text-xs text-gray-700 leading-relaxed">{{ block.content }}</p>
            </div>
          </div>

          <!-- Interval (running) — pace cards -->
          <div v-else-if="block.type === 'interval'" class="rounded-xl border border-emerald-200 overflow-hidden">
            <div class="flex items-center gap-2 px-3 py-2 bg-emerald-100">
              <span>🏃</span>
              <span class="text-xs font-bold text-emerald-800 uppercase tracking-wide">{{ block.header }}</span>
            </div>
            <div class="px-2 py-2 bg-emerald-50 flex gap-2">
              <div class="flex-1 bg-white rounded-lg px-2 py-2 text-center border border-emerald-100">
                <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👨 LUI</p>
                <p class="text-sm font-bold text-emerald-700">{{ block.paces.lui }}</p>
              </div>
              <div class="flex-1 bg-white rounded-lg px-2 py-2 text-center border border-emerald-100">
                <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👩 ELLE</p>
                <p class="text-sm font-bold text-emerald-700">{{ block.paces.elle }}</p>
              </div>
            </div>
            <div v-if="block.note" class="px-3 py-1.5 bg-emerald-50 border-t border-emerald-100">
              <p class="text-[11px] text-gray-500">{{ block.note }}</p>
            </div>
          </div>

          <!-- Pace line (lui/elle) -->
          <div v-else-if="block.type === 'pace'" class="flex gap-2 px-1">
            <div class="flex-1 bg-emerald-50 rounded-lg px-2 py-2 text-center border border-emerald-100">
              <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👨 LUI</p>
              <p class="text-sm font-bold text-emerald-700">{{ block.paces.lui }}</p>
            </div>
            <div class="flex-1 bg-emerald-50 rounded-lg px-2 py-2 text-center border border-emerald-100">
              <p class="text-[10px] text-gray-400 font-semibold mb-0.5">👩 ELLE</p>
              <p class="text-sm font-bold text-emerald-700">{{ block.paces.elle }}</p>
            </div>
          </div>

          <!-- Generic section (header + text) -->
          <div v-else-if="block.type === 'section'" class="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
            <p class="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">{{ block.header }}</p>
            <p class="text-xs text-gray-700 leading-relaxed">{{ block.content }}</p>
          </div>

          <!-- Plain text bullet -->
          <div v-else class="flex items-start gap-2.5 px-1 py-0.5">
            <span class="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-gray-300 mt-1.5"></span>
            <p class="text-sm text-gray-700 leading-relaxed">{{ block.content }}</p>
          </div>

        </div>
      </div>
    </div>

    <!-- Bouton valider -->
    <button
      v-if="session.duration > 0 || session.type === 'race'"
      @click="emit('toggle')"
      class="w-full py-3 rounded-xl font-semibold text-sm transition-all active:scale-[0.98]"
      :class="completed ? completedBtn : pendingBtn"
    >
      {{ completed ? '✓ Séance validée — Annuler' : 'Valider la séance' }}
    </button>

  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  session: { type: Object, required: true },
  completed: { type: Boolean, default: false }
})

const emit = defineEmits(['toggle'])

// ─── Type config ────────────────────────────────────────────────────────────

const typeConfig = {
  running:  { label: 'Course',        badgeClass: 'bg-emerald-100 text-emerald-700', intensityColor: 'text-emerald-600', completedBtn: 'bg-emerald-100 text-emerald-700 border border-emerald-300', pendingBtn: 'bg-emerald-500 text-white' },
  strength: { label: 'Renforcement',  badgeClass: 'bg-blue-100 text-blue-700',       intensityColor: 'text-blue-600',    completedBtn: 'bg-blue-100 text-blue-700 border border-blue-300',       pendingBtn: 'bg-blue-500 text-white' },
  hyrox:    { label: 'Hyrox',         badgeClass: 'bg-amber-100 text-amber-700',     intensityColor: 'text-amber-600',   completedBtn: 'bg-amber-100 text-amber-700 border border-amber-300',     pendingBtn: 'bg-amber-500 text-white' },
  brick:    { label: 'Brick',         badgeClass: 'bg-cyan-100 text-cyan-700',       intensityColor: 'text-cyan-600',    completedBtn: 'bg-cyan-100 text-cyan-700 border border-cyan-300',       pendingBtn: 'bg-cyan-500 text-white' },
  mobility: { label: 'Mobilité',      badgeClass: 'bg-violet-100 text-violet-700',   intensityColor: 'text-violet-600',  completedBtn: 'bg-violet-100 text-violet-700 border border-violet-300',   pendingBtn: 'bg-violet-500 text-white' },
  recovery: { label: 'Récupération',  badgeClass: 'bg-gray-100 text-gray-600',       intensityColor: 'text-gray-500',    completedBtn: 'bg-gray-100 text-gray-600 border border-gray-300',       pendingBtn: 'bg-gray-400 text-white' },
  race:     { label: '🏁 Race Day',   badgeClass: 'bg-red-100 text-red-700',         intensityColor: 'text-red-600',     completedBtn: 'bg-red-100 text-red-700 border border-red-300',         pendingBtn: 'bg-red-500 text-white' },
}

const config = computed(() => typeConfig[props.session?.type] || typeConfig.running)
const typeLabel      = computed(() => config.value.label)
const badgeClass     = computed(() => config.value.badgeClass)
const intensityColor = computed(() => config.value.intensityColor)
const completedBtn   = computed(() => config.value.completedBtn)
const pendingBtn     = computed(() => config.value.pendingBtn)

// ─── Exercise emoji map ──────────────────────────────────────────────────────

function exerciseEmoji(name) {
  const n = name.toLowerCase()
  if (n.includes('skierg') || n.includes('ski')) return '🎿'
  if (n.includes('rameur') || n.includes('rower') || n.includes('row')) return '🚣'
  if (n.includes('farmers') || n.includes('carry')) return '💼'
  if (n.includes('sandbag') || n.includes('sac lest')) return '🧳'
  if (n.includes('wall ball')) return '🏀'
  if (n.includes('burpee')) return '🔥'
  if (n.includes('sled')) return '🛷'
  if (n.includes('lunge') || n.includes('fente')) return '🦵'
  if (n.includes('squat')) return '🦵'
  if (n.includes('planche') || n.includes('plank')) return '⬛'
  if (n.includes('rdl') || n.includes('deadlift')) return '🏋️'
  if (n.includes('hip thrust') || n.includes('hip hinge')) return '🍑'
  if (n.includes('tirage') || n.includes('pull')) return '💪'
  if (n.includes('press') || n.includes('overhead')) return '🏋️'
  if (n.includes('goblet')) return '🏆'
  if (n.includes('rameur') || n.includes('vélo') || n.includes('bike')) return '🚴'
  return '⚡'
}

// ─── Exercise string parser ──────────────────────────────────────────────────

function parseExercise(raw) {
  const s = raw.trim()

  // Extract trailing parenthetical note: "Farmers Carry 2×30m (2×14kg F / 2×20kg H)"
  const noteMatch = s.match(/^(.*?)\s*(\([^)]+\))\s*$/)
  const note = noteMatch ? noteMatch[2] : null
  const main = noteMatch ? noteMatch[1].trim() : s

  let name, value

  // Starts with N×N — sets×reps at beginning: "3×10 Romanian Deadlift"
  const m1 = main.match(/^(\d+[×xX]\d+\w*)\s+(.+)$/)
  if (m1) { value = m1[1]; name = m1[2] }

  // Ends with N×N — reps at end: "Box Squat 4×10"
  if (!name) {
    const m2 = main.match(/^(.+?)\s+(\d+[×xX]\d+\w*)$/)
    if (m2) { name = m2[1]; value = m2[2] }
  }

  // Ends with Nm (distance/time merged): "SkiErg 150m", "2×30m"
  if (!name) {
    const m3 = main.match(/^(.+?)\s+(\d+(?:[×xX]\d+)?[a-zA-Z]+)$/)
    if (m3) { name = m3[1]; value = m3[2] }
  }

  // Ends with "N word": "10 reps", "5 sauts"
  if (!name) {
    const m4 = main.match(/^(.+?)\s+(\d+\s+\w+)$/)
    if (m4) { name = m4[1]; value = m4[2] }
  }

  // Starts with plain N — count at beginning: "10 Wall Balls"
  if (!name) {
    const m0 = main.match(/^(\d+)\s+(.+)$/)
    if (m0) { value = m0[1]; name = m0[2] }
  }

  if (!name) { name = main; value = '' }

  return { emoji: exerciseEmoji(name), name: name.trim(), value: (value || '').trim(), note }
}

// ─── Block parser ────────────────────────────────────────────────────────────

function parseBlock(str) {
  const colonIdx = str.indexOf(' : ')

  // ── No separator ──
  if (colonIdx === -1) {
    const s = str.toLowerCase()

    // Running interval without separator (e.g. "2 × 3 min tempo (lui 4:40/km · elle 5:45/km) — récup …")
    const intervalM = str.match(/^(.+?)\s*\(lui\s*~?([0-9:–\-]+\/km)\s*·\s*elle\s*~?([0-9:–\-]+\/km)\)(.*)$/)
    if (intervalM) {
      const note = intervalM[4].replace(/^\s*[—–-]\s*/, '').trim()
      return { type: 'interval', header: intervalM[1].trim(), paces: { lui: intervalM[2], elle: intervalM[3] }, note }
    }

    if (s.startsWith('échauffement') || s.startsWith('echauffement')) return { type: 'warmup', header: str, content: null }
    if (s.startsWith('retour au calme')) return { type: 'cooldown', header: str, content: null }
    if (s.startsWith('circuit') || s.startsWith('amrap')) return { type: 'circuit', header: str, exercises: null, content: str }
    if (s.startsWith('finisher')) return { type: 'finisher', header: str, exercises: null, content: str }
    if (s.startsWith('bloc force') || s.startsWith('bloc ')) return { type: 'strength', header: str, exercises: null, content: str }

    return { type: 'text', content: str }
  }

  // ── Has "header : content" ──
  const header = str.slice(0, colonIdx).trim()
  const content = str.slice(colonIdx + 3).trim()
  const h = header.toLowerCase()

  // Pace line: "Lui : 5:10–5:25/km · Elle : 6:20–6:40/km"
  if (h === 'lui' || h === 'elle') {
    const parts = content.split(/\s*·\s*Elle\s*:\s*/i)
    const lui = parts[0].trim()
    const elle = (parts[1] || '').trim()
    return { type: 'pace', paces: { lui, elle } }
  }

  if (h.startsWith('échauffement') || h.startsWith('echauffement')) return { type: 'warmup', header, content }
  if (h.startsWith('retour au calme')) return { type: 'cooldown', header, content }

  if (h.includes('circuit') || h.includes('amrap')) {
    return { type: 'circuit', header, exercises: content.split(/\s+[·+]\s+/).map(parseExercise) }
  }
  if (h.includes('renforcement') || h.includes('bloc force') || (h.includes('force') && !h.includes('confort'))) {
    return { type: 'strength', header, exercises: content.split(/\s+[·+]\s+/).map(parseExercise) }
  }
  if (h.includes('finisher')) {
    return { type: 'finisher', header, exercises: content.split(/\s+[·+]\s+/).map(parseExercise) }
  }

  return { type: 'section', header, content }
}

const parsedBlocks = computed(() =>
  (props.session?.details || []).map(parseBlock)
)

// ─── Running pace chart ──────────────────────────────────────────────────────

const SEG_STYLES = {
  warmup:   { color: '#bef264', h: '44%' },
  easy:     { color: '#86efac', h: '36%' },
  tempo:    { color: '#7f1d1d', h: '94%' },
  recovery: { color: '#f9a8d4', h: '22%' },
  cooldown: { color: '#99f6e4', h: '36%' },
}

const SEG_LABELS = {
  warmup:   'Échauffement',
  easy:     'Footing facile',
  tempo:    'Effort / Tempo',
  recovery: 'Récupération',
  cooldown: 'Retour au calme',
}

function extractRunningSegments(details) {
  const segs = []
  const intRécupRe   = /^(\d+)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(km|min)[^\(]*\(lui\s*~?([^\s·)]+)[^)]*·[^e]*elle\s*~?([^)]+)\).*?récup\s+(\d+(?:\.\d+)?)\s*(min|s)/i
  const intNoRécupRe = /^(\d+)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(km|min)[^\(]*\(lui\s*~?([^\s·)]+)[^)]*·[^e]*elle\s*~?([^)]+)\)/i

  for (const str of details) {
    // Composite: "X min facile + Y min tempo (paces) + Z min facile"
    if (str.includes(' + ') && /\d+\s*min/.test(str)) {
      for (const part of str.split(/\s*\+\s*/)) {
        const m = part.match(/^(\d+)\s*min(.*)$/)
        if (!m) continue
        const paceM = part.match(/\(lui\s*~?([^\s·)]+)[^)]*·[^e]*elle\s*~?([^)]+)\)/)
        const paces = paceM ? { lui: paceM[1].trim(), elle: paceM[2].trim() } : null
        segs.push({ type: /tempo|seuil/i.test(m[2]) ? 'tempo' : 'easy', duration: parseInt(m[1]), paces })
      }
      continue
    }

    // Interval with récup
    const m1 = str.match(intRécupRe)
    if (m1) {
      const n = parseInt(m1[1])
      const workMin = m1[3].toLowerCase() === 'km' ? Math.round(parseFloat(m1[2]) * 5) : parseFloat(m1[2])
      const recupMin = m1[7].toLowerCase() === 's' ? parseFloat(m1[6]) / 60 : parseFloat(m1[6])
      const paces = { lui: m1[4].trim(), elle: m1[5].trim() }
      for (let i = 0; i < n; i++) {
        segs.push({ type: 'tempo', duration: workMin, paces })
        if (i < n - 1) segs.push({ type: 'recovery', duration: recupMin, paces: null })
      }
      continue
    }

    // Interval without récup
    const m2 = str.match(intNoRécupRe)
    if (m2) {
      const n = parseInt(m2[1])
      const workMin = m2[3].toLowerCase() === 'km' ? Math.round(parseFloat(m2[2]) * 5) : parseFloat(m2[2])
      const paces = { lui: m2[4].trim(), elle: m2[5].trim() }
      for (let i = 0; i < n; i++) {
        segs.push({ type: 'tempo', duration: workMin, paces })
        if (i < n - 1) segs.push({ type: 'recovery', duration: 1.5, paces: null })
      }
      continue
    }

    // Warmup
    if (/^[Éé]chauffement/i.test(str)) {
      const d = str.match(/(\d+)\s*min/)
      segs.push({ type: 'warmup', duration: d ? parseInt(d[1]) : 10, paces: null })
      continue
    }

    // Cooldown
    if (/retour au calme/i.test(str)) {
      const d = str.match(/(\d+)\s*min/)
      segs.push({ type: 'cooldown', duration: d ? parseInt(d[1]) : 5, paces: null })
      continue
    }

    // Easy footing/run starting with "X min ..."
    const easyM = str.match(/^(\d+)\s*min\s+\w/i)
    if (easyM) {
      const paceM = str.match(/\(lui\s*~?([^\s·)]+)[^)]*·[^e]*elle\s*~?([^)]+)\)/)
      segs.push({ type: 'easy', duration: parseInt(easyM[1]), paces: paceM ? { lui: paceM[1].trim(), elle: paceM[2].trim() } : null })
      continue
    }
    // skip annotations (pace refs, notes, etc.)
  }
  return segs
}

// Grouped summary for the legend (consecutive same-type segments merged with count)
function summarizeSegments(segs) {
  const out = []
  for (const seg of segs) {
    const last = out[out.length - 1]
    if (last && last.type === seg.type) {
      last.count++
      if (!last.paces && seg.paces) last.paces = seg.paces
    } else {
      out.push({ type: seg.type, count: 1, paces: seg.paces })
    }
  }
  // Only show unique types once in legend (keep first occurrence per type)
  const seen = new Set()
  return out.filter(s => {
    if (seen.has(s.type)) return false
    seen.add(s.type)
    return true
  })
}

const runSegments = computed(() =>
  props.session?.type === 'running' ? extractRunningSegments(props.session.details || []) : []
)

const runSegmentsSummary = computed(() => summarizeSegments(runSegments.value))
</script>
