// src/components/RouteTimeline.jsx
import React, { useMemo, useState, useEffect, useRef } from 'react'

// ─── Sim 2 Demo Data ─────────────────────────────────────────────────────────
const DEMO_BUSES = [
  {
    id: '500-D',
    name: 'Silk Board Depot to Hebbal Flyover',
    plate: 'E6-8812',
    color: '#3b82f6',
    stops: ['Silk Board', 'BTM Layout', 'Jayanagar', 'Lalbagh', 'City Market', 'Majestic', 'Yeshwanthpur', 'Hebbal'],
    baseSpeed: 57,
    comfort: 55,
    delay: 3,
    seatCapacity: 52,
  },
  {
    id: '335-E',
    name: 'Majestic KBS to Whitefield ITPL',
    plate: 'FA-4422',
    color: '#f59e0b',
    stops: ['Majestic', 'Shivajinagar', 'Ulsoor', 'Trinity', 'Indiranagar', 'Domlur', 'Marathahalli', 'Whitefield'],
    baseSpeed: 39,
    comfort: 68,
    delay: 12,
    seatCapacity: 52,
  },
  {
    id: 'KIA-9',
    name: 'Majestic KBS to Airport Terminal',
    plate: 'F-9906',
    color: '#10b981',
    stops: ['Majestic', 'Hebbal', 'Nagawara', 'Jakkur', 'Yelahanka', 'Devanahalli', 'Terminal 1', 'Terminal 2'],
    baseSpeed: 75,
    comfort: 95,
    delay: 0,
    seatCapacity: 52,
  },
  {
    id: 'KSRTC-MYS',
    name: 'Bengaluru Majestic to Mysuru Central',
    plate: 'F-7111',
    color: '#ef4444',
    stops: ['Majestic', 'Kengeri', 'Bidadi', 'Ramanagara', 'Channapatna', 'Maddur', 'Mandya', 'Mysuru'],
    baseSpeed: 35,
    comfort: 87,
    delay: 0,
    seatCapacity: 52,
  },
]

// ─── Sim 2: Standalone GPS Fleet Demo ─────────────────────────────────────────
function FleetDemo() {
  const [running, setRunning]           = useState(false)
  const [simSpeed, setSimSpeed]         = useState(1)
  const [delayMinutes, setDelayMinutes] = useState(0)

  // Per-bus state: position, liveSpeed, direction, standing passengers
  const [busStates, setBusStates] = useState(() =>
    DEMO_BUSES.map(b => ({
      pos: 0,
      speed: b.baseSpeed,
      dir: 1,
      dwellMs: 0,
      seated: Math.floor(b.seatCapacity * 0.5),   // start ~50% seated
      standing: 0,                                  // standing pax (0–15)
    }))
  )

  const timersRef = useRef([])

  // Schedule the next advance for a single bus independently
  const scheduleNext = (busIdx, currentRunning, currentSpeed) => {
    if (!currentRunning) return
    const bus = DEMO_BUSES[busIdx]

    // Random dwell: 0.6s – 3.5s, divided by simSpeed multiplier
    const baseMs = 600 + Math.random() * 2900
    const ms = Math.round(baseMs / currentSpeed)

    timersRef.current[busIdx] = setTimeout(() => {
      setBusStates(prev => {
        const next = [...prev]
        const s    = { ...next[busIdx] }
        const max  = bus.stops.length - 1

        // Randomly flip direction occasionally (10% chance) or at terminus
        let dir = s.dir
        if (s.pos >= max)      dir = -1  // reached end → go back
        else if (s.pos <= 0)   dir = 1   // at start → go forward
        else if (Math.random() < 0.08) dir = dir === 1 ? -1 : 1  // random flip

        const newPos = Math.max(0, Math.min(max, s.pos + dir))

        // Random speed jitter ±15 km/h around base
        const jitter = Math.floor(Math.random() * 30) - 15
        const newSpeed = Math.max(8, bus.baseSpeed + jitter)

        // Standing passengers: random 0–15, more likely when seats are full
        const STAND_MAX = 15
        // Bias: 60% chance to have standing pax at each stop advance
        const newSeated   = Math.floor(bus.seatCapacity * (0.4 + Math.random() * 0.6))
        const newStanding = Math.random() < 0.6
          ? Math.floor(Math.random() * (STAND_MAX + 1))
          : 0

        next[busIdx] = { pos: newPos, speed: newSpeed, dir, dwellMs: ms, seated: newSeated, standing: newStanding }
        return next
      })

      // Schedule the next advance for this bus
      scheduleNext(busIdx, true, currentSpeed)
    }, ms)
  }

  // Start simulation
  const handleStart = () => {
    setRunning(true)
    setBusStates(prev =>
      prev.map((s, i) => ({ ...s, pos: Math.floor(Math.random() * 2), speed: DEMO_BUSES[i].baseSpeed, dir: 1, seated: Math.floor(DEMO_BUSES[i].seatCapacity * 0.5), standing: 0 }))
    )
    // Stagger bus start times so they don't all fire together
    DEMO_BUSES.forEach((_, i) => {
      const stagger = i * 400 + Math.random() * 300
      setTimeout(() => scheduleNext(i, true, simSpeed), stagger)
    })
  }

  // Stop simulation
  const handleStop = () => {
    setRunning(false)
    timersRef.current.forEach(t => clearTimeout(t))
    timersRef.current = []
    setBusStates(DEMO_BUSES.map(b => ({ pos: 0, speed: b.baseSpeed, dir: 1, dwellMs: 0, seated: Math.floor(b.seatCapacity * 0.5), standing: 0 })))
  }

  // When simSpeed changes mid-run: clear and reschedule all
  const simSpeedRef = useRef(simSpeed)
  useEffect(() => {
    simSpeedRef.current = simSpeed
    if (running) {
      timersRef.current.forEach(t => clearTimeout(t))
      timersRef.current = []
      DEMO_BUSES.forEach((_, i) => scheduleNext(i, true, simSpeed))
    }
  }, [simSpeed])

  // Cleanup on unmount
  useEffect(() => () => timersRef.current.forEach(t => clearTimeout(t)), [])

  const syncLabel = running ? 'MAINFRAME SYNC ACTIVE' : 'SIMULATION IDLE'
  const syncColor = running ? '#10b981' : '#94a3b8'



  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14, padding: '16px 16px 20px' }}>

      {/* ── Sim Controls (slim) ── */}
      <div style={{
        borderRadius: 12,
        border: '1px solid #e8eaf6',
        background: 'white',
        padding: '12px 14px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        display: 'flex',
        flexWrap: 'wrap',
        gap: 10,
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 1.2, color: '#9ca3af', textTransform: 'uppercase', flexBasis: '100%' }}>
          Velocity Engine Speed: <span style={{ color: '#4f46e5' }}>{simSpeed}x Normal</span>
        </span>

        {/* Speed buttons */}
        {[1, 3, 6].map(s => (
          <button
            key={s}
            onClick={() => setSimSpeed(s)}
            style={{
              flex: 1, minWidth: 70, padding: '9px 0', borderRadius: 9,
              border: simSpeed === s ? '2px solid #6366f1' : '1.5px solid #e5e7eb',
              background: simSpeed === s ? '#eef2ff' : 'white',
              color: simSpeed === s ? '#4338ca' : '#374151',
              fontSize: 12, fontWeight: simSpeed === s ? 700 : 500,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            {s}x speed
          </button>
        ))}

        {/* Delay button */}
        <button
          onClick={() => setDelayMinutes(d => d + 5)}
          style={{
            padding: '9px 14px', borderRadius: 9,
            border: delayMinutes > 0 ? '1.5px solid #fca5a5' : '1.5px solid #e5e7eb',
            background: delayMinutes > 0 ? '#fff1f2' : 'white',
            color: delayMinutes > 0 ? '#dc2626' : '#374151',
            fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          +5 Min Delay{delayMinutes > 0 ? ` (${delayMinutes}m)` : ''}
        </button>
      </div>

      {/* ── Fleet Panel ── */}
      <div style={{
        borderRadius: 14,
        border: '1px solid #e2e8f0',
        background: 'white',
        overflow: 'hidden',
        boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
      }}>
        {/* Fleet header */}
        <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#5c6bc0" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13" rx="2"/><path d="M16 8h4l3 3v5h-7V8z"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: 1.3, color: '#3730a3', textTransform: 'uppercase' }}>
                Live Fleet Routing Vector Schema
              </span>
            </div>
            {/* Sync badge */}
            <span style={{
              fontSize: 9, fontWeight: 700, letterSpacing: 0.8, textTransform: 'uppercase',
              padding: '4px 10px', borderRadius: 20, whiteSpace: 'nowrap',
              border: `1.5px solid ${syncColor}`, color: syncColor,
              background: running ? 'rgba(16,185,129,0.06)' : 'transparent',
              transition: 'all 0.3s',
            }}>
              {syncLabel}
            </span>
          </div>
          <p style={{ margin: '6px 0 0', fontSize: 11, color: '#94a3b8', lineHeight: 1.5 }}>
            Real-time vector progression along historical city corridors. Highlights virtual GPS pings, license registrations, and currently reported comfort and congestion quotients.
          </p>
        </div>

        {/* Bus rows */}
        <div style={{ padding: '8px 0' }}>
          {DEMO_BUSES.map((bus, bi) => {
            const bs         = busStates[bi]
            const pos        = bs.pos
            const totalStops = bus.stops.length
            const spd        = bs.speed
            const dir        = bs.dir
            const seated     = bs.seated ?? Math.floor(bus.seatCapacity * 0.5)
            const standing   = bs.standing ?? 0
            const STAND_MAX  = 15
            const standPct   = Math.round((standing / STAND_MAX) * 100)
            const seatPct    = Math.round((seated / bus.seatCapacity) * 100)
            const delay      = bus.delay + delayMinutes
            const comfort    = Math.max(10, bus.comfort - Math.floor(delayMinutes * 0.8) - Math.floor(standing * 0.5))

            return (
              <div key={bus.id} style={{ padding: '10px 18px 14px', borderBottom: bi < DEMO_BUSES.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                {/* Row header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 8 }}>
                  {/* Route code pill */}
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '3px 10px',
                    border: '1.5px solid #e5e7eb', borderRadius: 7,
                    color: '#374151', background: '#f9fafb', whiteSpace: 'nowrap',
                    letterSpacing: 0.3,
                  }}>{bus.id}</span>

                  {/* Route name */}
                  <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b', flex: 1, minWidth: 140 }}>
                    {bus.name.length > 34 ? bus.name.slice(0, 34) + '…' : bus.name}
                  </span>

                  {/* Stats */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', whiteSpace: 'nowrap', flexWrap: 'wrap' }}>
                    <span>Speed: <strong style={{ color: '#1e293b' }}>{running ? spd : bus.baseSpeed} Kmph</strong></span>
                    <span style={{ color: '#d1d5db' }}>•</span>
                    <span>Comfort: <strong style={{ color: '#1e293b' }}>{comfort}/100</strong></span>
                    <span style={{ color: '#d1d5db' }}>•</span>
                    {/* Delay badge */}
                    <span style={{
                      padding: '3px 9px', borderRadius: 20, fontSize: 10, fontWeight: 700,
                      border: delay > 0 ? '1.5px solid #fca5a5' : '1.5px solid #6ee7b7',
                      color: delay > 0 ? '#dc2626' : '#059669',
                      background: delay > 0 ? '#fff1f2' : '#f0fdf4',
                    }}>
                      {delay > 0 ? `+${delay}m delay` : 'On Time'}
                    </span>
                  </div>
                </div>

                {/* Stop corridor */}
                <div style={{ position: 'relative', height: 32, display: 'flex', alignItems: 'center' }}>
                  {/* Track line */}
                  <div style={{
                    position: 'absolute', left: 0, right: 0, top: '50%',
                    height: 1.5, background: '#e5e7eb', transform: 'translateY(-50%)',
                  }} />

                  {/* Stop dots — colour based on direction */}
                  {bus.stops.map((stop, si) => {
                    const leftPct  = totalStops > 1 ? (si / (totalStops - 1)) * 100 : 50
                    const isPast   = dir === 1 ? si < pos : si > pos
                    const isCurr   = si === pos
                    return (
                      <div key={si} title={stop} style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        transform: 'translate(-50%, -50%)',
                        top: '50%',
                        width: isCurr ? 0 : 10,
                        height: isCurr ? 0 : 10,
                        borderRadius: '50%',
                        background: isPast ? bus.color : 'white',
                        border: `2px solid ${isPast ? bus.color : '#d1d5db'}`,
                        zIndex: 1,
                        transition: 'all 0.4s ease',
                      }} />
                    )
                  })}

                  {/* Bus token (animated pill with direction arrow) */}
                  {(() => {
                    const leftPct = totalStops > 1 ? (pos / (totalStops - 1)) * 100 : 50
                    return (
                      <div style={{
                        position: 'absolute',
                        left: `${leftPct}%`,
                        transform: 'translate(-50%, -50%)',
                        top: '50%',
                        zIndex: 3,
                        transition: 'left 0.65s cubic-bezier(0.4,0,0.2,1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        background: bus.color,
                        borderRadius: 20,
                        padding: '4px 9px',
                        color: 'white',
                        fontSize: 10,
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        boxShadow: `0 2px 10px ${bus.color}55`,
                        letterSpacing: 0.3,
                      }}>
                        {/* Direction arrow */}
                        <span style={{ fontSize: 9, opacity: 0.85 }}>{dir === 1 ? '▶' : '◀'}</span>
                        {bus.plate}
                      </div>
                    )
                  })()}
                </div>

                {/* Current stop label + Standing Passengers */}
                {running && (
                  <div style={{ marginTop: 6 }}>
                    {/* Stop label */}
                    <div style={{ fontSize: 10, color: '#94a3b8', marginBottom: 6 }}>
                      📍 <strong style={{ color: bus.color }}>{bus.stops[pos]}</strong>
                      {dir === 1 && pos < totalStops - 1 && <span> → {bus.stops[pos + 1]}</span>}
                      {dir === -1 && pos > 0 && <span style={{ color: '#f59e0b' }}> ← {bus.stops[pos - 1]}</span>}
                      {((dir === 1 && pos === totalStops - 1) || (dir === -1 && pos === 0)) && (
                        <span style={{ color: '#6366f1', fontWeight: 700 }}> · Turning around…</span>
                      )}
                    </div>

                    {/* Seated + Standing capacity row */}
                    <div style={{
                      background: '#f8fafc',
                      borderRadius: 10,
                      padding: '8px 10px',
                      border: standing > 10 ? '1px solid #fca5a5' : '1px solid #e8eaf6',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6,
                    }}>
                      {/* Seated row */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>💺 Seated</span>
                          <span style={{ fontSize: 10, fontWeight: 700, color: seatPct > 85 ? '#dc2626' : seatPct > 60 ? '#d97706' : '#059669' }}>
                            {seated}/{bus.seatCapacity}
                          </span>
                        </div>
                        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${seatPct}%`,
                            background: seatPct > 85 ? '#ef4444' : seatPct > 60 ? '#f59e0b' : '#10b981',
                            transition: 'width 0.5s ease',
                          }} />
                        </div>
                      </div>

                      {/* Standing row */}
                      <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{ fontSize: 10, color: '#6b7280', fontWeight: 600 }}>🧍 Standing</span>
                            <span style={{
                              fontSize: 9, fontWeight: 700, padding: '1px 6px', borderRadius: 8,
                              background: standing >= 15 ? '#fee2e2' : standing > 8 ? '#fef3c7' : '#f0fdf4',
                              color: standing >= 15 ? '#dc2626' : standing > 8 ? '#d97706' : '#059669',
                              border: `1px solid ${standing >= 15 ? '#fca5a5' : standing > 8 ? '#fde68a' : '#bbf7d0'}`,
                            }}>
                              {standing >= 15 ? 'MAX' : standing > 8 ? 'HIGH' : 'OK'}
                            </span>
                          </div>
                          <span style={{
                            fontSize: 10, fontWeight: 700,
                            color: standing >= 15 ? '#dc2626' : standing > 8 ? '#d97706' : '#374151',
                          }}>
                            {standing}/15
                          </span>
                        </div>
                        <div style={{ height: 5, background: '#e5e7eb', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 3,
                            width: `${standPct}%`,
                            background: standing >= 15 ? '#ef4444' : standing > 8 ? '#f59e0b' : '#8b5cf6',
                            transition: 'width 0.5s ease',
                            boxShadow: standing >= 15 ? '0 0 6px rgba(239,68,68,0.5)' : 'none',
                          }} />
                        </div>
                      </div>

                      {/* Alert if standing is at max */}
                      {standing >= 15 && (
                        <div style={{
                          fontSize: 10, fontWeight: 700, color: '#dc2626',
                          display: 'flex', alignItems: 'center', gap: 4,
                          animation: 'standingAlert 1s ease-in-out infinite',
                        }}>
                          ⚠️ Standing capacity full — do not board!
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Start / Stop ── */}
      <button
        onClick={() => running ? handleStop() : handleStart()}
        style={{
          width: '100%',
          padding: '14px',
          borderRadius: 12,
          border: 'none',
          background: running
            ? 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)'
            : 'linear-gradient(135deg, #059669 0%, #047857 100%)',
          color: 'white',
          fontSize: 15,
          fontWeight: 800,
          letterSpacing: 0.5,
          cursor: 'pointer',
          boxShadow: running
            ? '0 4px 14px rgba(220,38,38,0.35)'
            : '0 4px 14px rgba(5,150,105,0.35)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          transition: 'all 0.25s',
        }}
      >
        {running ? (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <rect x="5" y="3" width="4" height="18" rx="1"/>
              <rect x="15" y="3" width="4" height="18" rx="1"/>
            </svg>
            STOP SIMULATION
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="white">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            START GPS SIMULATION
          </>
        )}
      </button>

      {!running && (
        <p style={{ textAlign: 'center', fontSize: 11, color: '#94a3b8', margin: '-6px 0 0' }}>
          Demo mode — no database connection required
        </p>
      )}
    </div>
  )
}

// ─── Main RouteTimeline Component ────────────────────────────────────────────
/**
 * RouteTimeline — shows the route stops as a vertical timeline.
 * Toggle between two simulation views:
 *   Sim 1 — occupancy bars (connected to real bus data)
 *   Sim 2 — standalone GPS fleet demo (no props needed)
 */
export default function RouteTimeline({
  stops = [],
  source,
  destination,
  currentStop,
  currentOccupancy = 0,
  capacity = 40,
  leavingCount = 0,
  speed = 0,
}) {
  const [simMode, setSimMode] = useState(1)

  // Build a unified node list: [source, ...stops, destination]
  const allNodes = useMemo(() => {
    const nodes = []
    if (source) {
      nodes.push({ id: 'source', name: source, arrival_time: stops[0]?.arrival_time || '', isEndpoint: true, isSource: true })
    }
    stops.forEach((s) => {
      nodes.push({ id: s.id, name: s.name, arrival_time: s.arrival_time, order: s.order, isEndpoint: false, price: s.price })
    })
    if (destination && destination !== source) {
      nodes.push({ id: 'dest', name: destination, arrival_time: '', isEndpoint: true, isDest: true })
    }
    return nodes
  }, [stops, source, destination])

  const currentIdx = useMemo(() => {
    if (!currentStop) return -1
    return allNodes.findIndex(n => n.name?.toLowerCase() === currentStop?.toLowerCase())
  }, [allNodes, currentStop])

  const getOccupancyAt = (idx) => {
    if (allNodes.length <= 1) return currentOccupancy
    if (idx < currentIdx) return Math.min(Math.round(currentOccupancy * (1 + (currentIdx - idx) * 0.08)), capacity)
    if (idx === currentIdx) return currentOccupancy
    return Math.max(currentOccupancy - (idx - currentIdx) * Math.round(leavingCount * 0.6), 0)
  }

  const getOccupancyColor = (occ) => {
    const pct = capacity > 0 ? (occ / capacity) * 100 : 0
    if (pct >= 85) return { bar: '#ef4444', bg: '#fee2e2', text: '#991b1b', label: 'Packed' }
    if (pct >= 60) return { bar: '#f59e0b', bg: '#fef3c7', text: '#92400e', label: 'Moderate' }
    return { bar: '#10b981', bg: '#dcfce7', text: '#065f46', label: 'Spacious' }
  }

  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #064e3b 0%, #059669 100%)', padding: '16px 20px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🗺️ Route Timeline</h4>
            <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.85 }}>
              {simMode === 1
                ? `${source || '—'} → ${destination || '—'} · ${stops.length} stops`
                : 'GPS Fleet Demo · 4 buses · Standalone mode'}
            </p>
          </div>
          {/* Sim toggle */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[1, 2].map(n => (
              <button
                key={n}
                onClick={() => setSimMode(n)}
                style={{
                  padding: '6px 14px', fontSize: 12, fontWeight: 700,
                  borderRadius: 20, border: 'none', cursor: 'pointer',
                  background: simMode === n ? 'white' : 'rgba(255,255,255,0.2)',
                  color: simMode === n ? '#059669' : 'white',
                  transition: 'all 0.2s', letterSpacing: 0.3,
                }}
              >
                Sim {n}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── SIM 1: Occupancy bar view (real data) ── */}
      {simMode === 1 && (
        <>
          {allNodes.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: '#94a3b8', fontSize: 13 }}>
              Select a bus with an active route to see the timeline.
            </div>
          ) : (
            <>
              {/* Legend */}
              <div style={{ display: 'flex', gap: 16, padding: '10px 20px', background: '#f0fdf4', borderBottom: '1px solid #dcfce7', flexWrap: 'wrap' }}>
                {[
                  { color: '#10b981', label: 'Spacious (<60%)' },
                  { color: '#f59e0b', label: 'Moderate (60–85%)' },
                  { color: '#ef4444', label: 'Packed (>85%)' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                    <span style={{ fontSize: 11, color: '#6b7280' }}>{label}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', border: '2px solid #1d4ed8' }} />
                  <span style={{ fontSize: 11, color: '#6b7280' }}>Bus is here</span>
                </div>
              </div>

              {/* Timeline */}
              <div style={{ padding: '16px 20px', maxHeight: 520, overflowY: 'auto' }}>
                {allNodes.map((node, idx) => {
                  const occ = getOccupancyAt(idx)
                  const pct = capacity > 0 ? Math.round((occ / capacity) * 100) : 0
                  const colors = getOccupancyColor(occ)
                  const isCurrent = idx === currentIdx
                  const isPast = idx < currentIdx

                  return (
                    <div key={node.id} style={{ display: 'flex', gap: 12 }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 20, flexShrink: 0 }}>
                        <div style={{ width: 2, flex: idx === 0 ? '0 0 12px' : '0 0 16px', background: idx === 0 ? 'transparent' : (isPast ? '#d1d5db' : '#e5e7eb') }} />
                        <div style={{
                          width: isCurrent ? 18 : node.isEndpoint ? 14 : 12,
                          height: isCurrent ? 18 : node.isEndpoint ? 14 : 12,
                          borderRadius: '50%',
                          background: isCurrent ? '#2563eb' : node.isEndpoint ? '#1e3a5f' : (isPast ? '#9ca3af' : colors.bar),
                          border: isCurrent ? '3px solid #93c5fd' : node.isEndpoint ? '3px solid #374151' : '2px solid white',
                          boxShadow: isCurrent ? '0 0 0 4px rgba(37,99,235,0.2)' : 'none',
                          transition: 'all 0.3s ease', zIndex: 1, flexShrink: 0,
                          animation: isCurrent ? 'currentStopPulse 2s ease-in-out infinite' : 'none',
                        }} />
                        <div style={{ width: 2, flex: 1, background: idx === allNodes.length - 1 ? 'transparent' : (isPast ? '#d1d5db' : '#e5e7eb'), minHeight: 24 }} />
                      </div>

                      <div style={{ flex: 1, paddingBottom: idx < allNodes.length - 1 ? 8 : 0 }}>
                        <div style={{
                          background: isCurrent ? '#eff6ff' : isPast ? '#f9fafb' : 'white',
                          border: isCurrent ? '2px solid #3b82f6' : `1px solid ${isPast ? '#e5e7eb' : '#f1f5f9'}`,
                          borderRadius: 10, padding: '10px 14px',
                          marginTop: idx === 0 ? 4 : 8, transition: 'all 0.3s ease',
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                            <div>
                              {isCurrent && (
                                <span style={{ display: 'inline-block', background: '#2563eb', color: 'white', fontSize: 9, fontWeight: 700, padding: '2px 7px', borderRadius: 10, marginBottom: 4, letterSpacing: 0.5 }}>
                                  🚌 BUS HERE
                                </span>
                              )}
                              <span style={{ fontSize: node.isEndpoint ? 14 : 13, fontWeight: node.isEndpoint || isCurrent ? 700 : 500, color: isPast ? '#9ca3af' : '#111827' }}>
                                {node.isSource ? '🟢' : node.isDest ? '🏁' : `${idx}.`} {node.name}
                              </span>
                              {node.price > 0 && <span style={{ fontSize: 10, color: '#6b7280', marginTop: 1, display: 'block' }}>₹{node.price} fare</span>}
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              {node.arrival_time && (
                                <div style={{ fontSize: 12, fontWeight: 700, color: isCurrent ? '#2563eb' : isPast ? '#9ca3af' : '#374151' }}>
                                  🕐 {node.arrival_time}
                                </div>
                              )}
                              {!node.isEndpoint && (
                                <span style={{ display: 'inline-block', marginTop: 3, fontSize: 10, fontWeight: 600, color: colors.text, background: colors.bg, padding: '1px 6px', borderRadius: 6 }}>
                                  {colors.label}
                                </span>
                              )}
                            </div>
                          </div>
                          {!node.isEndpoint && (
                            <div>
                              <div style={{ height: 6, background: '#f1f5f9', borderRadius: 3, overflow: 'hidden', marginTop: 4 }}>
                                <div style={{ height: '100%', width: `${pct}%`, background: isPast ? '#d1d5db' : colors.bar, borderRadius: 3, transition: 'width 0.5s ease' }} />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
                                <span style={{ fontSize: 9, color: '#9ca3af' }}>{occ}/{capacity} seats</span>
                                <span style={{ fontSize: 9, color: isPast ? '#9ca3af' : colors.bar, fontWeight: 700 }}>{pct}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          )}
        </>
      )}

      {/* ── SIM 2: Standalone fleet demo ── */}
      {simMode === 2 && <FleetDemo />}

      <style>{`
        @keyframes currentStopPulse {
          0%, 100% { box-shadow: 0 0 0 4px rgba(37,99,235,0.2); }
          50% { box-shadow: 0 0 0 8px rgba(37,99,235,0.1); }
        }
        @keyframes standingAlert {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.45; }
        }
      `}</style>
    </div>
  )
}
