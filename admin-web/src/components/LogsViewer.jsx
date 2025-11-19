// src/components/LogsViewer.jsx
import React, { useEffect, useState, useRef } from 'react';
import {
  collection,
  query,
  orderBy,
  limit,
  onSnapshot,
  where
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

// Utility: format timestamp if present
function fmtTs(t) {
  if (!t) return '-';
  try {
    if (t.toDate) return t.toDate().toLocaleString();
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

    // NOTE: change 'telemetry' to your actual telemetry collection path if different
    const colRef = collection(db, 'telemetry');
    let q;

    // base query: newest first
    q = query(colRef, orderBy('ts', 'desc'), limit(limitCount));

    // apply bus filter if present
    if (busFilter && busFilter.trim()) {
      // use where('busId', '==', busFilter) and then order/limit
      q = query(colRef, where('busId', '==', busFilter.trim()), orderBy('ts', 'desc'), limit(limitCount));
    }

    const unsub = onSnapshot(q, (snap) => {
      const arr = [];
      snap.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      // snap comes in descending ts (we used orderBy desc); keep that
      setLogs(arr);
      // auto-scroll to top where newest items are (because desc)
      if (listRef.current) {
        // small timeout to allow render
        setTimeout(() => {
          listRef.current.scrollTop = 0;
        }, 50);
      }
    }, (err) => {
      console.error('Logs subscription error:', err);
    });

    return () => unsub();
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
                  <strong style={{ color: '#0b5cff' }}>{l.busId || '—'}</strong>
                  <span style={{ marginLeft: 8, color: '#666' }}>{fmtTs(l.ts)}</span>
                </div>
                <div style={{ color: '#333' }}>
                  <span style={{ marginRight: 12 }}>speed: <strong>{l.speed ?? '-'}</strong></span>
                </div>
              </div>

              <div style={{ marginTop: 6 }}>
                <small style={{ color: '#444' }}>
                  lat: {l.lat ?? '-'}, lon: {l.lon ?? '-'}
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
