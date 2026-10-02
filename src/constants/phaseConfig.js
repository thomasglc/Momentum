/**
 * Single source of truth for phase styling.
 * Used by WeekNav and the Progression tab.
 * Keyed by phase ID (1–4).
 * cell / cellPartial / cellTint : case de la frise du plan (semaine faite, entamée, à venir).
 */
export const PHASE_CONFIG = {
  1: {
    name:    'Fondation',
    badge:   'bg-blue-100 text-blue-600',
    bg:      'bg-blue-50',
    text:    'text-blue-600',
    bar:     'bg-blue-400',
    weekBtn: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
    cell: 'bg-blue-500', cellPartial: 'bg-blue-300', cellTint: 'bg-blue-100',
  },
  2: {
    name:    'Construction',
    badge:   'bg-emerald-100 text-emerald-700',
    bg:      'bg-emerald-50',
    text:    'text-emerald-600',
    bar:     'bg-emerald-400',
    weekBtn: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
    cell: 'bg-emerald-500', cellPartial: 'bg-emerald-300', cellTint: 'bg-emerald-100',
  },
  3: {
    name:    'Spécificité',
    badge:   'bg-orange-100 text-orange-600',
    bg:      'bg-orange-50',
    text:    'text-orange-500',
    bar:     'bg-orange-400',
    weekBtn: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
    cell: 'bg-orange-500', cellPartial: 'bg-orange-300', cellTint: 'bg-orange-100',
  },
  4: {
    name:    'Affûtage',
    badge:   'bg-violet-100 text-violet-600',
    bg:      'bg-violet-50',
    text:    'text-violet-600',
    bar:     'bg-violet-400',
    weekBtn: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
    cell: 'bg-violet-500', cellPartial: 'bg-violet-300', cellTint: 'bg-violet-100',
  },
}

const FALLBACK_PHASE = {
  name: '', badge: 'bg-gray-100 text-gray-500', bg: 'bg-gray-50',
  text: 'text-gray-500', bar: 'bg-gray-300', weekBtn: 'bg-gray-50 border-gray-200 text-gray-700',
  cell: 'bg-stone-500', cellPartial: 'bg-stone-300', cellTint: 'bg-stone-100',
}

export function getPhaseConfig(phaseId) {
  return PHASE_CONFIG[phaseId] ?? FALLBACK_PHASE
}
