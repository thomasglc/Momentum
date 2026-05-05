const fs = require('fs'), path = require('path')
const planPath = path.join(__dirname, '../src/data/plan.json')
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'))

let count = 0
for (const week of plan.weeks)
  for (const session of week.sessions)
    if ('intensityZones' in session) { delete session.intensityZones; count++ }

fs.writeFileSync(planPath, JSON.stringify(plan, null, 2))
console.log(`Done: ${count} champs intensityZones supprimés.`)
