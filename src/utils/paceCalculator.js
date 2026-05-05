/**
 * Calcul d'allures par zones — méthode Jack Daniels VDOT
 * Référence : "Running Formula" 3e éd., Daniels (2013)
 *
 * Principe : à partir d'un temps de course (ex. 10km), on dérive un VDOT
 * (approximation du VO2max), puis on calcule les vitesses cibles pour
 * chaque zone d'intensité définie par Daniels.
 */

// ─── Formules Daniels ────────────────────────────────────────────────────────

/** VO2 consommé à la vitesse v (m/min) */
function vo2AtVelocity(v) {
  return -4.60 + 0.182258 * v + 0.000104 * v * v
}

/** Fraction du VO2max utilisée pour une course de durée t (minutes) */
function fractionAtDuration(t) {
  return (
    0.8 +
    0.1894393 * Math.exp(-0.012778 * t) +
    0.2989558 * Math.exp(-0.1932605 * t)
  )
}

/** VDOT calculé depuis une performance de course */
export function calcVDOT(distanceM, timeSec) {
  const t = timeSec / 60
  const v = distanceM / t
  return vo2AtVelocity(v) / fractionAtDuration(t)
}

/**
 * Vitesse (m/min) correspondant à une intensité donnée (% du VDOT).
 * Résolution de : 0.000104·v² + 0.182258·v − (4.60 + vdot·pct) = 0
 */
function velocityAtIntensity(vdot, pct) {
  const a = 0.000104
  const b = 0.182258
  const c = -(4.60 + vdot * pct)
  return (-b + Math.sqrt(b * b - 4 * a * c)) / (2 * a)
}

// ─── Utilitaires ─────────────────────────────────────────────────────────────

function toSecPerKm(vMperMin) {
  return (1000 / vMperMin) * 60
}

function formatPace(secPerKm) {
  const m = Math.floor(secPerKm / 60)
  const s = String(Math.round(secPerKm % 60)).padStart(2, '0')
  return `${m}:${s}/km`
}

// ─── Définition des zones ─────────────────────────────────────────────────────
//
// Zones définies selon Daniels en % du VDOT (≈ %VO2max) :
//
//  Z1  Récupération          60–64 %   Active recovery, pas d'adaptation
//  Z2  Endurance Fondamentale 65–74 %  Développement aérobie de base (EF)
//  Z3  Marathon              75–84 %   Tempo modéré, économie de course
//  Z4  Seuil lactique        85–88 %   Repousse le seuil, améliore le tempo
//  Z5  VO2max / Fractionné   95–100 %  Développement VO2max, intervalles
//
// Note : la zone 83–88 % est parfois chevauchante dans la littérature.
// On retient ici les bornes strictes Daniels qui évitent les zones grises.

const ZONES = {
  Z1: { label: 'Récupération',           pctRange: [0.60, 0.64] },
  Z2: { label: 'Endurance Fondamentale', pctRange: [0.65, 0.74] },
  Z3: { label: 'Marathon',               pctRange: [0.75, 0.84] },
  Z4: { label: 'Seuil lactique',         pctRange: [0.85, 0.88] },
  Z5: { label: 'VO2max / Fractionné',    pctRange: [0.95, 1.00] },
}

// ─── API publique ─────────────────────────────────────────────────────────────

/**
 * Calcule toutes les zones depuis un temps au 10km.
 *
 * @param {number} tenKmTimeSec  Temps au 10km en secondes
 * @returns {{
 *   vdot: number,
 *   Z1|Z2|Z3|Z4|Z5: { label: string, display: string, minSec: number, maxSec: number }
 * }}
 *
 * @example
 *   calcZones(45 * 60)
 *   // { vdot: 45.3, Z2: { label: 'Endurance Fondamentale', display: '5:42–6:29/km', ... }, ... }
 */
export function calcZones(tenKmTimeSec) {
  const vdot = calcVDOT(10000, tenKmTimeSec)
  const zones = { vdot: Math.round(vdot * 10) / 10 }

  for (const [key, { label, pctRange }] of Object.entries(ZONES)) {
    const [lo, hi] = pctRange
    // Intensité haute → vitesse haute → allure basse (plus rapide)
    const fastSec = toSecPerKm(velocityAtIntensity(vdot, hi))
    const slowSec = toSecPerKm(velocityAtIntensity(vdot, lo))
    zones[key] = {
      label,
      minSec: Math.round(fastSec),
      maxSec: Math.round(slowSec),
      display: `${formatPace(fastSec)}–${formatPace(slowSec)}`,
    }
  }

  return zones
}

/**
 * Allure affichable pour une zone et un temps au 10km.
 * Retourne la clé de zone telle quelle si le temps est absent.
 *
 * @param {'Z1'|'Z2'|'Z3'|'Z4'|'Z5'} zone
 * @param {number|null} tenKmTimeSec
 */
export function paceForZone(zone, tenKmTimeSec) {
  if (!tenKmTimeSec) return zone
  return calcZones(tenKmTimeSec)[zone]?.display ?? zone
}
