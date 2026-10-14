// Notes d'exercice (collection Directus exercise_notes) : ce que l'athlète veut se rappeler la prochaine fois.
// Les droits limitent déjà chaque athlète à ses propres notes ; le filtre sur le profil reste explicite
// pour qu'un compte admin connecté à l'app ne voie que les siennes.
import { request } from './directus'

const FIELDS = 'id,session_id,exercise_id,station_id,note,date_created'
// En salle le réseau est faible : un appel sans réponse est abandonné, la boîte d'envoi le reprendra.
const TIMEOUT_MS = 15000
// Notes passées gardées pour les rappeler : des années, à quelques notes par semaine
const RECENT = 500

// ── Directus a-t-il la collection (scripts/add-exercise-notes.cjs) ? ─────────
// null : pas encore su depuis l'ouverture de l'app. Une fois vue, on s'en souvient sur le téléphone :
// le champ doit s'ouvrir même sans réseau.
const LS_NOTES = 'momentum-exercise-notes'

function recalled() {
  try { return localStorage.getItem(LS_NOTES) === '1' } catch { return false }
}
let known = recalled() ? true : null

function remember(available) {
  known = available
  try {
    if (available) localStorage.setItem(LS_NOTES, '1')
    else localStorage.removeItem(LS_NOTES)
  } catch {}
}

export const canTakeNotes = () => known === true

/** Notes de l'athlète, les plus récentes d'abord. Dit au passage si Directus a la collection (il répond 403 sinon). */
export async function fetchRecentNotes(profileId) {
  try {
    const rows = await request('GET', '/items/exercise_notes', {
      params: { 'filter[athlete_profile_id][_eq]': profileId, fields: FIELDS, sort: '-date_created', limit: RECENT },
      timeoutMs: TIMEOUT_MS,
    })
    remember(true)
    return rows
  } catch (e) {
    if (e.status === 403) remember(false)
    throw e
  }
}

/** Notes de l'athlète pour une séance */
export function fetchSessionNotes(profileId, sessionId) {
  return request('GET', '/items/exercise_notes', {
    params: { 'filter[athlete_profile_id][_eq]': profileId, 'filter[session_id][_eq]': sessionId, fields: FIELDS, limit: -1 },
    timeoutMs: TIMEOUT_MS,
  })
}

export function createNote(payload) {
  return request('POST', '/items/exercise_notes', { body: payload, timeoutMs: TIMEOUT_MS })
}

export function updateNote(id, patch) {
  return request('PATCH', `/items/exercise_notes/${id}`, { body: patch, timeoutMs: TIMEOUT_MS })
}

export function deleteNote(id) {
  return request('DELETE', `/items/exercise_notes/${id}`, { timeoutMs: TIMEOUT_MS })
}
