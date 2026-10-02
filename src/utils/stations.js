// Repères d'une station Hyrox selon le format de l'athlète.

/**
 * En double, chaque athlète fait la moitié du volume. En solo, il fait tout.
 * Les charges solo femmes ne sont pas encore renseignées : on n'affiche rien plutôt qu'une charge fausse.
 */
export function stationFacts(station, { isSolo, gender }) {
  if (!isSolo) return { volume: station.volume, weight: station.weight ?? null }
  return {
    volume: station.volumeSolo ?? station.volume,
    weight: gender === 'femme' ? null : station.weightSoloMen ?? null,
  }
}
