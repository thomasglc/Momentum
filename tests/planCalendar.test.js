import { test } from 'node:test'
import assert from 'node:assert/strict'
import { todayIso, addDays, mondayOf, planStartFor, weekDates, planStatus, groupPhases } from '../src/utils/planCalendar.js'

// ── dates ────────────────────────────────────────────────────────────────────
test('todayIso donne la date locale, pas la date UTC', () => {
  assert.equal(todayIso(new Date(2026, 9, 2, 23, 30)), '2026-10-02')
  assert.equal(todayIso(new Date(2026, 0, 5, 0, 5)), '2026-01-05')
})
test('addDays avance et recule en franchissant les mois', () => {
  assert.equal(addDays('2026-10-30', 3), '2026-11-02')
  assert.equal(addDays('2026-03-01', -1), '2026-02-28')
})
test('mondayOf renvoie le lundi de la semaine', () => {
  assert.equal(mondayOf('2027-02-13'), '2027-02-08') // samedi
  assert.equal(mondayOf('2026-10-05'), '2026-10-05') // lundi
  assert.equal(mondayOf('2026-10-04'), '2026-09-28') // dimanche
})

// ── début du plan d'un athlète ───────────────────────────────────────────────
test('planStartFor remonte depuis la semaine de course', () => {
  assert.equal(planStartFor({ raceDate: '2027-02-13', totalWeeks: 19, planStartDate: '2026-09-27' }), '2026-10-05')
})
test('planStartFor traite une course le lundi comme le début de la semaine de course', () => {
  assert.equal(planStartFor({ raceDate: '2027-02-08', totalWeeks: 19, planStartDate: null }), '2026-10-05')
})
test('planStartFor retombe sur la date du plan sans date de course ou sans longueur', () => {
  assert.equal(planStartFor({ raceDate: null, totalWeeks: 19, planStartDate: '2026-05-18' }), '2026-05-18')
  assert.equal(planStartFor({ raceDate: '2027-02-13', totalWeeks: null, planStartDate: '2026-05-18' }), '2026-05-18')
})
test('planStartFor ne garde que la date d\'une date de plan horodatée', () => {
  assert.equal(planStartFor({ raceDate: null, totalWeeks: null, planStartDate: '2026-05-18T00:00:00' }), '2026-05-18')
})
test('planStartFor renvoie null sans aucune date', () => {
  assert.equal(planStartFor({ raceDate: null, totalWeeks: 19, planStartDate: null }), null)
})

// ── semaines ─────────────────────────────────────────────────────────────────
test('weekDates donne le lundi et le dimanche de la semaine', () => {
  assert.deepEqual(weekDates('2026-10-05', 1), { startDate: '2026-10-05', endDate: '2026-10-11' })
  assert.deepEqual(weekDates('2026-10-05', 4), { startDate: '2026-10-26', endDate: '2026-11-01' })
})

// ── état du plan ─────────────────────────────────────────────────────────────
const plan = { startDate: '2026-10-05', totalWeeks: 19, raceDate: '2027-02-13' }

test('planStatus avant le début compte les jours restants', () => {
  assert.deepEqual(planStatus(plan, '2026-10-02'), { status: 'before', weekNumber: 1, daysToStart: 3, daysToRace: 134 })
})
test('planStatus démarre le premier lundi', () => {
  assert.deepEqual(planStatus(plan, '2026-10-05'), { status: 'running', weekNumber: 1, daysToStart: 0, daysToRace: 131 })
})
test('planStatus change de semaine le lundi', () => {
  assert.equal(planStatus(plan, '2026-10-19').weekNumber, 3)
  assert.equal(planStatus(plan, '2026-10-25').weekNumber, 3)
  assert.equal(planStatus(plan, '2026-10-26').weekNumber, 4)
})
test('planStatus reste en cours jusqu\'au dimanche de la dernière semaine', () => {
  assert.deepEqual(planStatus(plan, '2027-02-14'), { status: 'running', weekNumber: 19, daysToStart: 0, daysToRace: -1 })
})
test('planStatus passe à terminé le lendemain, en restant sur la dernière semaine', () => {
  assert.deepEqual(planStatus(plan, '2027-02-15'), { status: 'done', weekNumber: 19, daysToStart: 0, daysToRace: -2 })
})
test('planStatus ne donne pas de compte à rebours sans date de course', () => {
  assert.equal(planStatus({ startDate: '2026-10-05', totalWeeks: 19, raceDate: null }, '2026-10-19').daysToRace, null)
})

// ── phases ───────────────────────────────────────────────────────────────────
test('groupPhases regroupe les semaines par phase, dans l\'ordre, avec leurs dates', () => {
  const weeks = [
    { week_number: 2, phase: 1, theme: 'Force', is_deload: false },
    { week_number: 9, phase: 2, theme: 'Volume', is_deload: false },
    { week_number: 1, phase: 1, theme: 'Force', is_deload: false },
    { week_number: 4, phase: 1, theme: 'Force — semaine allégée', is_deload: true },
  ]
  const nameOf = id => ({ 1: 'Force' })[id] ?? `Phase ${id}`
  assert.deepEqual(groupPhases(weeks, '2026-10-05', nameOf), [
    {
      id: 1, name: 'Force', firstWeek: 1, lastWeek: 4, startDate: '2026-10-05', endDate: '2026-11-01',
      weeks: [
        { number: 1, theme: 'Force', isDeload: false, startDate: '2026-10-05', endDate: '2026-10-11' },
        { number: 2, theme: 'Force', isDeload: false, startDate: '2026-10-12', endDate: '2026-10-18' },
        { number: 4, theme: 'Force — semaine allégée', isDeload: true, startDate: '2026-10-26', endDate: '2026-11-01' },
      ],
    },
    {
      id: 2, name: 'Phase 2', firstWeek: 9, lastWeek: 9, startDate: '2026-11-30', endDate: '2026-12-06',
      weeks: [{ number: 9, theme: 'Volume', isDeload: false, startDate: '2026-11-30', endDate: '2026-12-06' }],
    },
  ])
})
test('groupPhases renvoie une liste vide sans semaine', () => {
  assert.deepEqual(groupPhases([], '2026-10-05', id => `Phase ${id}`), [])
})
