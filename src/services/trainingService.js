import planData from '@/data/plan.json'

export async function getPlan() {
  // Future : return await fetch('/api/plan').then(r => r.json())
  return planData
}

export async function getWeek(weekNumber) {
  const plan = await getPlan()
  return plan.weeks.find(w => w.weekNumber === weekNumber) || null
}

export async function getSession(sessionId) {
  const plan = await getPlan()
  for (const week of plan.weeks) {
    const session = week.sessions.find(s => s.id === sessionId)
    if (session) return session
  }
  return null
}
