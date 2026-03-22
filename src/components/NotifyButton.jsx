import { useState, useEffect } from 'react'

// VAPID public key — safe to hardcode, this is not a secret
const VAPID_PUBLIC_KEY = 'BEQzX2LX3B2fi6lrWmAit9eczZoOTehmH-6nCHmZa7RdwKMYstsonTXmRcUQv-lRySjKawCR301IOD-dJgAY5hk'
const SUPABASE_URL     = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON    = import.meta.env.VITE_SUPABASE_ANON

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64   = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw      = window.atob(base64)
  return new Uint8Array([...raw].map(c => c.charCodeAt(0)))
}

export default function NotifyButton() {
  const [state, setState] = useState('idle') // idle | requesting | subscribed | denied | unsupported
  const [prefs, setPrefs] = useState({ quarter_end: true, final: true, close_game: false })
  const [showPrefs, setShowPrefs] = useState(false)

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported'); return
    }
    if (Notification.permission === 'granted') {
      // Check if already subscribed
      navigator.serviceWorker.ready.then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setState('subscribed')
        })
      })
    } else if (Notification.permission === 'denied') {
      setState('denied')
    }
  }, [])

  const [error, setError] = useState('')

  const subscribe = async () => {
    setState('requesting')
    setError('')
    try {
      setError('Step 1: Registering service worker...')
      const reg = await navigator.serviceWorker.register('/sw.js')
      await navigator.serviceWorker.ready

      setError('Step 2: Requesting permission...')
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') { setState('denied'); return }

      setError('Step 3: Subscribing to push...')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      })

      const { endpoint, keys } = sub.toJSON()
      setError('Step 4: Saving to database...')

      const saveRes = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
        method: 'POST',
        headers: {
          'apikey':        SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Content-Type':  'application/json',
          'Prefer':        'resolution=merge-duplicates',
        },
        body: JSON.stringify({
          endpoint,
          p256dh:      keys.p256dh,
          auth:        keys.auth,
          preferences: prefs,
        }),
      })

      const saveText = await saveRes.text()
      if (!saveRes.ok) {
        setError(`Save failed ${saveRes.status}: ${saveText}`)
        setState('idle')
        return
      }

      setError('')
      setState('subscribed')
    } catch (e) {
      console.error('Subscribe error:', e)
      setError(e.message || 'Unknown error')
      setState('idle')
    }
  }

  const updatePrefs = async (newPrefs) => {
    setPrefs(newPrefs)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (!sub) return
      const { endpoint } = sub.toJSON()
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(endpoint)}`, {
        method: 'PATCH',
        headers: {
          'apikey':        SUPABASE_ANON,
          'Authorization': `Bearer ${SUPABASE_ANON}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({ preferences: newPrefs }),
      })
    } catch (e) { console.error('Pref update error:', e) }
  }

  if (state === 'unsupported') return null

  return (
    <div>
      {state === 'subscribed' ? (
        <div>
          <button
            onClick={() => setShowPrefs(p => !p)}
            style={{ display:'flex', alignItems:'center', gap:6, width:'100%', background:'none', border:'none', padding:'0.55rem 1rem', cursor:'pointer', textAlign:'left' }}
          >
            <span style={{ fontSize:14 }}>🔔</span>
            <span style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight:600, color:'var(--green)' }}>Notifications on</span>
            <span style={{ marginLeft:'auto', fontFamily:'var(--cond)', fontSize:10, color:'var(--ink-4)' }}>{showPrefs ? '▴' : '▾'}</span>
          </button>

          {showPrefs && (
            <div style={{ padding:'0 1rem 0.75rem', borderTop:'1px solid var(--rule)' }}>
              {[
                { key:'final',       label:'Final score' },
                { key:'quarter_end', label:'End of each quarter' },
                { key:'close_game',  label:'Close game (within 5 pts)' },
              ].map(opt => (
                <label key={opt.key} style={{ display:'flex', alignItems:'center', gap:8, padding:'0.35rem 0', cursor:'pointer' }}>
                  <input
                    type="checkbox"
                    checked={prefs[opt.key] || false}
                    onChange={e => {
                      const next = { ...prefs, [opt.key]: e.target.checked }
                      updatePrefs(next)
                    }}
                    style={{ width:15, height:15, accentColor:'var(--orange)' }}
                  />
                  <span style={{ fontFamily:'var(--cond)', fontSize:13, color:'var(--ink-2)' }}>{opt.label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
    ) : state === 'denied' ? (
        <div style={{ padding:'0.55rem 1rem', fontFamily:'var(--cond)', fontSize:12, color:'var(--ink-4)' }}>
          Notifications blocked — enable in browser settings
        </div>
      ) : (
        <div>
          <button
            onClick={subscribe}
            disabled={state === 'requesting'}
            style={{ display:'flex', alignItems:'center', gap:8, width:'100%', background:'none', border:'none', padding:'0.55rem 1rem', cursor: state === 'requesting' ? 'wait' : 'pointer', textAlign:'left' }}
          >
            <span style={{ fontSize:14 }}>🔔</span>
            <span style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight:600, color:'var(--orange)' }}>
              {state === 'requesting' ? 'Setting up…' : 'Get game notifications'}
            </span>
          </button>
          {error && (
            <div style={{ padding:'0 1rem 0.5rem', fontSize:11, color:'var(--red)', fontFamily:'var(--cond)' }}>
              {error}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
