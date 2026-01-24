// src/components/LogsViewer.jsx
import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../supabaseConfig';

// Utility: format timestamp if present
function fmtTs(t) {
  if (!t) return '-';
  try {
    return new Date(t).toLocaleString();
  } catch (e) {
    return String(t);
  }
}

export default function LogsViewer() {
  const [logType, setLogType] = useState('telemetry'); // 'telemetry' | 'trips'
  const [logs, setLogs] = useState([]);            // array newest-first
  const [busFilter, setBusFilter] = useState('');  // empty = all
  const [limitCount, setLimitCount] = useState(100);
  const [paused, setPaused] = useState(false);

  const listRef = useRef();

  useEffect(() => {
    setLogs([]); // reset when filters change
    if (paused) return; // no subscription when paused

    const fetchLogs = async () => {
      let query;

      if (logType === 'telemetry') {
        query = supabase
          .from('telemetry')
          .select('*')
          .order('timestamp', { ascending: false })
          .limit(limitCount);
      } else {
        // Fetch Trips (Passenger Logs)
        // Note: Joining with 'cards' to get names requires a foreign key relationship in Supabase
        query = supabase
          .from('trips')
          .select('*, cards(name, card_number)')
          .order('start_time', { ascending: false })
          .limit(limitCount);
      }

      // apply bus filter if present
      if (busFilter && busFilter.trim()) {
        query = query.eq('bus_id', busFilter.trim());
      }

      const { data, error } = await query;
      if (error) {
        console.error('Logs fetch error:', error);
        return;
      }
      setLogs(data || []);

      // auto-scroll to top where newest items are
      if (listRef.current) {
        setTimeout(() => {
          listRef.current.scrollTop = 0;
        }, 50);
      }
    };

    fetchLogs();

    if (!paused) {
      const channelName = logType === 'telemetry' ? 'telemetry_changes' : 'trips_changes';
      const tableName = logType === 'telemetry' ? 'telemetry' : 'trips';

      const subscription = supabase
        .channel(channelName)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: tableName
        }, () => {
          fetchLogs();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [logType, busFilter, limitCount, paused]);

  // Export to CSV Function
  const exportToCSV = () => {
    if (!logs.length) return alert("No data to export");

    // Define headers based on logType
    let headers = [];
    let rows = [];

    if (logType === 'telemetry') {
      headers = ['Timestamp', 'Bus ID', 'Speed', 'Lat', 'Lon'];
      rows = logs.map(l => [
        l.timestamp,
        l.bus_id,
        l.speed,
        l.location?.lat || l.lat,
        l.location?.lon || l.lon
      ]);
    } else {
      headers = ['Start Time', 'Bus ID', 'Card Name', 'Card Number', 'Fare', 'Status'];
      rows = logs.map(l => [
        l.start_time,
        l.bus_id,
        l.cards?.name || 'Unknown',
        l.cards?.card_number || l.card_id,
        l.fare,
        l.status
      ]);
    }

    // Convert to CSV string
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(item => `"${String(item || '').replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    // Trigger Download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${logType}_export_${new Date().toISOString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* View Toggle */}
      <div style={{ marginBottom: 12, display: 'flex', gap: 10 }}>
        <button
          onClick={() => setLogType('telemetry')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: logType === 'telemetry' ? '#0b5cff' : '#eee',
            color: logType === 'telemetry' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Telemetry
        </button>
        <button
          onClick={() => setLogType('trips')}
          style={{
            padding: '8px 16px',
            borderRadius: 6,
            border: 'none',
            background: logType === 'trips' ? '#0b5cff' : '#eee',
            color: logType === 'trips' ? 'white' : '#333',
            cursor: 'pointer',
            fontWeight: '600'
          }}
        >
          Passenger Trips
        </button>
      </div>

      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Filter by busId..."
          value={busFilter}
          onChange={(e) => setBusFilter(e.target.value)}
          style={{ flex: 1, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <input
          type="number"
          min={10}
          max={1000}
          value={limitCount}
          onChange={(e) => setLimitCount(Number(e.target.value))}
          style={{ width: 80, padding: 8, borderRadius: 6, border: '1px solid #ccc' }}
        />
        <button onClick={() => setPaused((p) => !p)} style={{ padding: '8px 10px', borderRadius: 6, border: '1px solid #ccc', cursor: 'pointer' }}>
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button onClick={exportToCSV} style={{ padding: '8px 12px', background: '#28a745', color: 'white', borderRadius: 6, border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
          ⬇ Export CSV
        </button>
      </div>

      <div
        ref={listRef}
        style={{
          flex: 1,
          background: '#fff',
          borderRadius: 8,
          border: '1px solid #ddd',
          padding: 8,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {logs.length === 0 ? (
          <div style={{ color: '#666', padding: 12 }}>No logs yet (or filtered out).</div>
        ) : (
          logs.map((l) => (
            <div
              key={l.id}
              style={{
                padding: 10,
                borderRadius: 6,
                background: logType === 'trips' ? '#f0f9ff' : '#fafafa',
                border: '1px solid #eee',
                boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.02)',
                fontSize: 13,
              }}
            >
              {logType === 'telemetry' ? (
                // Telemetry Row
                <>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div>
                      <strong style={{ color: '#0b5cff' }}>{l.bus_id || '—'}</strong>
                      <span style={{ marginLeft: 8, color: '#666' }}>{fmtTs(l.timestamp)}</span>
                    </div>
                    <div style={{ color: '#333' }}>
                      <span style={{ marginRight: 12 }}>speed: <strong>{l.speed ?? '-'}</strong></span>
                    </div>
                  </div>
                  <div style={{ marginTop: 6 }}>
                    <small style={{ color: '#444' }}>
                      lat: {l.location?.lat ?? l.lat ?? '-'}, lon: {l.location?.lon ?? l.lon ?? '-'}
                    </small>
                  </div>
                </>
              ) : (
                // Trip Row
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div>
                    <strong style={{ color: '#007bff' }}>{l.cards?.name || 'Unknown User'}</strong>
                    <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>Bus: {l.bus_id} • {fmtTs(l.start_time)}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'bold', color: l.status === 'completed' ? 'green' : 'orange' }}>
                      {l.status?.toUpperCase()}
                    </div>
                    <div style={{ fontSize: 11 }}>Fare: ₹{l.fare}</div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
