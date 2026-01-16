import React, { useRef, useEffect, useState } from 'react'

export default function TimePicker({ value, onChange, onClose }) {
    // Parse initial value (e.g., "08:30 AM")
    const parseTime = (timeStr) => {
        if (!timeStr) return { hour: '08', minute: '30', meridian: 'AM' }
        const [time, meridian] = timeStr.split(' ')
        const [hour, minute] = time.split(':')
        return { hour, minute, meridian }
    }

    const initial = parseTime(value)
    const [hour, setHour] = useState(initial.hour)
    const [minute, setMinute] = useState(initial.minute)
    const [meridian, setMeridian] = useState(initial.meridian)

    // Generate arrays
    const hours = Array.from({ length: 12 }, (_, i) => (i + 1).toString().padStart(2, '0'))
    const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'))
    const meridians = ['AM', 'PM']

    const handleSave = () => {
        onChange(`${hour}:${minute} ${meridian}`)
        onClose()
    }

    // Scroll logic is tricky to get perfect "snap" without libraries, 
    // but we can simulate it with CSS scroll-snap.

    const ScrollColumn = ({ options, selected, onSelect }) => {
        const rootRef = useRef(null)

        // Scroll to selected on mount
        useEffect(() => {
            if (rootRef.current) {
                const index = options.indexOf(selected)
                if (index > -1) {
                    rootRef.current.scrollTop = index * 40
                }
            }
        }, [])

        // Use a timeout ref to prevent rapid updates if needed, 
        // but for "instant" feel we can try direct update.
        const handleScroll = (e) => {
            const index = Math.round(e.target.scrollTop / 40)
            if (options[index] && options[index] !== selected) {
                onSelect(options[index])
            }
        }

        // Handle click to select
        const handleClick = (opt, index) => {
            // onSelect(opt) // Let scroll handler do the selection update after smooth scroll
            if (rootRef.current) {
                rootRef.current.scrollTo({
                    top: index * 40,
                    behavior: 'smooth'
                })
            }
        }

        return (
            <div
                ref={rootRef}
                onScroll={handleScroll}
                style={{
                    height: '120px',
                    overflowY: 'auto',
                    scrollSnapType: 'y mandatory',
                    width: '60px',
                    background: 'transparent',
                    textAlign: 'center',
                    scrollbarWidth: 'none', // Firefox
                    msOverflowStyle: 'none', // IE/Edge
                    position: 'relative',
                    zIndex: 2
                }}
                className="hide-scrollbar"
            >
                <style>{`
          .hide-scrollbar::-webkit-scrollbar {
            display: none;
          }
        `}</style>
                {/* Padding to allow scrolling top/bottom items to center */}
                <div style={{ height: '40px' }}></div>
                {options.map((opt, i) => (
                    <div
                        key={opt}
                        onClick={() => handleClick(opt, i)}
                        style={{
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            scrollSnapAlign: 'center',
                            fontSize: opt === selected ? '18px' : '14px',
                            fontWeight: opt === selected ? 'bold' : 'normal',
                            color: opt === selected ? '#2563eb' : '#94a3b8',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {opt}
                    </div>
                ))}
                <div style={{ height: '40px' }}></div>
            </div>
        )
    }

    return (
        <div style={{
            background: 'white',
            borderRadius: '12px',
            padding: '20px',
            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #e2e8f0',
            display: 'inline-flex',
            flexDirection: 'column',
            gap: '16px',
            alignItems: 'center'
        }}>
            <div style={{ fontSize: '14px', fontWeight: '600', color: '#64748b' }}>Select Time</div>

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
                {/* Un-scrollable highlight bar to show selection area */}
                <div style={{
                    position: 'absolute',
                    top: '50%',
                    left: 0,
                    right: 0,
                    height: '40px',
                    transform: 'translateY(-50%)',
                    background: '#eff6ff',
                    borderRadius: '8px',
                    pointerEvents: 'none',
                    zIndex: 0
                }}></div>

                <div style={{ zIndex: 1 }}><ScrollColumn options={hours} selected={hour} onSelect={setHour} /></div>
                <div style={{ fontWeight: 'bold', color: '#cbd5e1', zIndex: 1 }}>:</div>
                <div style={{ zIndex: 1 }}><ScrollColumn options={minutes} selected={minute} onSelect={setMinute} /></div>
                <div style={{ zIndex: 1 }}><ScrollColumn options={meridians} selected={meridian} onSelect={setMeridian} /></div>
            </div>

            <div style={{ display: 'flex', gap: '10px', width: '100%' }}>
                <button
                    type="button"
                    onClick={handleSave}
                    className="btn-primary"
                    style={{ flex: 1, padding: '8px', fontSize: '13px' }}
                >
                    Set Time
                </button>
            </div>
        </div>
    )
}
