// Logique pure des notes d'exercice (testable avec node --test).
//
// Note : { id, sessionId, exerciseId, stationId, ref, text, date }
//        ce que l'athlète veut se rappeler la prochaine fois sur un exercice ou une station.
//        Une par exercice (ref, voir refKeyOf) et par séance.
import { refKeyOf } from './setLogs.js'

export const NOTE_MAX = 300

/** Texte gardé : sans espaces autour, 300 caractères au plus ; '' quand il n'y a rien */
export function cleanNote(text) {
  return String(text ?? '').trim().slice(0, NOTE_MAX)
}

export const noteKey = (sessionId, ref) => `${sessionId}:${ref}`

const idOf = value => (value !== null && typeof value === 'object' ? value.id : value) ?? null

/** Ligne Directus (exercise_notes) → note */
export function toNote(row) {
  const exerciseId = idOf(row.exercise_id)
  const stationId = idOf(row.station_id)
  return {
    id: row.id,
    sessionId: idOf(row.session_id),
    exerciseId,
    stationId,
    ref: refKeyOf({ exerciseId, stationId }),
    text: row.note ?? '',
    date: row.date_created ?? null,
  }
}

/** Clé d'une note ; null quand sa séance ou son exercice a disparu */
export const keyOfNote = note => (note.sessionId == null || note.ref == null ? null : noteKey(note.sessionId, note.ref))

export const sameNote = (value, note) => (value?.text ?? '') === (note?.text ?? '')

// Les dates sont des chaînes ISO : l'ordre alphabétique est l'ordre chronologique
const byDate = (a, b) => String(a ?? '').localeCompare(String(b ?? ''))

/**
 * Note à rappeler sur un exercice : celle de la dernière séance où il a été travaillé.
 * notes : notes de l'athlète sur cet exercice ; previous : sa dernière séance avec des séries ({ date, sets }), ou null.
 * Une note plus ancienne que ces séries, écrite sur une autre séance, ne revient pas :
 * l'exercice a été refait depuis, sans note.
 */
export function lastNote(notes, previous, currentSessionId) {
  const latest = notes
    .filter(note => note.sessionId !== currentSessionId && note.text)
    .reduce((best, note) => (!best || byDate(note.date, best.date) > 0 ? note : best), null)
  if (!latest || !previous) return latest
  const previousSession = previous.sets?.[0]?.sessionId ?? null
  return latest.sessionId === previousSession || byDate(latest.date, previous.date) >= 0 ? latest : null
}

/**
 * Historique d'un exercice (groupHistory) complété de ses notes : chaque séance porte la sienne (note, ou null),
 * et une séance sans série mais avec une note y figure aussi. La plus récente d'abord.
 */
export function withNotes(history, notes) {
  const keyOf = note => (note.sessionId != null ? `s${note.sessionId}` : `d${String(note.date ?? '').slice(0, 10)}`)
  const byKey = new Map(notes.filter(note => note.text).sort((a, b) => byDate(a.date, b.date)).map(note => [keyOf(note), note]))
  const sessions = history.map(session => ({ ...session, note: byKey.get(session.key)?.text ?? null }))
  for (const [key, note] of byKey) {
    if (!sessions.some(session => session.key === key)) sessions.push({ key, date: note.date, sets: [], note: note.text })
  }
  return sessions.sort((a, b) => byDate(b.date, a.date))
}
