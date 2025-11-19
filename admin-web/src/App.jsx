// src/App.jsx
import React from "react";
import { Routes, Route } from "react-router-dom";
import { ThemeProvider } from "./context/ThemeContext";
import Sidebar from "./components/Sidebar";
import Dashboard from "./pages/Dashboard";
import StopsPage from "./pages/StopsPage";
import RoutesPage from "./pages/RoutesPage";
import LogsPage from "./pages/LogsPage";
import "./styles.css"; 

export default function App() {
  return (
    <ThemeProvider>
      <div className="app-frame">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/stops" element={<StopsPage />} />
            <Route path="/routes" element={<RoutesPage />} />
            <Route path="/logs" element={<LogsPage />} />
          </Routes>
        </main>
      </div>
    </ThemeProvider>
  );
}
