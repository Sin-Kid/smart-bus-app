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
  const [logs, setLogs] = useState([]);            // array newest-first
  const [busFilter, setBusFilter] = useState('');  // empty = all
  const [limitCount, setLimitCount] = useState(100);
  const [paused, setPaused] = useState(false);

  const listRef = useRef();

  useEffect(() => {
    setLogs([]); // reset when filters change
    if (paused) return; // no subscription when paused

    const fetchLogs = async () => {
      let query = supabase
        .from('telemetry')
        .select('*')
        .order('timestamp', { ascending: false })
        .limit(limitCount);

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
      const subscription = supabase
        .channel('telemetry_changes')
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'telemetry'
        }, () => {
          fetchLogs();
        })
        .subscribe();

      return () => {
        subscription.unsubscribe();
      };
    }
  }, [busFilter, limitCount, paused]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ marginBottom: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
        <input
          placeholder="Filter by busId (e.g. bus-101)"
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
        <button onClick={() => setPaused((p) => !p)} style={{ padding: '8px 10px' }}>
          {paused ? 'Resume' : 'Pause'}
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
                padding: 8,
                borderRadius: 6,
                background: '#fafafa',
                border: '1px solid #eee',
                boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.02)',
                fontSize: 13,
              }}
            >
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

              <details style={{ marginTop: 6 }}>
                <summary style={{ cursor: 'pointer', color: '#555' }}>Raw</summary>
                <pre style={{ whiteSpace: 'pre-wrap', margin: 6, fontSize: 12 }}>
                  {JSON.stringify(l, null, 2)}
                </pre>
              </details>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
