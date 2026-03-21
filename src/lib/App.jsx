import { useState, useEffect, useCallback } from 'react'
import { DIVISIONS, fetchDivision, subscribeToDivision, supabase } from './lib/supabase'
import Masthead from './components/Masthead'
import PoolView from './components/PoolView'
import Sidebar from './components/Sidebar'
import './index.css'

const DEFAULT_DIVISION = 'u19_men_2526'
const DEFAULT_POOL     = 'A'

export default function App() {
  // Persisted preferences
  const [activeDivision, setActiveDivision] = useState(
    () => localStorage.getItem('obl_division') || DEFAULT_DIVISION
  )
  const [favoriteTeam, setFavoriteTeam] = useState(
    () => localStorage.getItem('obl_favorite_team') || 'Kingston Impact - Wallace'
  )

  // Active pool within the division
  const [activePool, setActivePool] = useState(DEFAULT_POOL)

  // Data state
  const [pools, setPools]           = useState(null)
  const [fetchedAt, setFetchedAt]   = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)

  // Load division data
  const loadDivision = useCallback(async (divisionId) => {
    setLoading(true)
    setError(null)
    setPools(null)

    // DEBUG — remove after fixing
    const raw = await supabase.from('obl_schedule_cache').select('id, fetched_at').limit(5)
    console.log('DEBUG raw query:', JSON.stringify(raw))

    try {
      const { pools: data, fetchedAt: ts } = await fetchDivision(divisionId)
      setPools(data)
      setFetchedAt(ts)
      // Reset to first available pool
      const firstPool = Object.keys(data)[0] || 'A'
      setActivePool(firstPool)
    } catch (e) {
      setError('Could not load schedule data.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Load on mount and division change
  useEffect(() => {
    loadDivision(activeDivision)
  }, [activeDivision, loadDivision])

  // Realtime subscription
  useEffect(() => {
    const channel = subscribeToDivision(activeDivision, () => {
      loadDivision(activeDivision)
    })
    return () => channel.unsubscribe()
  }, [activeDivision, loadDivision])

  // Persist preferences
  const switchDivision = (id) => {
    localStorage.setItem('obl_division', id)
    setActiveDivision(id)
  }

  const setFavorite = (teamName) => {
    localStorage.setItem('obl_favorite_team', teamName)
    setFavoriteTeam(teamName)
  }

  const division = DIVISIONS.find(d => d.id === activeDivision)
  const poolKeys = pools ? Object.keys(pools).sort() : []

  // Find which pool the favorite team is in
  const favoritePool = pools
    ? Object.entries(pools).find(([, pd]) =>
        pd.standings?.some(t => t.name === favoriteTeam)
      )?.[0]
    : null

  return (
    <div>
      <Masthead
        division={division}
        divisions={DIVISIONS}
        onSwitchDivision={switchDivision}
        pools={poolKeys}
        activePool={activePool}
        onSwitchPool={setActivePool}
        fetchedAt={fetchedAt}
        loading={loading}
        onRefresh={() => loadDivision(activeDivision)}
      />

      <div style={{
        maxWidth: 1120,
        margin: '0 auto',
        padding: '2rem 1.5rem',
        display: 'grid',
        gridTemplateColumns: '1fr 300px',
        gap: '2rem',
        alignItems: 'start',
      }} className="page-wrap">

        <main>
          {loading && <LoadingState />}
          {error && <ErrorState message={error} onRetry={() => loadDivision(activeDivision)} />}
          {!loading && !error && pools && (
            <PoolView
              poolData={pools[activePool]}
              poolKey={activePool}
              favoriteTeam={favoriteTeam}
            />
          )}
        </main>

        <aside>
          <Sidebar
            pools={pools}
            poolKeys={poolKeys}
            activePool={activePool}
            onSwitchPool={setActivePool}
            favoriteTeam={favoriteTeam}
            favoritePool={favoritePool}
            onSetFavorite={setFavorite}
            division={division}
          />
        </aside>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <div style={{
        width: 22, height: 22,
        border: '2px solid var(--rule)',
        borderTopColor: 'var(--orange)',
        borderRadius: '50%',
        animation: 'spin 0.65s linear infinite',
        margin: '0 auto 0.9rem',
      }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      <div style={{ fontFamily: 'var(--cond)', fontSize: 14, letterSpacing: '0.08em', color: 'var(--ink-3)', textTransform: 'uppercase' }}>
        Loading schedule…
      </div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ padding: '3rem 2rem', textAlign: 'center' }}>
      <div style={{ fontFamily: 'var(--cond)', fontSize: 16, color: 'var(--red)', marginBottom: 12 }}>{message}</div>
      <button onClick={onRetry} style={{
        background: 'var(--orange)', color: 'white', border: 'none',
        fontFamily: 'var(--cond)', fontSize: 12, fontWeight: 700,
        letterSpacing: '0.1em', textTransform: 'uppercase',
        padding: '6px 16px', borderRadius: 4, cursor: 'pointer',
      }}>Retry</button>
    </div>
  )
}
