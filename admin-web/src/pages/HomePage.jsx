// src/pages/HomePage.jsx
import React from 'react'
import { Link } from 'react-router-dom'

export default function HomePage(){
  return (
    <div style={{display:'grid', gridTemplateColumns:'1fr 320px', gap:12}}>
      <section style={{padding:12, background:'#fff', borderRadius:8}}>
        <h2>Welcome</h2>
        <p>Use the sidebar links to manage stops, routes and view telemetry logs.</p>
        <ul>
          <li><Link to="/stops">Manage Stops (map)</Link></li>
          <li><Link to="/routes">Manage Routes</Link></li>
          <li><Link to="/logs">View Live Logs</Link></li>
        </ul>
      </section>

      <aside style={{padding:12, background:'#fff', borderRadius:8}}>
        <h3>Quick actions</h3>
        <ol>
          <li>Go to <Link to="/stops">Stops</Link></li>
          <li>Go to <Link to="/routes">Routes</Link></li>
          <li>Go to <Link to="/logs">Logs</Link></li>
        </ol>
      </aside>
    </div>
  )
}
