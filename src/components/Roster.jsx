import { useState, useEffect } from 'react'
import { fetchPlayers } from '../lib/supabase'

const KINGSTON_TEAM_ID = '8dfe6481-46a6-4cfb-af47-6a7db4081308'

export default function Roster({ inline = false }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchPlayers(KINGSTON_TEAM_ID)
      .then(data => { setPlayers(data || []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const sorted = [...players].sort((a, b) => {
    const na = parseInt(a.number) || 99
    const nb = parseInt(b.number) || 99
    return na - nb
  })

  if (loading) return (
    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--cond)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      Loading roster…
    </div>
  )

  if (!sorted.length) return (
    <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--ink-4)', fontFamily: 'var(--cond)', fontSize: 12, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
      No players yet
    </div>
  )

  // Sidebar card style — compact
  if (inline) {
    return (
      <div>
        {sorted.map((p, i) => (
          <div key={p.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '0.45rem 1rem',
            borderBottom: i < sorted.length - 1 ? '1px solid var(--rule)' : 'none',
          }}>
            <span style={{
              fontFamily: 'var(--cond)', fontSize: 13, fontWeight: 800,
              color: 'var(--orange)', minWidth: 28, textAlign: 'right',
            }}>
              #{p.number || '—'}
            </span>
            <span style={{
              fontFamily: 'var(--cond)', fontSize: 14, fontWeight: 600,
              color: 'var(--ink)',
            }}>
              {p.name}
            </span>
          </div>
        ))}
      </div>
    )
  }

  // Full page style — for mobile tab
  return (
    <div style={{ background: 'var(--white)', border: '1px solid var(--rule)', borderRadius: 6, overflow: 'hidden', marginBottom: '2rem' }}>
      <div style={{ padding: '0.6rem 1rem', borderBottom: '1px solid var(--rule)', background: 'var(--ink)' }}>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 10, fontWeight: 700, letterSpacing: '0.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>
          Kingston Impact · U19
        </div>
        <div style={{ fontFamily: 'var(--cond)', fontSize: 16, fontWeight: 800, color: '#fff', marginTop: 1 }}>
          Roster
        </div>
      </div>
      {sorted.map((p, i) => (
        <div key={p.id} style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '0.65rem 1rem',
          borderBottom: i < sorted.length - 1 ? '1px solid var(--rule)' : 'none',
          background: i % 2 === 0 ? 'var(--white)' : 'var(--surface)',
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--or-light)', border: '1px solid var(--or-mid)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontFamily: 'var(--cond)', fontSize: 14, fontWeight: 800, color: 'var(--orange)' }}>
              {p.number || '—'}
            </span>
          </div>
          <span style={{ fontFamily: 'var(--cond)', fontSize: 17, fontWeight: 600, color: 'var(--ink)' }}>
            {p.name}
          </span>
        </div>
      ))}
    </div>
  )
}
