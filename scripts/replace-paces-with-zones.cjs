const fs = require('fs');
const path = require('path');

const planPath = path.join(__dirname, '../src/data/plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

// ─── Dérivation de zone depuis les métadonnées de session ─────────────────────

function parseZonesFromLabel(label) {
  return [...label.matchAll(/Z(\d)/g)].map(m => `Z${m[1]}`)
}

function zoneFromScore(score) {
  if (score <= 2) return 'Z1'
  if (score <= 4) return 'Z2'
  if (score <= 6) return 'Z3'
  if (score <= 7) return 'Z4'
  return 'Z5'
}

function inferZone(session, blockType) {
  const declared = session.intensityZones ?? []
  const fromLabel = parseZonesFromLabel(session.intensityLabel ?? '')
  const score = session.intensityScore ?? 5

  if (blockType === 'intervals') {
    // Les intervalles = intensité max de la séance
    const all = [...new Set([...declared, ...fromLabel])].sort()
    if (all.length > 0) return all[all.length - 1] // zone la plus haute
    return score >= 7 ? 'Z5' : score >= 5 ? 'Z4' : 'Z3'
  }

  if (blockType === 'brick_run') {
    // La partie course d'un brick est toujours aérobie modérée
    return 'Z3'
  }

  if (blockType === 'mini_race') {
    return score >= 6 ? 'Z4' : 'Z3'
  }

  // target_pace, warmup avec pace → zone primaire de la séance
  if (declared.length > 0) return declared[0]
  if (fromLabel.length > 0) return fromLabel[0]
  return zoneFromScore(score)
}

// ─── Transformation ───────────────────────────────────────────────────────────

let count = 0

for (const week of plan.weeks) {
  for (const session of week.sessions) {
    for (const block of session.structuredDetails ?? []) {

      // target_pace : { him, her } → { zone }
      if (block.type === 'target_pace' && (block.him ?? block.her)) {
        block.zone = inferZone(session, 'target_pace')
        delete block.him
        delete block.her
        count++
        continue
      }

      // Blocs avec pace: { him, her } (intervals, warmup, etc.)
      if (block.pace?.him !== undefined) {
        block.paceZone = inferZone(session, block.type)
        delete block.pace
        count++
        continue
      }

      // brick_run : pace: { min, max }
      if (block.type === 'brick_run' && block.pace?.min !== undefined) {
        block.paceZone = inferZone(session, 'brick_run')
        delete block.pace
        count++
        continue
      }
    }
  }
}

fs.writeFileSync(planPath, JSON.stringify(plan, null, 2));
console.log(`Done: ${count} blocs mis à jour.`);
