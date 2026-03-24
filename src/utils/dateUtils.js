/**
 * Returns the current training week number (1-based, clamped to totalWeeks).
 * @param {string} startDate  ISO date string of plan start (e.g. "2026-05-18")
 * @param {number} totalWeeks Total weeks in the plan
 */
export function getCurrentWeekNumber(startDate, totalWeeks) {
  const start = new Date(startDate)
  const today = new Date()
  const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24))
  const week = Math.floor(diffDays / 7) + 1
  return Math.max(1, Math.min(week, totalWeeks))
}
