// Séries réalisées (collection Directus set_logs) : séries de muscu, et tours sur les stations.
// Les droits limitent déjà chaque athlète à ses propres lignes ; le filtre sur le profil
// reste explicite pour qu'un compte admin connecté à l'app ne voie que les siennes.
import { request } from './directus'

const FIELDS = 'id,session_id,block_strength_exercise_id,exercise_id,set_number,weight_kg,reps,duration_sec,date_created'
// Champs ajoutés par scripts/add-station-logs.cjs pour les tours sur les stations
const STATION_FIELDS = 'line_key,station_id,distance_m'

// En salle le réseau est faible : un appel sans réponse est abandonné, la boîte d'envoi le reprendra.
const TIMEOUT_MS = 15000

// ── Directus sait-il enregistrer un tour sur une station ? ───────────────────
// null : pas encore essayé depuis l'ouverture de l'app. Une fois vu, on s'en souvient sur le téléphone :
// la saisie d'un circuit doit s'ouvrir même sans réseau.
const LS_STATIONS = 'momentum-station-logs'

function recalled() {
  try { return localStorage.getItem(LS_STATIONS) === '1' } catch { return false }
}
let stations = recalled() ? true : null

function remember(known) {
  stations = known
  try {
    if (known) localStorage.setItem(LS_STATIONS, '1')
    else localStorage.removeItem(LS_STATIONS)
  } catch {}
}

export const canLogStations = () => stations === true

/**
 * Lit avec les champs des stations. Si Directus les refuse (le script n'est pas encore passé),
 * relit sans eux : les séries de muscu restent lisibles, et on ne redemande plus avant la prochaine ouverture.
 * read(champs en plus) → promesse des lignes ; champs en plus vaut '' pour la lecture sans les stations.
 */
async function withStationFields(read) {
  if (stations !== false) {
    try {
      const rows = await read(STATION_FIELDS)
      remember(true)
      return rows
    } catch (e) {
      if (e.status !== 403 && e.status !== 400) throw e
      remember(false)
    }
  }
  return read('')
}

const plus = (fields, extra) => (extra ? `${fields},${extra}` : fields)

/** Séries et tours enregistrés par l'athlète pour une séance */
export function fetchSessionLogs(profileId, sessionId) {
  return withStationFields(extra => request('GET', '/items/set_logs', {
    params: {
      'filter[athlete_profile_id][_eq]': profileId,
      'filter[session_id][_eq]': sessionId,
      fields: plus(FIELDS, extra),
      sort: 'set_number',
      limit: -1,
    },
    timeoutMs: TIMEOUT_MS,
  }))
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
    timeoutMs: TIMEOUT_MS,
  })
}

/** Tours de l'athlète sur des stations données, les plus récents d'abord. À n'appeler que si canLogStations(). */
export function fetchStationLogs(profileId, stationIds, limit = 400) {
  return request('GET', '/items/set_logs', {
    params: {
      'filter[athlete_profile_id][_eq]': profileId,
      'filter[station_id][_in]': stationIds.join(','),
      fields: plus(FIELDS, STATION_FIELDS),
      sort: '-date_created',
      limit,
    },
    timeoutMs: TIMEOUT_MS,
  })
}

/** Toutes les séries de l'athlète, avec le nom de l'exercice ou de la station : sert au tonnage et aux charges */
export function fetchAllLogs(profileId) {
  return withStationFields(extra => request('GET', '/items/set_logs', {
    params: {
      'filter[athlete_profile_id][_eq]': profileId,
      fields: plus(
        'id,session_id,exercise_id.id,exercise_id.name,weight_kg,reps,duration_sec,date_created',
        extra && 'station_id.id,station_id.name,distance_m',
      ),
      sort: 'date_created',
      limit: -1,
    },
  }))
}

export function createSetLog(payload) {
  return request('POST', '/items/set_logs', { body: payload, timeoutMs: TIMEOUT_MS })
}

export function updateSetLog(id, patch) {
  return request('PATCH', `/items/set_logs/${id}`, { body: patch, timeoutMs: TIMEOUT_MS })
}

export function deleteSetLog(id) {
  return request('DELETE', `/items/set_logs/${id}`, { timeoutMs: TIMEOUT_MS })
}
