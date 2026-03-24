// ─── Exercise emoji ──────────────────────────────────────────────────────────

export function exerciseEmoji(name) {
  const n = name.toLowerCase()
  if (n.includes('skierg') || n.includes('ski'))          return '🎿'
  if (n.includes('rameur') || n.includes('row'))           return '🚣'
  if (n.includes('farmers') || n.includes('carry'))        return '💼'
  if (n.includes('sandbag') || n.includes('sac lest'))     return '🧳'
  if (n.includes('wall ball'))                             return '🏀'
  if (n.includes('burpee'))                                return '🔥'
  if (n.includes('sled'))                                  return '🛷'
  if (n.includes('lunge') || n.includes('fente'))          return '🦵'
  if (n.includes('squat'))                                 return '🦵'
  if (n.includes('planche') || n.includes('plank'))        return '⬛'
  if (n.includes('rdl') || n.includes('deadlift'))         return '🏋️'
  if (n.includes('hip thrust') || n.includes('hip hinge')) return '🍑'
  if (n.includes('tirage') || n.includes('pull'))          return '💪'
  if (n.includes('press') || n.includes('overhead'))       return '🏋️'
  if (n.includes('goblet'))                                return '🏆'
  if (n.includes('vélo') || n.includes('bike'))            return '🚴'
  return '⚡'
}

// ─── Exercise string parser ──────────────────────────────────────────────────

/**
 * Parses a raw exercise string into { emoji, name, value, note }.
 * Handles formats like: "3×10 Romanian Deadlift", "SkiErg 150m", "10 Wall Balls (6kg)"
 */
export function parseExercise(raw) {
  const s = raw.trim()

  // Extract trailing parenthetical note: "Farmers Carry 2×30m (2×14kg F / 2×20kg H)"
  const noteMatch = s.match(/^(.*?)\s*(\([^)]+\))\s*$/)
  const note = noteMatch ? noteMatch[2] : null
  const main = noteMatch ? noteMatch[1].trim() : s

  let name, value

  // Starts with N×N (sets×reps at beginning): "3×10 Romanian Deadlift"
  const m1 = main.match(/^(\d+[×xX]\d+\w*)\s+(.+)$/)
  if (m1) { value = m1[1]; name = m1[2] }

  // Ends with N×N: "Box Squat 4×10"
  if (!name) {
    const m2 = main.match(/^(.+?)\s+(\d+[×xX]\d+\w*)$/)
    if (m2) { name = m2[1]; value = m2[2] }
  }

  // Ends with Nm (merged distance/time): "SkiErg 150m"
  if (!name) {
    const m3 = main.match(/^(.+?)\s+(\d+(?:[×xX]\d+)?[a-zA-Z]+)$/)
    if (m3) { name = m3[1]; value = m3[2] }
  }

  // Ends with "N word": "10 reps", "5 sauts"
  if (!name) {
    const m4 = main.match(/^(.+?)\s+(\d+\s+\w+)$/)
    if (m4) { name = m4[1]; value = m4[2] }
  }

  // Starts with plain N: "10 Wall Balls"
  if (!name) {
    const m0 = main.match(/^(\d+)\s+(.+)$/)
    if (m0) { value = m0[1]; name = m0[2] }
  }

  if (!name) { name = main; value = '' }

  return { emoji: exerciseEmoji(name), name: name.trim(), value: (value ?? '').trim(), note }
}

// ─── Detail block parser ─────────────────────────────────────────────────────

/**
 * Parses a single detail string into a typed block object.
 *
 * Block types: warmup | cooldown | circuit | strength | finisher |
 *              interval | pace | section | text
 */
export function parseBlock(str) {
  const colonIdx = str.indexOf(' : ')

  if (colonIdx === -1) {
    const s = str.toLowerCase()

    // Running interval: "2 × 3 min tempo (lui 4:40/km · elle 5:45/km) — récup …"
    const intervalM = str.match(/^(.+?)\s*\(lui\s*~?([0-9:–\-]+\/km)\s*·\s*elle\s*~?([0-9:–\-]+\/km)\)(.*)$/)
    if (intervalM) {
      const note = intervalM[4].replace(/^\s*[—–-]\s*/, '').trim()
      return { type: 'interval', header: intervalM[1].trim(), paces: { lui: intervalM[2], elle: intervalM[3] }, note }
    }

    if (s.startsWith('échauffement') || s.startsWith('echauffement'))
      return { type: 'warmup', header: str, content: null }
    if (s.startsWith('retour au calme'))
      return { type: 'cooldown', header: str, content: null }
    if (s.startsWith('circuit') || s.startsWith('amrap'))
      return { type: 'circuit', header: str, exercises: null, content: str }
    if (s.startsWith('finisher'))
      return { type: 'finisher', header: str, exercises: null, content: str }
    if (s.startsWith('bloc force') || s.startsWith('bloc '))
      return { type: 'strength', header: str, exercises: null, content: str }

    return { type: 'text', content: str }
  }

  const header  = str.slice(0, colonIdx).trim()
  const content = str.slice(colonIdx + 3).trim()
  const h       = header.toLowerCase()

  // Pace line: "Lui : 5:10–5:25/km · Elle : 6:20–6:40/km"
  if (h === 'lui' || h === 'elle') {
    const parts = content.split(/\s*·\s*Elle\s*:\s*/i)
    return { type: 'pace', paces: { lui: parts[0].trim(), elle: (parts[1] ?? '').trim() } }
  }

  if (h.startsWith('échauffement') || h.startsWith('echauffement'))
    return { type: 'warmup', header, content }
  if (h.startsWith('retour au calme'))
    return { type: 'cooldown', header, content }

  if (h.includes('circuit') || h.includes('amrap'))
    return { type: 'circuit',  header, exercises: content.split(/\s+[·+]\s+/).map(parseExercise) }
  if (h.includes('renforcement') || h.includes('bloc force') || (h.includes('force') && !h.includes('confort')))
    return { type: 'strength', header, exercises: content.split(/\s+[·+]\s+/).map(parseExercise) }
  if (h.includes('finisher'))
    return { type: 'finisher', header, exercises: content.split(/\s+[·+]\s+/).map(parseExercise) }

  return { type: 'section', header, content }
}

// ─── Running segment extractor ───────────────────────────────────────────────

const INT_RÉCUP_RE    = /^(\d+)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(km|min)[^\(]*\(lui\s*~?([^\s·)]+)[^)]*·[^e]*elle\s*~?([^)]+)\).*?récup\s+(\d+(?:\.\d+)?)\s*(min|s)/i
const INT_NO_RÉCUP_RE = /^(\d+)\s*[×x]\s*(\d+(?:\.\d+)?)\s*(km|min)[^\(]*\(lui\s*~?([^\s·)]+)[^)]*·[^e]*elle\s*~?([^)]+)\)/i

/**
 * Converts raw detail strings of a running session into visual chart segments.
 * Each segment: { type, duration (minutes), paces: { lui, elle } | null }
 */
export function extractRunningSegments(details) {
  const segs = []

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
    const m1 = str.match(INT_RÉCUP_RE)
    if (m1) {
      const n       = parseInt(m1[1])
      const workMin = m1[3].toLowerCase() === 'km' ? Math.round(parseFloat(m1[2]) * 5) : parseFloat(m1[2])
      const recupMin = m1[7].toLowerCase() === 's' ? parseFloat(m1[6]) / 60 : parseFloat(m1[6])
      const paces   = { lui: m1[4].trim(), elle: m1[5].trim() }
      for (let i = 0; i < n; i++) {
        segs.push({ type: 'tempo', duration: workMin, paces })
        if (i < n - 1) segs.push({ type: 'recovery', duration: recupMin, paces: null })
      }
      continue
    }

    // Interval without récup
    const m2 = str.match(INT_NO_RÉCUP_RE)
    if (m2) {
      const n       = parseInt(m2[1])
      const workMin = m2[3].toLowerCase() === 'km' ? Math.round(parseFloat(m2[2]) * 5) : parseFloat(m2[2])
      const paces   = { lui: m2[4].trim(), elle: m2[5].trim() }
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

    // Easy footing starting with "X min ..."
    const easyM = str.match(/^(\d+)\s*min\s+\w/i)
    if (easyM) {
      const paceM = str.match(/\(lui\s*~?([^\s·)]+)[^)]*·[^e]*elle\s*~?([^)]+)\)/)
      segs.push({
        type: 'easy',
        duration: parseInt(easyM[1]),
        paces: paceM ? { lui: paceM[1].trim(), elle: paceM[2].trim() } : null,
      })
      continue
    }
    // Annotations, pace refs, etc. — skipped
  }

  return segs
}

/**
 * Reduces consecutive same-type segments to a summary list for the legend.
 * De-duplicates by type (keeps first occurrence of each).
 */
export function summarizeSegments(segs) {
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
  const seen = new Set()
  return out.filter(s => {
    if (seen.has(s.type)) return false
    seen.add(s.type)
    return true
  })
}
