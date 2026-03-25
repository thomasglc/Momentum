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

// ─── structuredDetail → block (for SessionProgramBlock) ──────────────────────

export function structuredDetailToBlock(d) {
  switch (d.type) {
    case 'warmup':
      return { type: 'warmup', header: `Échauffement ${d.durationMin} min`, content: d.label || null }

    case 'cooldown':
      return { type: 'cooldown', header: `Retour au calme ${d.durationMin} min`, content: d.label || null }

    case 'circuit': {
      const hdr = d.label ?? `Circuit × ${d.rounds} passage${d.rounds !== 1 ? 's' : ''}`
      const rest = d.restBetweenMin > 0 ? ` — repos ${d.restBetweenMin} min` : ''
      return { type: 'circuit', header: hdr + rest, exercises: d.stations?.map(parseExercise) ?? null, content: null }
    }

    case 'strength': {
      const parts = []
      if (d.sets > 0) parts.push(`${d.sets} séries`)
      if (d.restSec > 0) parts.push(`repos ${d.restSec}s`)
      return { type: 'strength', header: parts.length ? `Force — ${parts.join(', ')}` : 'Renforcement', exercises: d.exercises?.map(parseExercise) ?? null, content: null }
    }

    case 'finisher': {
      const rest = d.restBetweenMin > 0 ? ` — repos ${d.restBetweenMin} min` : ''
      return { type: 'finisher', header: `Finisher × ${d.rounds}${rest}`, exercises: d.exercises?.map(parseExercise) ?? null, content: null }
    }

    case 'intervals': {
      const dist = d.setDistanceKm != null ? `${d.setDistanceKm} km` : `${d.setDurationMin} min`
      const note = d.recoveryMin > 0 ? `récup ${d.recoveryMin} min` : null
      const paces = d.pace ? { lui: d.pace.him, elle: d.pace.her } : null
      return { type: 'interval', header: `${d.sets} × ${dist}`, paces, note }
    }

    case 'run':
      if (d.pace) return { type: 'pace', paces: { lui: d.pace.him, elle: d.pace.her } }
      return { type: 'text', content: `${d.durationMin} min` }

    case 'target_pace':
      return { type: 'pace', paces: { lui: d.him, elle: d.her } }

    case 'brick_run':
      return { type: 'brick_run', durationMin: d.durationMin, pace: d.pace ?? null, note: d.note ?? null }

    case 'station_block': {
      const duoRoles = d.duoRoles
        ? { elle: d.duoRoles.elle.map(parseExercise), lui: d.duoRoles.lui.map(parseExercise) }
        : null
      const sequence = d.sequence
        ? d.sequence.map(item => {
            if (item.kind !== 'station') return item
            const parsed = parseExercise(item.name)
            let who = null
            if (duoRoles) {
              if (duoRoles.elle.some(e => e.name === parsed.name)) who = 'elle'
              else if (duoRoles.lui.some(e => e.name === parsed.name)) who = 'lui'
            }
            return { kind: 'station', ...parsed, who }
          })
        : null
      return {
        type: 'station_block',
        sequence,
        exercises: (d.stations ?? []).map(parseExercise),
        intercalatedRuns: d.intercalatedRuns ?? null,
        brickFormat: d.brickFormat ?? null,
        formatNote: d.formatNote ?? null,
        duoRoles,
      }
    }

    case 'race_advice':
      return { type: 'race_advice', label: d.label }

    default: // exercise, nutrition, recovery, instruction
      return { type: 'text', content: d.label }
  }
}

// ─── Running segment extractor (structured) ───────────────────────────────────

export function extractRunningSegmentsFromStructured(structuredDetails) {
  const segs = []

  for (const d of structuredDetails) {
    switch (d.type) {
      case 'warmup':
        segs.push({ type: 'warmup', duration: d.durationMin, paces: null })
        break

      case 'cooldown':
        segs.push({ type: 'cooldown', duration: d.durationMin, paces: null })
        break

      case 'run': {
        const paces = d.pace ? { lui: d.pace.him, elle: d.pace.her } : null
        segs.push({ type: 'easy', duration: d.durationMin, paces })
        break
      }

      case 'intervals': {
        const workMin = d.setDistanceKm != null ? Math.round(d.setDistanceKm * 5) : d.setDurationMin
        const recovMin = d.recoveryMin ?? 1.5
        const paces = d.pace ? { lui: d.pace.him, elle: d.pace.her } : null
        for (let i = 0; i < d.sets; i++) {
          segs.push({ type: 'tempo', duration: workMin, paces })
          if (i < d.sets - 1) segs.push({ type: 'recovery', duration: recovMin, paces: null })
        }
        break
      }

      case 'recovery': {
        // Composite "10 min facile + 15 min tempo (...) + 10 min facile" fallen through
        const label = d.label || ''
        if (label.includes(' + ') && /\d+\s*min/.test(label)) {
          for (const part of label.split(/\s*\+\s*/)) {
            const m = part.match(/^(\d+)\s*min(.*)$/)
            if (!m) continue
            const paceM = part.match(/\(lui\s*~?([^\s·)]+)[^)]*·[^e]*elle\s*~?([^)]+)\)/)
            const paces = paceM ? { lui: paceM[1].trim(), elle: paceM[2].trim() } : null
            segs.push({ type: /tempo|seuil/i.test(m[2]) ? 'tempo' : 'easy', duration: parseInt(m[1]), paces })
          }
        }
        break
      }
    }
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
