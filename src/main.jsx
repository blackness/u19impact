import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import Admin from './pages/Admin.jsx'
import ResultsPage from './pages/ResultsPage.jsx'
import './index.css'

// Register service worker for push notifications
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(err => {
      console.warn('SW registration failed:', err)
    })
  })
}

const path = window.location.pathname
const root = document.getElementById('root')

if (path === '/admin') {
  createRoot(root).render(<StrictMode><Admin /></StrictMode>)
} else if (path === '/results') {
  createRoot(root).render(<StrictMode><ResultsPage /></StrictMode>)
} else {
  createRoot(root).render(<StrictMode><App /></StrictMode>)
}
