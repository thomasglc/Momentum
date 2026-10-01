// Passage des lignes Directus aux détails de bloc (aucun import : testable avec node --test).
// Utilisé par les deux chemins de trainingService : chargement d'une séance et préchargement du plan.

export function formatExercise(row) {
  const name = row.exercise_id?.name ?? row.custom_label ?? 'Exercice'
  let str
  if (row.sets && row.reps)              str = `${row.sets}×${row.reps} ${name}`
  else if (row.sets && row.duration_sec) str = `${row.sets}×${row.duration_sec}s ${name}`
  else if (row.duration_sec)             str = `${row.duration_sec}s ${name}`
  else if (row.reps)                     str = `${row.reps} ${name}`
  else                                   str = name
  if (row.note) str += ` (${row.note})`
  return str
}

export function formatStation(row) {
  const name = row.station_id?.name ?? row.custom_label ?? 'Station'
  let str = name
  if (row.distance_m)      str += ` ${row.distance_m}m`
  else if (row.reps)       str += ` ${row.reps} reps`
  if (row.weight_kg_female != null && row.weight_kg_male != null)
    str += ` (${row.weight_kg_female}kg F / ${row.weight_kg_male}kg H)`
  else if (row.weight_kg_male != null)
    str += ` (${row.weight_kg_male}kg)`
  else if (row.weight_kg_female != null)
    str += ` (${row.weight_kg_female}kg)`
  if (row.note) str += ` (${row.note})`
  return str
}

/** URL des images d'une entrée de catalogue (exercise_catalog ou station_catalog) */
export function imagesOf(catalogItem) {
  const urls = catalogItem?.image_urls
  return Array.isArray(urls) ? urls.filter(u => typeof u === 'string' && u) : []
}

/** Ligne block_strength_exercises (avec exercise_id déplié) → ligne structurée pour la saisie des séries */
export function toExerciseRow(row) {
  const catalog = row.exercise_id
  const expanded = catalog !== null && typeof catalog === 'object'
  return {
    id: row.id,
    exerciseId: (expanded ? catalog.id : catalog) ?? null,
    name: (expanded ? catalog.name : null) ?? row.custom_label ?? 'Exercice',
    // Les données existantes contiennent des 0 et des chaînes vides là où rien n'est prévu.
    sets: row.sets || null,
    reps: row.reps || null,
    durationSec: row.duration_sec || null,
    weightKg: row.weight_kg || null,
    note: row.note || null,
    images: imagesOf(catalog),
  }
}

export function strengthDetail(block, rows) {
  return {
    type: 'strength',
    restSec: block.rest_sec ?? null,
    note: block.note || null,
    exercises: rows.map(formatExercise),
    rows: rows.map(toExerciseRow),
  }
}

/** Chaînes des stations et, en parallèle, leurs images */
export function stationsDetail(rows) {
  return {
    stations: rows.map(formatStation),
    stationImages: rows.map(row => imagesOf(row.station_id)),
  }
}
