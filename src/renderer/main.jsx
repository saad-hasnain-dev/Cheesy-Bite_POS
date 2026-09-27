import React from 'react'
import ReactDOM from 'react-dom/client'
import './i18n/index'
import './styles/index.css'
import App from './App'

async function start() {
  // Opened in a plain browser (no Electron): use in-memory demo data so every
  // screen can be previewed. Never loaded inside the desktop app.
  if (!window.api) await import('./dev/mockApi')

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>
  )
}

start()
