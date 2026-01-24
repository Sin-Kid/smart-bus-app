import React, { useEffect, useState } from 'react'

export default function TimePicker({ value, onChange, required = false }) {
    const [hours, setHours] = useState('12')
    const [minutes, setMinutes] = useState('00')
    const [period, setPeriod] = useState('AM')

    // Sync internal state with external value (HH:MM 24h format)
    useEffect(() => {
        if (value) {
            const [h, m] = value.split(':')
            let hNum = parseInt(h, 10)
            const p = hNum >= 12 ? 'PM' : 'AM'

            if (hNum > 12) hNum -= 12
            if (hNum === 0) hNum = 12

            setHours(hNum.toString().padStart(2, '0'))
            setMinutes(m)
            setPeriod(p)
        }
    }, [value])

    const updateTime = (newH, newM, newP) => {
        let h = parseInt(newH, 10)
        if (newP === 'PM' && h !== 12) h += 12
        if (newP === 'AM' && h === 12) h = 0

        const timeString = `${h.toString().padStart(2, '0')}:${newM}`
        onChange(timeString)
    }

    const handleHourChange = (e) => {
        const h = e.target.value
        setHours(h)
        updateTime(h, minutes, period)
    }

    const handleMinuteChange = (e) => {
        const m = e.target.value
        setMinutes(m)
        updateTime(hours, m, period)
    }

    const handlePeriodChange = (e) => {
        const p = e.target.value
        setPeriod(p)
        updateTime(hours, minutes, p)
    }

    return (
        <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
            <select value={hours} onChange={handleHourChange} style={styles.select}>
                {Array.from({ length: 12 }, (_, i) => i + 1).map(h => (
                    <option key={h} value={h.toString().padStart(2, '0')}>
                        {h.toString().padStart(2, '0')}
                    </option>
                ))}
            </select>
            <span>:</span>
            <select value={minutes} onChange={handleMinuteChange} style={styles.select}>
                {Array.from({ length: 60 }, (_, i) => i).map(m => (
                    <option key={m} value={m.toString().padStart(2, '0')}>
                        {m.toString().padStart(2, '0')}
                    </option>
                ))}
            </select>
            <select value={period} onChange={handlePeriodChange} style={styles.select}>
                <option value="AM">AM</option>
                <option value="PM">PM</option>
            </select>
        </div>
    )
}

const styles = {
    select: {
        padding: '8px',
        borderRadius: '4px',
        border: '1px solid #ccc',
        backgroundColor: 'white',
        fontSize: '14px'
    }
}
