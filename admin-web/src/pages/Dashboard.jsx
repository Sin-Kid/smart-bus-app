// src/pages/Dashboard.jsx
import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../supabaseConfig";

export default function Dashboard() {
  const [stats, setStats] = useState({ buses: 0, routes: 0, stops: 0, schedules: 0 });

  useEffect(() => {
    async function loadStats() {
      const { count: cBuses } = await supabase.from("buses").select("*", { count: "exact", head: true });
      const { count: cRoutes } = await supabase.from("bus_routes").select("*", { count: "exact", head: true });
      const { count: cStops } = await supabase.from("bus_stops").select("*", { count: "exact", head: true });
      const { count: cSchedules } = await supabase.from("bus_schedules").select("*", { count: "exact", head: true });

      setStats({
        buses: cBuses || 0,
        routes: cRoutes || 0,
        stops: cStops || 0,
        schedules: cSchedules || 0
      });
    }
    loadStats();
  }, []);

  return (
    <div className="page-container">
      <div className="page-header">
        <h2>Dashboard</h2>
        <p className="page-subtitle">Overview of your transit system.</p>
      </div>

      <div className="stats-grid">
        <div className="card">
          <h3>Buses</h3>
          <p className="stat-value">{stats.buses}</p>
          <Link to="/buses" className="btn-small">Manage</Link>
        </div>
        <div className="card">
          <h3>Routes</h3>
          <p className="stat-value">{stats.routes}</p>
          <Link to="/routes" className="btn-small">Manage</Link>
        </div>
        <div className="card">
          <h3>Stops</h3>
          <p className="stat-value">{stats.stops}</p>
          <Link to="/routes" className="btn-small">Manage</Link>
        </div>
        <div className="card">
          <h3>Schedules</h3>
          <p className="stat-value">{stats.schedules}</p>
          <Link to="/schedules" className="btn-small">Manage</Link>
        </div>
      </div>

      <div className="section">
        <h3>Quick Links</h3>
        <div className="quick-links">
          <Link to="/status" className="btn-primary">View Live Status</Link>
          <Link to="/buses" className="btn-secondary">Add New Bus</Link>
          <Link to="/routes" className="btn-secondary">Add New Route</Link>
        </div>
      </div>
    </div>
  );
}
