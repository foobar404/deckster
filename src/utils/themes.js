export const THEME_OPTIONS = [
  { value: 'light', label: 'Classic', defaultMode: 'light', color: '#2563eb' },
  { value: 'dark', label: 'Midnight', defaultMode: 'dark', color: '#94a3b8' },
  { value: 'ocean', label: 'Ocean', defaultMode: 'dark', color: '#22d3ee' },
  { value: 'forest', label: 'Forest', defaultMode: 'dark', color: '#15803d' },
  { value: 'sunset', label: 'Sunset', defaultMode: 'light', color: '#ea580c' },
  { value: 'rose', label: 'Rose', defaultMode: 'light', color: '#e11d48' },
  { value: 'lavender', label: 'Lavender', defaultMode: 'light', color: '#7c3aed' },
  { value: 'slate', label: 'Slate', defaultMode: 'dark', color: '#475569' },
  { value: 'graphite', label: 'Graphite', defaultMode: 'dark', color: '#fbbf24' },
  { value: 'plum', label: 'Plum', defaultMode: 'dark', color: '#f0abfc' },
  { value: 'mint', label: 'Mint', defaultMode: 'light', color: '#047857' },
  { value: 'amber', label: 'Amber', defaultMode: 'light', color: '#b45309' },
  { value: 'sky', label: 'Sky', defaultMode: 'light', color: '#0369a1' },
  { value: 'cobalt', label: 'Cobalt', defaultMode: 'dark', color: '#60a5fa' },
  { value: 'twilight', label: 'Twilight', defaultMode: 'dark', color: '#c4b5fd' },
  { value: 'cherry', label: 'Cherry', defaultMode: 'dark', color: '#fda4af' },
  { value: 'coral', label: 'Coral', defaultMode: 'light', color: '#f43f5e' },
  { value: 'peach', label: 'Peach', defaultMode: 'light', color: '#c2410c' },
  { value: 'sand', label: 'Sand', defaultMode: 'light', color: '#a16207' },
  { value: 'coffee', label: 'Coffee', defaultMode: 'dark', color: '#d6a77a' },
  { value: 'olive', label: 'Olive', defaultMode: 'light', color: '#4d7c0f' },
  { value: 'aurora', label: 'Aurora', defaultMode: 'dark', color: '#5eead4' },
  { value: 'ice', label: 'Ice', defaultMode: 'light', color: '#0e7490' },
  { value: 'monochrome', label: 'Mono', defaultMode: 'dark', color: '#e5e7eb' },
  { value: 'ruby', label: 'Ruby', defaultMode: 'light', color: '#b91c1c' }
]

export const THEME_VALUES = THEME_OPTIONS.map(option => option.value)
export const THEME_MODE_VALUES = ['light', 'dark', 'system']