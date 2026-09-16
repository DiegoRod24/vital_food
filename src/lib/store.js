const KEY = 'vital_food_state_v2'
const LEGACY_KEY = 'vital_food_state_v1'
const META_KEY = 'vital_food_sync_meta_v1'
const DEVICE_KEY = 'vital_food_device_id'
const API_BASE = (import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')
const WORKSPACE = import.meta.env.VITE_WORKSPACE_ID || 'vital-foods-main'

export const initialState = {
  inventory: {},
  marketOrder: {},
  proteinOrder: {},
  wastes: [],
  history: [],
  orders: [],
  settings: {
    responsible: 'Mamá',
    branch: 'Vital Foods',
    compactMode: false,
    destinationPhone: '',
    destinationName: 'Compras / Proveedor'
  }
}

const clone = value => JSON.parse(JSON.stringify(value))
const now = () => new Date().toISOString()
const api = path => `${API_BASE}${path}`

function normalizeState(state = {}) {
  return {
    ...clone(initialState),
    ...state,
    wastes: Array.isArray(state.wastes) ? state.wastes : [],
    history: Array.isArray(state.history) ? state.history : [],
    orders: Array.isArray(state.orders) ? state.orders : [],
    settings: { ...clone(initialState).settings, ...(state.settings || {}) }
  }
}

function getDeviceId() {
  let id = localStorage.getItem(DEVICE_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_KEY, id)
  }
  return id
}

function readMeta() {
  try {
    return JSON.parse(localStorage.getItem(META_KEY) || '{}')
  } catch {
    return {}
  }
}

function writeMeta(meta) {
  localStorage.setItem(META_KEY, JSON.stringify(meta))
}

export function loadState() {
  try {
    const raw = localStorage.getItem(KEY) || localStorage.getItem(LEGACY_KEY)
    if (!raw) return clone(initialState)
    return normalizeState(JSON.parse(raw))
  } catch {
    return clone(initialState)
  }
}

let syncTimer = null
let syncBusy = false
let remoteListener = null
let statusListener = null

function setSyncStatus(status, extra = {}) {
  statusListener?.({ status, ...extra })
}

export function saveState(state, { markDirty = true } = {}) {
  const normalized = normalizeState(state)
  localStorage.setItem(KEY, JSON.stringify(normalized))
  if (markDirty) {
    const meta = readMeta()
    writeMeta({ ...meta, dirty: true, changedAt: now() })
    queueSync(normalized)
  }
}

function queueSync(state) {
  clearTimeout(syncTimer)
  syncTimer = setTimeout(() => pushState(state).catch(() => {}), 850)
}

function mergeCollections(local = [], remote = [], dateKey = 'at') {
  const map = new Map()
  ;[...remote, ...local].forEach(item => item?.id && map.set(item.id, item))
  return [...map.values()].sort((a, b) => String(b[dateKey] || b.updatedAt || '').localeCompare(String(a[dateKey] || a.updatedAt || '')))
}

function mergeStates(local, remote) {
  return normalizeState({
    ...remote,
    ...local,
    inventory: { ...(remote?.inventory || {}), ...(local?.inventory || {}) },
    marketOrder: { ...(remote?.marketOrder || {}), ...(local?.marketOrder || {}) },
    proteinOrder: { ...(remote?.proteinOrder || {}), ...(local?.proteinOrder || {}) },
    wastes: mergeCollections(local?.wastes, remote?.wastes),
    history: mergeCollections(local?.history, remote?.history).slice(0, 500),
    orders: mergeCollections(local?.orders, remote?.orders, 'createdAt').slice(0, 300),
    settings: { ...(remote?.settings || {}), ...(local?.settings || {}) }
  })
}

async function fetchRemote() {
  const res = await fetch(api(`/api/state?workspace=${encodeURIComponent(WORKSPACE)}`), {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  })
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`No se pudo leer la nube (${res.status})`)
  return res.json()
}

export async function pushState(state = loadState()) {
  if (!navigator.onLine || syncBusy) return null
  syncBusy = true
  setSyncStatus('syncing')
  try {
    const meta = readMeta()
    const normalized = normalizeState(state)
    const res = await fetch(api('/api/state'), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        workspace: WORKSPACE,
        deviceId: getDeviceId(),
        revision: Number(meta.revision || 0),
        state: normalized
      })
    })

    if (res.status === 409) {
      const conflict = await res.json()
      const merged = mergeStates(normalized, conflict.state || {})
      localStorage.setItem(KEY, JSON.stringify(merged))
      writeMeta({ ...meta, revision: Number(conflict.revision || 0), dirty: true, changedAt: now() })
      remoteListener?.(merged)
      syncBusy = false
      return pushState(merged)
    }

    if (!res.ok) throw new Error(`No se pudo sincronizar (${res.status})`)
    const data = await res.json()
    writeMeta({ revision: data.revision, dirty: false, syncedAt: now() })
    setSyncStatus('synced', { revision: data.revision })
    return data
  } catch (error) {
    setSyncStatus('pending', { message: error.message })
    return null
  } finally {
    syncBusy = false
  }
}

export async function pullState({ force = false } = {}) {
  if (!navigator.onLine) return null
  try {
    const remote = await fetchRemote()
    if (!remote?.state) return null
    const meta = readMeta()
    if (meta.dirty && !force) return null
    if (!force && Number(remote.revision || 0) <= Number(meta.revision || 0)) return null
    const normalized = normalizeState(remote.state)
    localStorage.setItem(KEY, JSON.stringify(normalized))
    writeMeta({ revision: remote.revision, dirty: false, syncedAt: now() })
    remoteListener?.(normalized)
    setSyncStatus('synced', { revision: remote.revision })
    return normalized
  } catch (error) {
    setSyncStatus('pending', { message: error.message })
    return null
  }
}

export function startSync({ onRemote, onStatus } = {}) {
  remoteListener = onRemote || null
  statusListener = onStatus || null
  const meta = readMeta()
  if (meta.dirty) pushState(loadState())
  else pullState()

  const onlineHandler = () => {
    const latest = readMeta()
    if (latest.dirty) pushState(loadState())
    else pullState()
  }
  window.addEventListener('online', onlineHandler)
  const interval = window.setInterval(() => {
    const latest = readMeta()
    if (latest.dirty) pushState(loadState())
    else pullState()
  }, 30000)

  return () => {
    window.removeEventListener('online', onlineHandler)
    clearInterval(interval)
    remoteListener = null
    statusListener = null
  }
}

export async function forceSync(state = loadState()) {
  const meta = readMeta()
  writeMeta({ ...meta, dirty: true, changedAt: now() })
  return pushState(state)
}

export function getSyncInfo() {
  return { ...readMeta(), workspace: WORKSPACE, deviceId: getDeviceId() }
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
      { id: crypto.randomUUID(), type, summary, at: now(), deviceId: getDeviceId() },
      ...(state.history || [])
    ].slice(0, 500)
  }
}
