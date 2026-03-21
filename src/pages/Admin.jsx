import { useState, useEffect, useRef } from 'react'

const ADMIN_PIN      = import.meta.env.VITE_ADMIN_PIN || '1234'
const SUPABASE_URL   = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON  = import.meta.env.VITE_SUPABASE_ANON
const SUPABASE_SVC   = import.meta.env.VITE_SUPABASE_SERVICE_KEY

const TEAM_ID = 'kingston_impact_wallace'
const DAYS    = ['MON','TUE','WED','THU','FRI','SAT','SUN']

// ── helpers ──────────────────────────────────────────────────────────────────
function fmt12(h, m) {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12  = h % 12 || 12
  return `${h12}:${String(m).padStart(2,'0')} ${ampm}`
}
function toLocalDatetimeStr(iso) {
  if (!iso) return { date:'', h:8, m:0 }
  const d = new Date(iso)
  const date = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`
  return { date, h: d.getHours(), m: d.getMinutes() }
}
function buildISO(date, h, m) {
  if (!date) return null
  const d = new Date(`${date}T${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:00`)
  return d.toISOString()
}
function typeLabel(t) {
  return { practice:'Practice', game:'Game', tournament_game:'Tournament game', other:'Other' }[t] || t
}
function typeColor(t) {
  return { practice:'#185FA5', game:'#993408', tournament_game:'#854F0B', other:'#5F5E5A' }[t] || '#555'
}

// ── iOS Scroll Wheel ─────────────────────────────────────────────────────────
function ScrollWheel({ items, value, onChange, width = 60 }) {
  const ref      = useRef()
  const ITEM_H   = 36
  const idx      = items.indexOf(value)
  const scrollTo = (i) => {
    if (ref.current) ref.current.scrollTop = i * ITEM_H
  }

  useEffect(() => { scrollTo(idx < 0 ? 0 : idx) }, [])

  const onScroll = () => {
    if (!ref.current) return
    const i = Math.round(ref.current.scrollTop / ITEM_H)
    const clamped = Math.max(0, Math.min(i, items.length - 1))
    if (items[clamped] !== value) onChange(items[clamped])
  }

  return (
    <div style={{ position:'relative', width, overflow:'hidden', height: ITEM_H * 5, borderRadius: 10, background:'var(--surface)' }}>
      {/* Selection band */}
      <div style={{ position:'absolute', top: ITEM_H*2, left:0, right:0, height: ITEM_H, background:'rgba(0,0,0,0.06)', borderTop:'1px solid var(--rule)', borderBottom:'1px solid var(--rule)', pointerEvents:'none', zIndex:2 }} />
      {/* Fade top */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height: ITEM_H*2, background:'linear-gradient(to bottom, var(--white), transparent)', pointerEvents:'none', zIndex:2 }} />
      {/* Fade bottom */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, height: ITEM_H*2, background:'linear-gradient(to top, var(--white), transparent)', pointerEvents:'none', zIndex:2 }} />
      <div
        ref={ref}
        onScroll={onScroll}
        style={{ overflowY:'scroll', height:'100%', scrollSnapType:'y mandatory', WebkitOverflowScrolling:'touch', scrollbarWidth:'none', paddingTop: ITEM_H*2, paddingBottom: ITEM_H*2 }}
      >
        <style>{`.sw::-webkit-scrollbar{display:none}`}</style>
        {items.map((item, i) => (
          <div
            key={item}
            onClick={() => { scrollTo(i); onChange(item) }}
            style={{ height: ITEM_H, display:'flex', alignItems:'center', justifyContent:'center', scrollSnapAlign:'center', fontFamily:'var(--cond)', fontSize:16, fontWeight: item===value?700:400, color: item===value?'var(--ink)':'var(--ink-3)', cursor:'pointer', userSelect:'none' }}
          >
            {String(item).padStart(2,'0')}
          </div>
        ))}
      </div>
    </div>
  )
}

function TimePicker({ label, hour, minute, onHour, onMinute }) {
  const hours   = Array.from({length:24},(_,i)=>i)
  const minutes = [0,5,10,15,20,25,30,35,40,45,50,55]
  return (
    <div>
      <div style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)', marginBottom:6 }}>{label}</div>
      <div style={{ display:'flex', alignItems:'center', gap:4, background:'var(--white)', border:'1px solid var(--rule)', borderRadius:12, padding:'6px 10px' }}>
        <ScrollWheel items={hours}   value={hour}   onChange={onHour}   width={52} />
        <div style={{ fontFamily:'var(--cond)', fontSize:20, fontWeight:700, color:'var(--ink-3)', padding:'0 2px' }}>:</div>
        <ScrollWheel items={minutes} value={minute} onChange={onMinute} width={52} />
        <div style={{ fontFamily:'var(--cond)', fontSize:14, fontWeight:600, color:'var(--ink-2)', marginLeft:6, minWidth:50 }}>{fmt12(hour,minute)}</div>
      </div>
    </div>
  )
}

// ── Field ────────────────────────────────────────────────────────────────────
function Field({ label, children }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
      <label style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:700, letterSpacing:'0.12em', textTransform:'uppercase', color:'var(--ink-3)' }}>{label}</label>
      {children}
    </div>
  )
}

function TextInput({ value, onChange, placeholder }) {
  return (
    <input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}
      style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--rule)', borderRadius:8, fontFamily:'var(--sans)', fontSize:14, color:'var(--ink)', background:'var(--white)', outline:'none' }}
    />
  )
}

// ── Main Admin ────────────────────────────────────────────────────────────────
const BLANK_FORM = {
  type:'practice', title:'Practice', opponent:'', is_home:true,
  location:'', address:'', notes:'', tournament_name:'',
  date:'', startH:9, startM:0, endH:11, endM:0,
}

export default function Admin() {
  const [pin,      setPin]      = useState('')
  const [authed,   setAuthed]   = useState(false)
  const [pinErr,   setPinErr]   = useState(false)
  const [tab,      setTab]      = useState('practice')
  const [form,     setForm]     = useState(BLANK_FORM)
  const [saving,   setSaving]   = useState(false)
  const [saved,    setSaved]    = useState(false)
  const [err,      setErr]      = useState(null)
  const [events,   setEvents]   = useState([])
  const [expanded, setExpanded] = useState(null)   // id of expanded event
  const [editing,  setEditing]  = useState(null)   // id being edited
  const [listOpen, setListOpen] = useState(true)

  // Recurring
  const [rec, setRec] = useState({
    title:'Practice', days_of_week:[], startH:19, startM:0, endH:21, endM:0,
    location:'', address:'', notes:'', active_from:'', active_until:'',
  })

  const upd  = (k,v) => setForm(f=>({...f,[k]:v}))
  const updR = (k,v) => setRec(r=>({...r,[k]:v}))

  const checkPin = () => {
    if (pin === ADMIN_PIN) { setAuthed(true); setPinErr(false) }
    else { setPinErr(true); setPin('') }
  }

  const headers = {
    'apikey': SUPABASE_SVC,
    'Authorization': `Bearer ${SUPABASE_SVC}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=minimal',
  }

  const loadEvents = async () => {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/team_events?team_id=eq.${TEAM_ID}&select=*&order=start_time.asc`, {
      headers: { apikey: SUPABASE_ANON, Authorization: `Bearer ${SUPABASE_ANON}` }
    })
    const data = await res.json()
    setEvents(Array.isArray(data) ? data : [])
  }

  useEffect(() => { if (authed) loadEvents() }, [authed])

  const save = async () => {
    setSaving(true); setSaved(false); setErr(null)
    try {
      const isRec = tab === 'recurring'
      const table = isRec ? 'recurring_events' : 'team_events'
      let body
      if (isRec) {
        body = {
          team_id: TEAM_ID, type:'practice', title: rec.title,
          days_of_week: rec.days_of_week,
          start_time: `${String(rec.startH).padStart(2,'0')}:${String(rec.startM).padStart(2,'0')}:00`,
          end_time:   `${String(rec.endH).padStart(2,'0')}:${String(rec.endM).padStart(2,'0')}:00`,
          location: rec.location, address: rec.address, notes: rec.notes,
          active_from: rec.active_from || null, active_until: rec.active_until || null,
        }
      } else {
        body = {
          team_id: TEAM_ID,
          type: tab === 'practice' ? 'practice' : (form.tournament_name ? 'tournament_game' : 'game'),
          title: form.title, opponent: form.opponent || null,
          is_home: form.is_home, location: form.location, address: form.address,
          notes: form.notes, tournament_name: form.tournament_name || null,
          start_time: buildISO(form.date, form.startH, form.startM),
          end_time:   buildISO(form.date, form.endH,   form.endM),
        }
      }

      const method = editing ? 'PATCH' : 'POST'
      const url    = editing
        ? `${SUPABASE_URL}/rest/v1/${table}?id=eq.${editing}`
        : `${SUPABASE_URL}/rest/v1/${table}`

      const res = await fetch(url, { method, headers, body: JSON.stringify(body) })
      if (!res.ok) throw new Error(await res.text())

      setSaved(true)
      setEditing(null)
      setForm(BLANK_FORM)
      setRec({ title:'Practice', days_of_week:[], startH:19, startM:0, endH:21, endM:0, location:'', address:'', notes:'', active_from:'', active_until:'' })
      await loadEvents()
      setTimeout(() => setSaved(false), 3000)
    } catch(e) { setErr(e.message) }
    finally { setSaving(false) }
  }

  const deleteEvent = async (id) => {
    if (!confirm('Delete this event?')) return
    await fetch(`${SUPABASE_URL}/rest/v1/team_events?id=eq.${id}`, { method:'DELETE', headers })
    await loadEvents()
    if (expanded === id) setExpanded(null)
  }

  const startEdit = (ev) => {
    const s = toLocalDatetimeStr(ev.start_time)
    const e = toLocalDatetimeStr(ev.end_time)
    setTab(ev.type === 'practice' ? 'practice' : 'game')
    setForm({ type:ev.type, title:ev.title||'', opponent:ev.opponent||'', is_home:ev.is_home??true, location:ev.location||'', address:ev.address||'', notes:ev.notes||'', tournament_name:ev.tournament_name||'', date:s.date, startH:s.h, startM:s.m, endH:e.h||s.h+2, endM:e.m||0 })
    setEditing(ev.id)
    window.scrollTo({ top: 9999, behavior:'smooth' })
  }

  // ── PIN screen ───────────────────────────────────────────────────────────
  if (!authed) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'var(--surface)' }}>
      <div style={{ background:'var(--white)', border:'1px solid var(--rule)', borderRadius:12, padding:'2rem', width:320, textAlign:'center' }}>
        <div style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--orange)', marginBottom:4 }}>Team Admin</div>
        <div style={{ fontFamily:'var(--cond)', fontSize:22, fontWeight:800, color:'var(--ink)', marginBottom:'1.5rem' }}>Kingston Impact</div>
        <input type="password" placeholder="PIN" value={pin} onChange={e=>setPin(e.target.value)} onKeyDown={e=>e.key==='Enter'&&checkPin()}
          style={{ width:'100%', fontSize:28, textAlign:'center', letterSpacing:'0.3em', padding:'10px', border:`2px solid ${pinErr?'var(--red)':'var(--rule)'}`, borderRadius:8, fontFamily:'var(--cond)', marginBottom:8, outline:'none' }} />
        {pinErr && <div style={{ color:'var(--red)', fontSize:12, marginBottom:8 }}>Incorrect PIN</div>}
        <button onClick={checkPin} style={{ width:'100%', background:'var(--orange)', color:'#fff', border:'none', borderRadius:8, padding:'11px', fontFamily:'var(--cond)', fontSize:14, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', cursor:'pointer' }}>Enter</button>
      </div>
    </div>
  )

  // ── Authed ───────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth:560, margin:'0 auto', padding:'1.5rem 1rem' }}>
      <div style={{ marginBottom:'1.5rem' }}>
        <div style={{ fontFamily:'var(--cond)', fontSize:10, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--orange)' }}>Team Admin</div>
        <div style={{ fontFamily:'var(--cond)', fontSize:24, fontWeight:800, color:'var(--ink)' }}>Kingston Impact</div>
      </div>

      {/* ── EVENT LIST ── */}
      <div style={{ background:'var(--white)', border:'1px solid var(--rule)', borderRadius:10, overflow:'hidden', marginBottom:'1.5rem' }}>
        <button onClick={()=>setListOpen(o=>!o)} style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0.75rem 1rem', background:'none', border:'none', cursor:'pointer', borderBottom: listOpen?'1px solid var(--rule)':'none' }}>
          <span style={{ fontFamily:'var(--cond)', fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color:'var(--ink-3)' }}>
            Upcoming events ({events.filter(e=>new Date(e.start_time)>=new Date()).length})
          </span>
          <span style={{ color:'var(--ink-3)', fontSize:16, transform: listOpen?'rotate(90deg)':'none', transition:'transform 0.2s' }}>›</span>
        </button>

        {listOpen && (
          events.length === 0
            ? <div style={{ padding:'1.5rem', textAlign:'center', color:'var(--ink-4)', fontFamily:'var(--cond)', fontSize:13, letterSpacing:'0.05em', textTransform:'uppercase' }}>No events yet</div>
            : events.filter(e=>new Date(e.start_time)>=new Date()).map((ev, i, arr) => {
                const dt  = new Date(ev.start_time)
                const day = dt.toLocaleDateString('en-CA', { weekday:'short', month:'short', day:'numeric' })
                const t   = dt.toLocaleTimeString('en-CA', { hour:'numeric', minute:'2-digit' })
                const isEx = expanded === ev.id
                return (
                  <div key={ev.id} style={{ borderBottom: i<arr.length-1?'1px solid var(--rule)':'none' }}>
                    <button onClick={()=>setExpanded(isEx?null:ev.id)} style={{ width:'100%', display:'flex', alignItems:'center', gap:10, padding:'0.65rem 1rem', background:isEx?'#f9f9f7':'none', border:'none', cursor:'pointer', textAlign:'left' }}>
                      <div style={{ width:6, height:6, borderRadius:'50%', background:typeColor(ev.type), flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontFamily:'var(--cond)', fontSize:14, fontWeight:600, color:'var(--ink)', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                          {ev.opponent ? `vs ${ev.opponent}` : ev.title || typeLabel(ev.type)}
                        </div>
                        <div style={{ fontSize:11, color:'var(--ink-3)' }}>{typeLabel(ev.type)} · {day} · {t}</div>
                      </div>
                      <span style={{ color:'var(--ink-4)', fontSize:14, transform:isEx?'rotate(90deg)':'none', transition:'transform 0.15s', flexShrink:0 }}>›</span>
                    </button>
                    {isEx && (
                      <div style={{ padding:'0.5rem 1rem 0.75rem 2.25rem', background:'#f9f9f7', borderTop:'1px solid var(--rule)' }}>
                        {ev.location && <div style={{ fontSize:12, color:'var(--ink-2)', marginBottom:2 }}>{ev.location}{ev.address?` · ${ev.address}`:''}</div>}
                        {ev.notes    && <div style={{ fontSize:12, color:'var(--ink-3)', fontStyle:'italic', marginBottom:6 }}>{ev.notes}</div>}
                        <div style={{ display:'flex', gap:8, marginTop:6 }}>
                          <button onClick={()=>startEdit(ev)} style={{ flex:1, padding:'6px', background:'var(--or-light)', border:'1px solid var(--or-mid)', borderRadius:6, fontFamily:'var(--cond)', fontSize:12, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--orange)', cursor:'pointer' }}>Edit</button>
                          <button onClick={()=>deleteEvent(ev.id)} style={{ flex:1, padding:'6px', background:'var(--red-bg)', border:'1px solid #f09595', borderRadius:6, fontFamily:'var(--cond)', fontSize:12, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:'var(--red)', cursor:'pointer' }}>Delete</button>
                        </div>
                      </div>
                    )}
                  </div>
                )
              })
        )}
      </div>

      {/* ── ADD / EDIT FORM ── */}
      <div style={{ background:'var(--white)', border: editing?'2px solid var(--or-mid)':'1px solid var(--rule)', borderRadius:10, overflow:'hidden' }}>
        <div style={{ padding:'0.75rem 1rem', borderBottom:'1px solid var(--rule)', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <span style={{ fontFamily:'var(--cond)', fontSize:11, fontWeight:700, letterSpacing:'0.14em', textTransform:'uppercase', color: editing?'var(--orange)':'var(--ink-3)' }}>
            {editing ? 'Editing event' : 'Add event'}
          </span>
          {editing && (
            <button onClick={()=>{setEditing(null);setForm(BLANK_FORM)}} style={{ background:'none', border:'none', fontSize:18, color:'var(--ink-3)', cursor:'pointer' }}>×</button>
          )}
        </div>

        {/* Tabs */}
        <div style={{ display:'flex', borderBottom:'1px solid var(--rule)' }}>
          {[{key:'practice',label:'Practice'},{key:'recurring',label:'Recurring'},{key:'game',label:'Game'}].map(t=>(
            <button key={t.key} onClick={()=>setTab(t.key)} style={{ flex:1, padding:'10px 6px', background: tab===t.key?'var(--or-light)':'none', border:'none', borderBottom: tab===t.key?'2px solid var(--orange)':'2px solid transparent', fontFamily:'var(--cond)', fontSize:11, fontWeight:700, letterSpacing:'0.08em', textTransform:'uppercase', color:tab===t.key?'var(--orange)':'var(--ink-3)', cursor:'pointer' }}>
              {t.label}
            </button>
          ))}
        </div>

        <div style={{ padding:'1.25rem', display:'flex', flexDirection:'column', gap:'1.25rem' }}>

          {/* PRACTICE */}
          {tab==='practice' && <>
            <Field label="Title"><TextInput value={form.title} onChange={v=>upd('title',v)} placeholder="Practice" /></Field>
            <Field label="Date"><input type="date" value={form.date} onChange={e=>upd('date',e.target.value)} style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--rule)', borderRadius:8, fontSize:14, color:'var(--ink)', background:'var(--white)', outline:'none' }} /></Field>
            <TimePicker label="Start time" hour={form.startH} minute={form.startM} onHour={v=>upd('startH',v)} onMinute={v=>upd('startM',v)} />
            <TimePicker label="End time"   hour={form.endH}   minute={form.endM}   onHour={v=>upd('endH',v)}   onMinute={v=>upd('endM',v)} />
            <Field label="Location"><TextInput value={form.location} onChange={v=>upd('location',v)} placeholder="Gym / arena" /></Field>
            <Field label="Address"><TextInput value={form.address} onChange={v=>upd('address',v)} placeholder="123 Main St, Kingston, ON" /></Field>
            <Field label="Notes"><textarea value={form.notes} onChange={e=>upd('notes',e.target.value)} rows={2} placeholder="e.g. Bring pinnies" style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--rule)', borderRadius:8, fontSize:14, fontFamily:'var(--sans)', resize:'vertical', outline:'none' }} /></Field>
          </>}

          {/* RECURRING */}
          {tab==='recurring' && <>
            <Field label="Title"><TextInput value={rec.title} onChange={v=>updR('title',v)} placeholder="Practice" /></Field>
            <Field label="Days of week">
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {DAYS.map(d=>(
                  <button key={d} onClick={()=>updR('days_of_week', rec.days_of_week.includes(d)?rec.days_of_week.filter(x=>x!==d):[...rec.days_of_week,d])}
                    style={{ padding:'5px 10px', borderRadius:20, border:`1px solid ${rec.days_of_week.includes(d)?'var(--orange)':'var(--rule)'}`, background:rec.days_of_week.includes(d)?'var(--orange)':'#fff', color:rec.days_of_week.includes(d)?'#fff':'var(--ink-3)', fontFamily:'var(--cond)', fontSize:12, fontWeight:600, cursor:'pointer' }}>{d}</button>
                ))}
              </div>
            </Field>
            <TimePicker label="Start time" hour={rec.startH} minute={rec.startM} onHour={v=>updR('startH',v)} onMinute={v=>updR('startM',v)} />
            <TimePicker label="End time"   hour={rec.endH}   minute={rec.endM}   onHour={v=>updR('endH',v)}   onMinute={v=>updR('endM',v)} />
            <Field label="Location"><TextInput value={rec.location} onChange={v=>updR('location',v)} placeholder="Gym / arena" /></Field>
            <Field label="Address"><TextInput value={rec.address} onChange={v=>updR('address',v)} placeholder="123 Main St" /></Field>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
              <Field label="Active from"><input type="date" value={rec.active_from} onChange={e=>updR('active_from',e.target.value)} style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--rule)', borderRadius:8, fontSize:14, outline:'none' }} /></Field>
              <Field label="Active until"><input type="date" value={rec.active_until} onChange={e=>updR('active_until',e.target.value)} style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--rule)', borderRadius:8, fontSize:14, outline:'none' }} /></Field>
            </div>
          </>}

          {/* GAME */}
          {tab==='game' && <>
            <Field label="Opponent"><TextInput value={form.opponent} onChange={v=>upd('opponent',v)} placeholder="Opposing team" /></Field>
            <Field label="Home or Away">
              <div style={{ display:'flex', gap:8 }}>
                {['Home','Away'].map(v=>(
                  <button key={v} onClick={()=>upd('is_home',v==='Home')} style={{ flex:1, padding:'9px', borderRadius:8, border:`1px solid ${(v==='Home')===form.is_home?'var(--orange)':'var(--rule)'}`, background:(v==='Home')===form.is_home?'var(--or-light)':'#fff', color:(v==='Home')===form.is_home?'var(--orange)':'var(--ink-3)', fontFamily:'var(--cond)', fontSize:13, fontWeight:700, cursor:'pointer' }}>{v}</button>
                ))}
              </div>
            </Field>
            <Field label="Tournament (leave blank if standalone)"><TextInput value={form.tournament_name} onChange={v=>upd('tournament_name',v)} placeholder="Tournament name" /></Field>
            <Field label="Date"><input type="date" value={form.date} onChange={e=>upd('date',e.target.value)} style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--rule)', borderRadius:8, fontSize:14, color:'var(--ink)', background:'var(--white)', outline:'none' }} /></Field>
            <TimePicker label="Start time" hour={form.startH} minute={form.startM} onHour={v=>upd('startH',v)} onMinute={v=>upd('startM',v)} />
            <TimePicker label="End time"   hour={form.endH}   minute={form.endM}   onHour={v=>upd('endH',v)}   onMinute={v=>upd('endM',v)} />
            <Field label="Location"><TextInput value={form.location} onChange={v=>upd('location',v)} placeholder="Arena / gym" /></Field>
            <Field label="Address"><TextInput value={form.address} onChange={v=>upd('address',v)} placeholder="123 Main St" /></Field>
            <Field label="Notes"><textarea value={form.notes} onChange={e=>upd('notes',e.target.value)} rows={2} style={{ width:'100%', padding:'9px 12px', border:'1px solid var(--rule)', borderRadius:8, fontSize:14, fontFamily:'var(--sans)', resize:'vertical', outline:'none' }} /></Field>
          </>}

          <button onClick={save} disabled={saving} style={{ background:saving?'var(--ink-4)':'var(--orange)', color:'#fff', border:'none', borderRadius:8, padding:'13px', fontFamily:'var(--cond)', fontSize:14, fontWeight:800, letterSpacing:'0.1em', textTransform:'uppercase', cursor:saving?'not-allowed':'pointer', marginTop:4 }}>
            {saving ? 'Saving…' : saved ? '✓ Saved' : editing ? 'Save changes' : 'Add event'}
          </button>

          {err && <div style={{ background:'var(--red-bg)', border:'1px solid var(--red)', borderRadius:6, padding:'10px 12px', fontSize:12, color:'var(--red)' }}>{err}</div>}
          {saved && <div style={{ background:'var(--green-bg)', border:'1px solid var(--green)', borderRadius:6, padding:'10px 12px', fontSize:12, color:'var(--green)' }}>Saved successfully</div>}
        </div>
      </div>
    </div>
  )
}
