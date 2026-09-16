const KEY = 'vital_food_state_v1'

export const initialState = {
  inventory: {},
  marketOrder: {},
  proteinOrder: {},
  wastes: [],
  history: [],
  settings: { responsible: 'Mamá', branch: 'Vital Foods', compactMode: false }
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return structuredClone(initialState)
    return { ...structuredClone(initialState), ...JSON.parse(raw) }
  } catch {
    return structuredClone(initialState)
  }
}

export function saveState(state) {
  localStorage.setItem(KEY, JSON.stringify(state))
}

export function exportState(state) {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `vital-foods-respaldo-${new Date().toISOString().slice(0,10)}.json`
  a.click()
  URL.revokeObjectURL(url)
}

export function addHistory(state, type, summary) {
  return {
    ...state,
    history: [
      { id: crypto.randomUUID(), type, summary, at: new Date().toISOString() },
      ...state.history
    ].slice(0, 250)
  }
}
