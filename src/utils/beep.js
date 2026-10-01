// Signal sonore de fin de repos, synthétisé avec Web Audio (aucun fichier son).
let ctx = null

/**
 * À appeler pendant un geste de l'utilisateur (un appui) : les navigateurs mobiles
 * n'autorisent le son qu'à partir de là.
 */
export function unlockAudio() {
  const AudioContextClass = window.AudioContext ?? window.webkitAudioContext
  if (!AudioContextClass) return
  try {
    // Safari : un son bref de type notification se superpose à la musique en cours au lieu de la couper.
    if (navigator.audioSession) navigator.audioSession.type = 'transient'
    ctx ??= new AudioContextClass()
    if (ctx.state === 'suspended') ctx.resume()
  } catch {} // pas de son : le compte à rebours reste visible
}

/** Trois bips courts, le dernier plus aigu. Renvoie false si le son n'a pas pu être déverrouillé. */
export function playBeep() {
  if (!ctx || ctx.state !== 'running') return false
  const start = ctx.currentTime
  ;[[0, 880], [0.22, 880], [0.44, 1175]].forEach(([offset, frequency]) => {
    const osc  = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = frequency
    // Montée et descente rapides pour éviter le claquement de début et de fin
    gain.gain.setValueAtTime(0.0001, start + offset)
    gain.gain.exponentialRampToValueAtTime(0.35, start + offset + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, start + offset + 0.18)
    osc.connect(gain).connect(ctx.destination)
    osc.start(start + offset)
    osc.stop(start + offset + 0.2)
  })
  return true
}
