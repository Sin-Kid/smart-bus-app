// src/components/ThemeToggle.jsx
import React from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggle } = useTheme();

  return (
    <button
      onClick={toggle}
      aria-label="Toggle theme"
      className="theme-toggle"
    >
      <div className="toggle-track">
        <div className="toggle-thumb" />
      </div>

      {/* Icons */}
      <div className="theme-icons">
        <Sun
          size={16}
          className={`icon-sun ${theme === "light" ? "visible" : ""}`}
        />
        <Moon
          size={16}
          className={`icon-moon ${theme === "dark" ? "visible" : ""}`}
        />
      </div>
    </button>
  );
}
