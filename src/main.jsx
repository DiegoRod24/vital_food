import React, { useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { startSync } from './lib/store'
import './styles.css'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('/sw.js').catch(() => {}))
}

function SyncedApp() {
  const [version, setVersion] = useState(0)

  useEffect(() => startSync({
    onRemote: () => setVersion(v => v + 1)
  }), [])

  return <App key={version} />
}

createRoot(document.getElementById('root')).render(
  <React.StrictMode><SyncedApp /></React.StrictMode>
)
