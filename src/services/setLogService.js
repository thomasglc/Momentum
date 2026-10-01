// Séries réalisées (collection Directus set_logs).
// Les droits limitent déjà chaque athlète à ses propres lignes ; le filtre sur le profil
// reste explicite pour qu'un compte admin connecté à l'app ne voie que les siennes.
import { request } from './directus'

const FIELDS = 'id,session_id,block_strength_exercise_id,exercise_id,set_number,weight_kg,reps,duration_sec,date_created'

/** Séries enregistrées par l'athlète pour une séance */
export function fetchSessionLogs(profileId, sessionId) {
  return request('GET', '/items/set_logs', {
    params: {
      'filter[athlete_profile_id][_eq]': profileId,
      'filter[session_id][_eq]': sessionId,
      fields: FIELDS,
      sort: 'set_number',
      limit: -1,
    },
  })
}

/** Séries de l'athlète pour des exercices donnés, les plus récentes d'abord */
export function fetchExerciseLogs(profileId, exerciseIds, limit = 400) {
  return request('GET', '/items/set_logs', {
    params: {
      'filter[athlete_profile_id][_eq]': profileId,
      'filter[exercise_id][_in]': exerciseIds.join(','),
      fields: FIELDS,
      sort: '-date_created',
      limit,
    },
  })
}

export function createSetLog(payload) {
  return request('POST', '/items/set_logs', { body: payload })
}

export function updateSetLog(id, patch) {
  return request('PATCH', `/items/set_logs/${id}`, { body: patch })
}

export function deleteSetLog(id) {
  return request('DELETE', `/items/set_logs/${id}`)
}
