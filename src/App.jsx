import { useState, useEffect, useCallback, useRef } from 'react'
import { DIVISIONS, fetchDivision, subscribeToDivision, fetchTeamEvents, fetchRecurringEvents, fetchPlayers, fetchTodaysResults } from './lib/supabase'
import Masthead from './components/Masthead'
import PoolView from './components/PoolView'
import Sidebar from './components/Sidebar'
import LiveScoreboard, { fetchLiveGame, FinalScoreCard } from './components/LiveScoreboard'
import GameCountdown from './components/GameCountdown'
import './index.css'
import { Analytics } from "@vercel/analytics/next"

const DEFAULT_DIVISION   = 'u19_men_2526'
const LIVE_POLL_INTERVAL = 10000
const KINGSTON_TEAM_ID   = '8dfe6481-46a6-4cfb-af47-6a7db4081308'

// dismissed key includes today's date so it auto-resets at midnight
function dismissedKey() {
  return `obl_dismissed_${new Date().toISOString().split('T')[0]}`
}

export default function App() {
  const [activeDivision, setActiveDivision] = useState(
    () => localStorage.getItem('obl_division') || DEFAULT_DIVISION
  )
  const [favoriteTeam, setFavoriteTeam] = useState(
    () => localStorage.getItem('obl_favorite_team') || 'Kingston Impact - Wallace'
  )
  const [activePool, setActivePool]   = useState('A')
  const [pools, setPools]             = useState(null)
  const [fetchedAt, setFetchedAt]     = useState(null)
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState(null)
  const [teamEvents, setTeamEvents]   = useState([])
  const [players, setPlayers]         = useState([])
  const [liveGame, setLiveGame]       = useState(null)
  const [todayResults, setTodayResults] = useState([])
  const [dismissed, setDismissed]     = useState(
    () => localStorage.getItem(dismissedKey()) === 'true'
  )
  const liveWsRef = useRef(null)

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

  const checkLiveGame = useCallback(async () => {
    try {
      const [game, results] = await Promise.all([
        fetchLiveGame(),
        fetchTodaysResults(),
      ])
      setTodayResults(results || [])

      if (game && game.status === 'in-progress') {
        // New live game — clear dismissed so scoreboard shows
        setDismissed(false)
        localStorage.removeItem(dismissedKey())
        setLiveGame(game)
        subscribeToLiveGame(game.id)
        if (game.team_id && players.length === 0) {
          fetchPlayers(game.team_id).then(setPlayers)
        }
      } else if (game && game.status === 'completed') {
        // Keep completed game visible — only hide if user dismissed
        setLiveGame(prev => prev?.id === game.id ? { ...prev, ...game } : game)
        closeLiveWs()
      }
      // If no game found at all, leave liveGame as-is — don't clear it
      // It will stay visible until dismissed or page reloads next day
    } catch (e) {
      console.warn('Live game check failed:', e.message)
    }
  }, [players.length])

  function subscribeToLiveGame(gameId) {
    closeLiveWs()
    const wsUrl = import.meta.env.VITE_SUPABASE_URL.replace('https://', 'wss://') +
      `/realtime/v1/websocket?apikey=${import.meta.env.VITE_SUPABASE_ANON}&vsn=1.0.0`
    const ws = new WebSocket(wsUrl)
    ws.onopen = () => {
      ws.send(JSON.stringify({
        topic: 'realtime:public:games', event: 'phx_join',
        payload: { config: { broadcast: { self: false }, postgres_changes: [{ event: 'UPDATE', schema: 'public', table: 'games', filter: `id=eq.${gameId}` }] } },
        ref: '1',
      }))
    }
    ws.onmessage = (e) => {
      const record = JSON.parse(e.data)?.payload?.data?.record
      if (record) { setLiveGame(record); if (record.status !== 'in-progress') closeLiveWs() }
    }
    ws.onclose = () => { liveWsRef.current = null }
    liveWsRef.current = ws
  }

  function closeLiveWs() {
    if (liveWsRef.current) { liveWsRef.current.close(); liveWsRef.current = null }
  }

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem(dismissedKey(), 'true')
  }

  useEffect(() => { loadDivision(activeDivision) }, [activeDivision, loadDivision])

  useEffect(() => {
    const ch = subscribeToDivision(activeDivision, () => loadDivision(activeDivision))
    return () => ch.unsubscribe()
  }, [activeDivision, loadDivision])

  useEffect(() => {
    checkLiveGame()
    const interval = setInterval(checkLiveGame, LIVE_POLL_INTERVAL)
    const onVisible = () => { if (document.visibilityState === 'visible') checkLiveGame() }
    document.addEventListener('visibilitychange', onVisible)
    return () => { clearInterval(interval); closeLiveWs(); document.removeEventListener('visibilitychange', onVisible) }
  }, [checkLiveGame])

  useEffect(() => {
    if (KINGSTON_TEAM_ID) fetchPlayers(KINGSTON_TEAM_ID).then(setPlayers)
  }, [])

  const switchDivision = (id) => { localStorage.setItem('obl_division', id); setActiveDivision(id) }
  const setFavorite    = (n)  => { localStorage.setItem('obl_favorite_team', n); setFavoriteTeam(n) }

  const division     = DIVISIONS.find(d => d.id === activeDivision)
  const poolKeys     = pools ? Object.keys(pools).sort() : []
  const favoritePool = pools
    ? Object.entries(pools).find(([, pd]) => pd.standings?.some(t => t.name === favoriteTeam))?.[0]
    : null

  const isLive        = liveGame?.status === 'in-progress'
  const isFinal       = liveGame?.status === 'completed'
  const showLive      = liveGame && !dismissed
  const showBanner    = !showLive && todayResults.length > 1  // banner when multiple games done and no live game showing
  const oblGamesForFav = pools && favoritePool
    ? (pools[favoritePool]?.weekends || []).flatMap(wk =>
        wk.games
          .filter(g => !wk.played && (g.home === favoriteTeam || g.away === favoriteTeam))
          .map(g => ({ ...g, played: wk.played, _date: wk.date ? new Date(wk.date) : null }))
      )
    : []

  return (
    <div>
      <Masthead
        division={division} divisions={DIVISIONS} onSwitchDivision={switchDivision}
        pools={poolKeys} activePool={activePool} onSwitchPool={setActivePool}
        fetchedAt={fetchedAt} loading={loading} onRefresh={() => loadDivision(activeDivision)}
        isLive={isLive}
      />

      <div style={{ maxWidth:1120, margin:'0 auto', padding:'1.5rem', display:'grid', gridTemplateColumns:'minmax(0,1fr) 280px', gap:'1.5rem', alignItems:'start' }} className="page-wrap">
        <main style={{ minWidth:0 }}>

          {/* Live scoreboard */}
          {showLive && isLive && (
            <LiveScoreboard game={liveGame} favoriteTeam={favoriteTeam} players={players} />
          )}

          {/* Compact final score — stays all day until dismissed */}
          {showLive && isFinal && (
            <FinalScoreCard game={liveGame} favoriteTeam={favoriteTeam} onDismiss={handleDismiss} />
          )}

          {/* End-of-day results banner — all today's completed games */}
          {showBanner && <ResultsBanner results={todayResults} favoriteTeam={favoriteTeam} />}

          {/* Countdown — only when no live/final game */}
          {!showLive && !showBanner && (
            <GameCountdown teamEvents={teamEvents} oblGames={oblGamesForFav} favoriteTeam={favoriteTeam} />
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

// ── End-of-day results banner ─────────────────────────────────────────────────
function ResultsBanner({ results, favoriteTeam }) {
  return (
    <div style={{ background:'var(--ink)', borderRadius:10, overflow:'hidden', marginBottom:'1.5rem' }}>
      <div style={{ padding:'6px 14px', borderBottom:'1px solid rgba(255,255,255,0.08)' }}>
        <span style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:800, letterSpacing:'0.16em', textTransform:'uppercase', color:'#4ade80' }}>
          Today's results
        </span>
      </div>
      <div style={{ padding:'4px 0' }}>
        {results.map((g, i) => {
          const settings  = g.game_settings || {}
          const isHome    = settings.isHome ?? true
          const opponent  = settings.opponent || 'Opponent'
          const ourName   = g.home_team || favoriteTeam?.split(' - ')[0] || 'Us'
          const ourScore  = isHome ? g.home_score : g.away_score
          const oppScore  = isHome ? g.away_score  : g.home_score
          const won       = ourScore > oppScore
          return (
            <div key={g.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 14px', borderBottom: i < results.length-1 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontFamily:'var(--cond)', fontSize:13, fontWeight:600, color:'#fff' }}>{ourName}</span>
                <span style={{ fontFamily:'var(--cond)', fontSize:11, color:'rgba(255,255,255,0.35)' }}>vs {opponent}</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <span style={{ fontFamily:'var(--cond)', fontSize:18, fontWeight:800, color: won?'#fff':'rgba(255,255,255,0.45)' }}>{ourScore}</span>
                <span style={{ fontFamily:'var(--cond)', fontSize:12, color:'rgba(255,255,255,0.2)' }}>—</span>
                <span style={{ fontFamily:'var(--cond)', fontSize:18, fontWeight:800, color: won?'rgba(255,255,255,0.45)':'#fff' }}>{oppScore}</span>
                <span style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:4, background: won?'rgba(74,222,128,0.12)':'rgba(239,68,68,0.12)', color: won?'#4ade80':'#ef4444' }}>
                  {won ? 'W' : ourScore === oppScore ? 'T' : 'L'}
                </span>
              </div>
            </div>
          )
        })}
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
