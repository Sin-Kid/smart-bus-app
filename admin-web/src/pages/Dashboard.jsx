// src/pages/Dashboard.jsx
import React from "react";
import { Link } from "react-router-dom";

export default function Dashboard() {
  return (
    <div className="dashboard-grid">

      {/* HERO SECTION */}
      <section className="panel hero panel-hero">
        <div className="hero-left">
          <h2>Welcome Admin</h2>
          <p className="muted">
            Manage stops, routes, and monitor logs in real time.
          </p>

          <div className="hero-actions">
            <Link to="/stops" className="btn">Manage Stops</Link>
            <Link to="/routes" className="btn secondary">Manage Routes</Link>
            <Link to="/logs" className="btn secondary">View Logs</Link>
          </div>
        </div>

        {/* Right side kept clean for now */}
        <div className="hero-right clean-stats">
          <div className="stat clean">
            <div className="stat-value">—</div>
            <div className="stat-label">Active buses</div>
          </div>
          <div className="stat clean">
            <div className="stat-value">—</div>
            <div className="stat-label">Telemetry</div>
          </div>
          <div className="stat clean">
            <div className="stat-value">—</div>
            <div className="stat-label">Routes</div>
          </div>
        </div>
      </section>

      {/* EMPTY SECTIONS (WAITING FOR REAL DATA) */}

      <section className="panel grid-card">
        <h3>Recent Alerts</h3>
        <p className="muted" style={{ marginTop: 6 }}>
          No alerts available. System will display alerts here once generated.
        </p>
      </section>

      <section className="panel grid-card">
        <h3>Quick Links</h3>
        <div className="quick-links">
          <Link className="quick" to="/stops">Edit Stops</Link>
          <Link className="quick" to="/routes">Edit Routes</Link>
          <Link className="quick" to="/logs">Open Logs</Link>
        </div>
      </section>

      <section className="panel grid-card">
        <h3>System</h3>
        <p className="muted" style={{ marginTop: 6 }}>
          System metrics will appear here when backend integrations are added.
        </p>
      </section>

    </div>
  );
}
