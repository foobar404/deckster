export const THEME_OPTIONS = [
  { value: 'light', label: 'Light', mode: 'light', color: '#2563eb' },
  { value: 'dark', label: 'Dark', mode: 'dark', color: '#94a3b8' },
  { value: 'ocean', label: 'Ocean', mode: 'dark', color: '#0e7490' },
  { value: 'forest', label: 'Forest', mode: 'dark', color: '#15803d' },
  { value: 'sunset', label: 'Sunset', mode: 'light', color: '#ea580c' },
  { value: 'rose', label: 'Rose', mode: 'light', color: '#e11d48' },
  { value: 'lavender', label: 'Lavender', mode: 'light', color: '#7c3aed' },
  { value: 'slate', label: 'Slate', mode: 'dark', color: '#475569' },
  { value: 'graphite', label: 'Graphite', mode: 'dark', color: '#fbbf24' },
  { value: 'plum', label: 'Plum', mode: 'dark', color: '#f0abfc' },
  { value: 'mint', label: 'Mint', mode: 'light', color: '#047857' },
  { value: 'amber', label: 'Amber', mode: 'light', color: '#b45309' },
  { value: 'system', label: 'System', mode: 'system', color: 'linear-gradient(135deg, #f8fafc 50%, #1e293b 50%)' }
]

export const THEME_VALUES = THEME_OPTIONS.map(option => option.value)