// src/components/BusSeatMap.jsx
import React, { useEffect, useRef } from 'react'

const SEAT_CAP    = 52
const STAND_CAP   = 15
const TOTAL_CAP   = SEAT_CAP + STAND_CAP  // 67

const SEAT_STATES = {
  FREE:     'free',
  OCCUPIED: 'occupied',
  LEAVING:  'leaving',
}

const SEAT_COLORS = {
  [SEAT_STATES.FREE]:     { bg: '#d1fae5', border: '#6ee7b7', backBar: '#6ee7b7' },
  [SEAT_STATES.OCCUPIED]: { bg: '#fee2e2', border: '#fca5a5', backBar: '#fca5a5' },
  [SEAT_STATES.LEAVING]:  { bg: '#fef3c7', border: '#fcd34d', backBar: '#fcd34d' },
}

/**
 * Build seat array for the 52 physical seats.
 * occupied here = number of SEATED passengers (= min(total_pax, 52))
 */
function buildSeatData(seatOccupied, leaving) {
  const seats = []
  const safeLeaving = Math.min(leaving || 0, seatOccupied || 0)
  for (let i = 1; i <= SEAT_CAP; i++) {
    if (i <= safeLeaving)        seats.push({ id: i, state: SEAT_STATES.LEAVING })
    else if (i <= seatOccupied)  seats.push({ id: i, state: SEAT_STATES.OCCUPIED })
    else                         seats.push({ id: i, state: SEAT_STATES.FREE })
  }
  return seats
}

function Seat({ state, number }) {
  const c = SEAT_COLORS[state]
  return (
    <div
      title={`Seat ${number} – ${state}`}
      style={{
        width: 52, height: 56, borderRadius: 8,
        backgroundColor: c.bg,
        border: `2px solid ${c.border}`,
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        fontSize: 10, fontWeight: 700, color: '#374151',
        transition: 'all 0.3s ease', flexShrink: 0,
      }}
    >
      <div style={{ width: '80%', height: 10, borderRadius: '4px 4px 0 0', backgroundColor: c.backBar, marginBottom: 3 }} />
      <span style={{ fontSize: 10, lineHeight: 1 }}>{number}</span>
    </div>
  )
}

/**
 * Render a single standing-person icon in the aisle.
 * isHigh → amber  |  isFull → red  |  else → purple
 */
function StandingPax({ index, isFull, isHigh, isLeaving }) {
  const color = isLeaving ? '#fbbf24' : isFull ? '#ef4444' : isHigh ? '#f59e0b' : '#8b5cf6'
  const delay = (index % 4) * 0.45
  return (
    <div
      title={`Standing passenger ${index}${isLeaving ? ' – Leaving next stop' : ''}`}
      style={{
        width: 18, height: 18,
        borderRadius: '50%',
        background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, flexShrink: 0,
        boxShadow: isLeaving ? '0 0 6px #fcd34d' : isFull ? `0 0 4px ${color}88` : 'none',
        transition: 'all 0.4s ease',
        animation: 'standSway 2s ease-in-out infinite',
        animationDelay: `${delay}s`,
      }}
    >
      <span style={{ lineHeight: 1 }}>🧍</span>
    </div>
  )
}

/**
 * BusSeatMap
 *
 * Props:
 *   capacity   – total seat capacity (default 52)
 *   occupied   – total passengers WITH tickets (seated + standing)
 *   leaving    – number predicted to leave at next stop
 *   busName    – display name
 *
 * Derived internally:
 *   seatOccupied = min(occupied, 52)
 *   standing     = max(0, occupied - 52)  capped at 15
 */
export default function BusSeatMap({ capacity = SEAT_CAP, occupied = 0, leaving = 0, busName = 'Bus' }) {
  const [showDiagram, setShowDiagram] = React.useState(false)

  // Derived counts
  const totalPax     = occupied                            // total passengers with tickets
  const seatOccupied = Math.min(totalPax, SEAT_CAP)       // those sitting
  const standing     = Math.min(Math.max(0, totalPax - SEAT_CAP), STAND_CAP)  // aisle standing
  const freeSeats    = SEAT_CAP - seatOccupied
  const percent      = TOTAL_CAP > 0 ? Math.round((totalPax / TOTAL_CAP) * 100) : 0

  // Calculate seated/standing leaving breakdown
  const standingLeaving = Math.min(leaving, standing)
  const seatedLeaving   = Math.max(0, leaving - standing)

  const isStandHigh  = standing > 8
  const isStandFull  = standing >= STAND_CAP

  const occupancyColor = percent >= 85 ? '#ef4444' : percent >= 60 ? '#f59e0b' : '#10b981'

  const seats = buildSeatData(seatOccupied, seatedLeaving)
  const rows  = []
  for (let i = 0; i < seats.length; i += 4) rows.push(seats.slice(i, i + 4))

  // Build standing passengers states (determine which ones are leaving)
  const standingPaxStates = []
  for (let i = 0; i < standing; i++) {
    standingPaxStates.push({ isLeaving: i < standingLeaving })
  }

  // Standing icons per row — distribute evenly across rows
  const standingRows = Array.from({ length: rows.length }, () => [])
  let paxIdx = 0
  for (let r = 0; r < rows.length && paxIdx < standing; r++) {
    standingRows[r].push(standingPaxStates[paxIdx++])
  }
  if (paxIdx < standing) {
    for (let r2 = Math.floor(rows.length / 4); r2 < rows.length && paxIdx < standing; r2++) {
      standingRows[r2].push(standingPaxStates[paxIdx++])
    }
  }

  const styleRef = useRef(null)
  useEffect(() => {
    if (styleRef.current) return
    const style = document.createElement('style')
    style.textContent = `
      @keyframes seatPulse {
        0%, 100% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.75; transform: scale(0.97); }
      }
      @keyframes standBlink {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
      }
      @keyframes standSway {
        0%, 100% { transform: translateY(0) scale(1); }
        50% { transform: translateY(-3px) scale(1.06); }
      }
    `
    document.head.appendChild(style)
    styleRef.current = style
  }, [])

  return (
    <div style={{ background: 'white', borderRadius: 16, overflow: 'hidden', border: '1px solid #e2e8f0', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%)', padding: '16px 20px', color: 'white' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h4 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>🚌 Seat Map — {busName}</h4>
            <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.85 }}>
              Digital twin · Live simulation · {SEAT_CAP} seats + {STAND_CAP} standing
            </p>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: '8px 14px', textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 800, lineHeight: 1 }}>{percent}%</div>
            <div style={{ fontSize: 10, opacity: 0.8, marginTop: 2 }}>{totalPax}/{TOTAL_CAP}</div>
          </div>
        </div>

        {/* Dual occupancy bar: seated (solid) + standing (stripe overlay) */}
        <div style={{ marginTop: 12, height: 8, background: 'rgba(255,255,255,0.2)', borderRadius: 4, overflow: 'hidden', position: 'relative' }}>
          {/* Seated fill */}
          <div style={{ position: 'absolute', left: 0, top: 0, height: '100%', width: `${(seatOccupied / TOTAL_CAP) * 100}%`, background: occupancyColor, borderRadius: 4, transition: 'width 0.5s ease' }} />
          {/* Standing overlay (purple) */}
          {standing > 0 && (
            <div style={{ position: 'absolute', left: `${(seatOccupied / TOTAL_CAP) * 100}%`, top: 0, height: '100%', width: `${(standing / TOTAL_CAP) * 100}%`, background: isStandFull ? '#ef4444' : '#8b5cf6', borderRadius: '0 4px 4px 0', transition: 'width 0.5s ease' }} />
          )}
        </div>
      </div>

      {/* Stats row — 5 columns */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', borderBottom: '1px solid #f1f5f9' }}>
        {[
          { label: 'Total Cap', value: TOTAL_CAP, color: '#6b7280' },
          { label: 'Seated',    value: seatOccupied, color: '#ef4444' },
          { label: 'Standing',  value: standing,     color: isStandFull ? '#ef4444' : '#8b5cf6' },
          { label: 'Leaving',   value: leaving,      color: '#f59e0b' },
          { label: 'Free Seats',value: freeSeats,    color: '#10b981' },
        ].map(({ label, value, color }) => (
          <div key={label} style={{ padding: '10px 4px', textAlign: 'center', borderRight: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: 18, fontWeight: 800, color }}>{value}</div>
            <div style={{ fontSize: 9, color: '#9ca3af', marginTop: 2, textTransform: 'uppercase', lineHeight: 1.2 }}>{label}</div>
          </div>
        ))}
      </div>

      {/* Standing alert banner */}
      {standing > 0 && (
        <div style={{
          padding: '6px 16px',
          background: isStandFull ? '#fee2e2' : isStandHigh ? '#fef3c7' : '#f5f3ff',
          borderBottom: `1px solid ${isStandFull ? '#fca5a5' : isStandHigh ? '#fde68a' : '#ddd6fe'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          fontSize: 11, fontWeight: 600,
          color: isStandFull ? '#dc2626' : isStandHigh ? '#d97706' : '#7c3aed',
          animation: isStandFull ? 'standBlink 1s ease-in-out infinite' : 'none',
        }}>
          <span>🧍 {standing} passenger{standing > 1 ? 's' : ''} standing in aisle</span>
          <span style={{
            fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 8,
            background: isStandFull ? '#dc2626' : isStandHigh ? '#d97706' : '#7c3aed',
            color: 'white',
          }}>
            {isStandFull ? 'AISLE FULL' : isStandHigh ? 'HIGH' : 'OK'} · {standing}/{STAND_CAP}
          </span>
        </div>
      )}

      {/* Legend */}
      <div style={{ display: 'flex', gap: 14, padding: '8px 16px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9', flexWrap: 'wrap', alignItems: 'center' }}>
        {[
          { color: '#d1fae5', border: '#6ee7b7', label: 'Free seat' },
          { color: '#fee2e2', border: '#fca5a5', label: 'Occupied seat' },
          { color: '#fef3c7', border: '#fcd34d', label: 'Leaving next stop' },
        ].map(({ color, border, label }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{ width: 12, height: 12, borderRadius: 3, background: color, border: `2px solid ${border}` }} />
            <span style={{ fontSize: 10, color: '#6b7280' }}>{label}</span>
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#8b5cf6' }} />
          <span style={{ fontSize: 10, color: '#6b7280' }}>Standing (aisle)</span>
        </div>
        <button
          onClick={() => setShowDiagram(true)}
          style={{
            marginLeft: 'auto', background: '#eff6ff', border: '1px dashed #3b82f6',
            borderRadius: 6, color: '#2563eb', padding: '3px 8px', fontSize: 10,
            fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4
          }}
        >
          📐 View Aisle Layout Diagram
        </button>
      </div>

      {/* Interactive Layout Diagram Modal */}
      {showDiagram && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: 24, animation: 'fadeIn 0.25s ease-out'
        }}>
          <div style={{
            background: 'white', borderRadius: 16, width: '100%', maxWidth: 640,
            padding: 24, display: 'flex', flexDirection: 'column', gap: 16,
            boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#1e3a5f' }}>
                📐 Aisle Standing Section Design
              </h3>
              <button
                onClick={() => setShowDiagram(false)}
                style={{
                  background: '#f1f5f9', border: 'none', width: 28, height: 28,
                  borderRadius: '50%', cursor: 'pointer', fontSize: 14, fontWeight: 700,
                  color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}
              >
                ✕
              </button>
            </div>
            <img
              src="/bus_aisle_standing_diagram.png"
              alt="Bus Aisle Standing Section Layout"
              style={{ width: '100%', height: 'auto', borderRadius: 8, border: '1px solid #e2e8f0' }}
            />
            <div style={{ fontSize: 11, color: '#64748b', lineHeight: 1.5, textAlign: 'center' }}>
              Shows 650mm wide central transit corridor layout with yellow passenger footprint markers, stanchions, and safety handrail designs.
            </div>
          </div>
        </div>
      )}

      {/* Bus body */}
      <div style={{ padding: '16px 12px', overflowX: 'auto' }}>
        <div style={{ minWidth: 320 }}>
          {/* Front door */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <div style={{ background: '#1e3a5f', color: 'white', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 1, whiteSpace: 'nowrap' }}>
              🚪 FRONT DOOR
            </div>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>

          {/* Driver seat */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 10, paddingRight: 4 }}>
            <div style={{ width: 52, height: 56, borderRadius: 8, background: '#dbeafe', border: '2px solid #93c5fd', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>
              🧑‍✈️
              <span style={{ fontSize: 9, color: '#1e40af', fontWeight: 700 }}>DRIVER</span>
            </div>
          </div>

          {/* Seat rows + aisle standing */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {rows.map((row, rowIdx) => (
              <div key={rowIdx} style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 310 }}>
                {/* Left pair */}
                <div style={{ display: 'flex', gap: 5 }}>
                  {row.slice(0, 2).map(seat => <Seat key={seat.id} state={seat.state} number={seat.id} />)}
                </div>

                {/* Aisle: standing passengers OR label */}
                <div style={{
                  minWidth: 36, flex: 1,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 2, position: 'relative',
                }}>
                  {rowIdx === 0 && (
                    <span style={{ fontSize: 8, color: '#d1d5db', fontWeight: 600, letterSpacing: 0.5, whiteSpace: 'nowrap' }}>AISLE</span>
                  )}
                  {/* Standing person icons for this row */}
                  {standingRows[rowIdx].map((pax, pi) => (
                    <StandingPax
                      key={pi}
                      index={rowIdx * 2 + pi + 1}
                      isFull={isStandFull}
                      isHigh={isStandHigh}
                      isLeaving={pax.isLeaving}
                    />
                  ))}
                </div>

                {/* Right pair */}
                <div style={{ display: 'flex', gap: 5 }}>
                  {row.slice(2, 4).map(seat => <Seat key={seat.id} state={seat.state} number={seat.id} />)}
                </div>

                {/* Row number */}
                <span style={{ fontSize: 9, color: '#cbd5e1', width: 22, textAlign: 'right', flexShrink: 0 }}>
                  R{rowIdx + 1}
                </span>
              </div>
            ))}
          </div>

          {/* Rear door */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 12, gap: 8 }}>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
            <div style={{ background: '#374151', color: 'white', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 20, letterSpacing: 1, whiteSpace: 'nowrap' }}>
              🚪 REAR DOOR
            </div>
            <div style={{ flex: 1, height: 1, background: '#e2e8f0' }} />
          </div>
        </div>
      </div>
    </div>
  )
}
