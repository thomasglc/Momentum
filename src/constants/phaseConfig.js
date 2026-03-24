/**
 * Single source of truth for phase styling.
 * Used by WeekNav and PhasesView.
 * Keyed by phase ID (1–4).
 */
export const PHASE_CONFIG = {
  1: {
    name:    'Fondation',
    badge:   'bg-blue-100 text-blue-600',
    bg:      'bg-blue-50',
    text:    'text-blue-600',
    bar:     'bg-blue-400',
    weekBtn: 'bg-blue-50 border-blue-200 text-blue-700 hover:bg-blue-100',
  },
  2: {
    name:    'Construction',
    badge:   'bg-emerald-100 text-emerald-700',
    bg:      'bg-emerald-50',
    text:    'text-emerald-600',
    bar:     'bg-emerald-400',
    weekBtn: 'bg-emerald-50 border-emerald-200 text-emerald-700 hover:bg-emerald-100',
  },
  3: {
    name:    'Spécificité',
    badge:   'bg-orange-100 text-orange-600',
    bg:      'bg-orange-50',
    text:    'text-orange-500',
    bar:     'bg-orange-400',
    weekBtn: 'bg-orange-50 border-orange-200 text-orange-700 hover:bg-orange-100',
  },
  4: {
    name:    'Affûtage',
    badge:   'bg-violet-100 text-violet-600',
    bg:      'bg-violet-50',
    text:    'text-violet-600',
    bar:     'bg-violet-400',
    weekBtn: 'bg-violet-50 border-violet-200 text-violet-700 hover:bg-violet-100',
  },
}

const FALLBACK_PHASE = {
  name: '', badge: 'bg-gray-100 text-gray-500', bg: 'bg-gray-50',
  text: 'text-gray-500', bar: 'bg-gray-300', weekBtn: 'bg-gray-50 border-gray-200 text-gray-700',
}

export function getPhaseConfig(phaseId) {
  return PHASE_CONFIG[phaseId] ?? FALLBACK_PHASE
}
