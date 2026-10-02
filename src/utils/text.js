// Règles de texte de l'app : un chiffre ou une pastille avant une phrase.

/** "6-8 reps · RIR 2" → ["6-8 reps", "RIR 2"] */
export function noteChips(note) {
  return String(note ?? '').split('·').map(part => part.trim()).filter(Boolean)
}

/** Texte assez long pour être coupé et déplié au toucher */
export function isLong(text, max = 90) {
  return String(text ?? '').length > max
}
