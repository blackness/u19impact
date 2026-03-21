import { useState, useEffect, useCallback, useRef } from 'react'
import { DIVISIONS, fetchDivision, subscribeToDivision, fetchTeamEvents, fetchRecurringEvents } from './lib/supabase'
import Masthead from './components/Masthead'
import PoolView from './components/PoolView'
import Sidebar from './components/Sidebar'
import LiveScoreboard, { fetchLiveGame } from './components/LiveScoreboard'
import './index.css'

const DEFAULT_DIVISION  = 'u19_men_2526'
const LIVE_POLL_INTERVAL = 30000  // check for live games every 30 seconds

export default function App() {
  const [activeDivision, setActiveDivision] = useState(
    () => localStorage.getItem('obl_division') || DEFAULT_DIVISION
  )
  const [favoriteTeam, setFavoriteTeam] = useState(
    () => localStorage.getItem('obl_favorite_team') || 'Kingston Impact - Wallace'
  )
  const [activePool, setActivePool] = useState('A')
  const [pools, setPools]           = useState(null)
  const [fetchedAt, setFetchedAt]   = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [teamEvents, setTeamEvents] = useState([])
  const [liveGame, setLiveGame]     = useState(null)
  const [dismissed, setDismissed]   = useState(false)
  const liveWsRef                   = useRef(null)

  const loadDivision = useCallback(async (divisionId) => {
    setLoading(true); setError(null); setPools(null)
    try {
      const [{ pools: data, fetchedAt: ts }, oneOff, recurring] = await Promise.all([
        fetchDivision(divisionId),
        fetchTeamEvents(),
        fetchRecurringEvents(),
      ])
      setPools(data)
      setFetchedAt(ts)
      setTeamEvents([...oneOff, ...recurring])
      setActivePool(Object.keys(data)[0] || 'A')
    } catch (e) {
      setError('Could not load schedule data.')
      console.error(e)
    } finally {
      setLoading(false)
    }
  }, [])

  // Poll for live game
  const checkLiveGame = useCallback(async () => {
    try {
      const game = await fetchLiveGame()
      if (game && game.status === 'in-progress') {
        setDismissed(false)
        setLiveGame(game)
        subscribeToLiveGame(game.id)
      } else if (game && game.status === 'completed' && !dismissed) {
        setLiveGame(game)
      } else if (!game) {
        setLiveGame(null)
        closeLiveWs()
      }
    } catch (e) {
      console.warn('Live game check failed:', e.message)
    }
  }, [dismissed])

  function subscribeToLiveGame(gameId) {
    closeLiveWs()
    const wsUrl = import.meta.env.VITE_SUPABASE_URL.replace('https://', 'wss://') +
      `/realtime/v1/websocket?apikey=${import.meta.env.VITE_SUPABASE_ANON}&vsn=1.0.0`
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => {
      ws.send(JSON.stringify({
        topic: 'realtime:public:games',
        event: 'phx_join',
        payload: {
          config: {
            broadcast: { self: false },
            postgres_changes: [{ event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }]
          }
        },
        ref: '1',
      }))
    }
    ws.onmessage = (e) => {
      const msg = JSON.parse(e.data)
      const record = msg.payload?.data?.record
      if (record) {
        setLiveGame(record)
        if (record.status !== 'in-progress') closeLiveWs()
      }
    }
    ws.onclose = () => { liveWsRef.current = null }
    liveWsRef.current = ws
  }

  function closeLiveWs() {
    if (liveWsRef.current) { liveWsRef.current.close(); liveWsRef.current = null }
  }

  useEffect(() => { loadDivision(activeDivision) }, [activeDivision, loadDivision])

  useEffect(() => {
    const ch = subscribeToDivision(activeDivision, () => loadDivision(activeDivision))
    return () => ch.unsubscribe()
  }, [activeDivision, loadDivision])

  // Check for live game on load and every 30s
  useEffect(() => {
    checkLiveGame()
    const interval = setInterval(checkLiveGame, LIVE_POLL_INTERVAL)
    return () => { clearInterval(interval); closeLiveWs() }
  }, [checkLiveGame])

  const switchDivision = (id) => { localStorage.setItem('obl_division', id); setActiveDivision(id) }
  const setFavorite    = (n)  => { localStorage.setItem('obl_favorite_team', n); setFavoriteTeam(n) }

  const division     = DIVISIONS.find(d => d.id === activeDivision)
  const poolKeys     = pools ? Object.keys(pools).sort() : []
  const favoritePool = pools
    ? Object.entries(pools).find(([, pd]) => pd.standings?.some(t => t.name === favoriteTeam))?.[0]
    : null

  const showLive = liveGame && !dismissed

  return (
    <div>
      <Masthead
        division={division} divisions={DIVISIONS} onSwitchDivision={switchDivision}
        pools={poolKeys} activePool={activePool} onSwitchPool={setActivePool}
        fetchedAt={fetchedAt} loading={loading} onRefresh={() => loadDivision(activeDivision)}
        isLive={showLive}
      />

      <div style={{
        maxWidth: 1120, margin: '0 auto', padding: '1.5rem',
        display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 280px',
        gap: '1.5rem', alignItems: 'start',
      }} className="page-wrap">
        <main style={{ minWidth: 0 }}>

          {/* Live scoreboard — shown above everything when game is active */}
          {showLive && (
            <LiveScoreboard
              game={liveGame}
              favoriteTeam={favoriteTeam}
              onDismiss={liveGame?.status === 'completed' ? () => setDismissed(true) : null}
            />
          )}

          {loading && <LoadingState />}
          {error   && <ErrorState message={error} onRetry={() => loadDivision(activeDivision)} />}
          {!loading && !error && pools && (
            <PoolView
              poolData={pools[activePool]} poolKey={activePool}
              favoriteTeam={favoriteTeam} teamEvents={teamEvents} allPools={pools}
            />
          )}
        </main>
        <aside className="desktop-sidebar">
          <Sidebar
            pools={pools} poolKeys={poolKeys} activePool={activePool}
            onSwitchPool={setActivePool} favoriteTeam={favoriteTeam}
            favoritePool={favoritePool} onSetFavorite={setFavorite}
            division={division} teamEvents={teamEvents}
          />
        </aside>
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div style={{ padding:'4rem 2rem', textAlign:'center' }}>
      <div style={{ width:22, height:22, border:'2px solid var(--rule)', borderTopColor:'var(--orange)', borderRadius:'50%', animation:'spin .65s linear infinite', margin:'0 auto .9rem' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ fontFamily:'var(--cond)', fontSize:14, letterSpacing:'.08em', color:'var(--ink-3)', textTransform:'uppercase' }}>Loading schedule…</div>
    </div>
  )
}

function ErrorState({ message, onRetry }) {
  return (
    <div style={{ padding:'3rem 2rem', textAlign:'center' }}>
      <div style={{ fontFamily:'var(--cond)', fontSize:16, color:'var(--red)', marginBottom:12 }}>{message}</div>
      <button onClick={onRetry} style={{ background:'var(--orange)', color:'#fff', border:'none', fontFamily:'var(--cond)', fontSize:12, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', padding:'6px 16px', borderRadius:4, cursor:'pointer' }}>Retry</button>
    </div>
  )
}
