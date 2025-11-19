// src/components/Sidebar.jsx
import React, { useState } from "react";
import { NavLink } from "react-router-dom";
import { Home, MapPin, List, Activity, Menu } from "lucide-react";
import ThemeToggle from "./ThemeToggle";

const items = [
  { to: "/", label: "Home", Icon: Home, color: "linear-gradient(135deg,#7dd3fc,#60a5fa)" },
  { to: "/stops", label: "Stops", Icon: MapPin, color: "linear-gradient(135deg,#fbcfe8,#fda4af)" },
  { to: "/routes", label: "Routes", Icon: List, color: "linear-gradient(135deg,#fde68a,#fca5a5)" },
  { to: "/logs", label: "Logs", Icon: Activity, color: "linear-gradient(135deg,#bbf7d0,#86efac)" },
];

export default function Sidebar() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="sidebar-top">
          <div className="brand">
            <div className="logo">SB</div>
            <div className="brand-text">
              <div className="brand-name">SmartBus</div>
              <div className="brand-sub">Admin</div>
            </div>
          </div>

          <button className="hambtn" onClick={() => setOpen((v) => !v)} aria-label="Toggle menu">
            <Menu size={18} />
          </button>
        </div>

        <nav className="nav-list" role="navigation">
          {items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.to === "/"}
              className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}
            >
              <span className="icon-chip" style={{ backgroundImage: it.color }}>
                <it.Icon size={18} className="nav-icon" />
              </span>
              <span className="nav-label">{it.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <ThemeToggle />
          <div className="version">v0.1</div>
        </div>
      </aside>

      {/* mobile overlay to close drawer when clicking outside */}
      <div className={`sidebar-backdrop ${open ? "visible" : ""}`} onClick={() => setOpen(false)} />
    </>
  );
}
