import React from "react";
import { NavLink } from "react-router-dom";
import { Plane, Landmark } from "lucide-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const tabStyle = (active: boolean): React.CSSProperties => ({
    background: active ? "#152634" : "transparent",
    color: active ? "#F5F2EA" : "#5B6A75",
    border: active ? "1px solid #152634" : "1px solid transparent",
  });

  return (
    <div
      style={{
        background: "#F5F2EA",
        minHeight: "100%",
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        color: "#152634",
      }}
      className="w-full"
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=Inter:wght@400;500;600;700&display=swap');
        .ff-display { font-family: 'Space Grotesk', sans-serif; }
        .ff-mono { font-family: 'IBM Plex Mono', monospace; }
        .waybill-notch {
          background-image: radial-gradient(circle at 0 50%, #F5F2EA 8px, transparent 8.5px),
                             radial-gradient(circle at 100% 50%, #F5F2EA 8px, transparent 8.5px);
        }
        select { appearance: none; -webkit-appearance: none; }
        input[type=number]::-webkit-inner-spin-button { opacity: 1; }
      `}</style>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12">
        {/* ---------------- BRAND + NAV ---------------- */}
        <div className="flex items-center gap-3 mb-6">
          <div
            style={{ background: "#152634" }}
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
          >
            <Plane size={16} color="#E8A33D" strokeWidth={2.25} />
          </div>
          <span className="ff-mono text-xs tracking-[0.25em] uppercase" style={{ color: "#6E7C87" }}>
            Grundfos · Air Export Network
          </span>
        </div>

        <nav className="flex gap-2 mb-8">
          <NavLink to="/" end>
            {({ isActive }) => (
              <span
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={tabStyle(isActive)}
              >
                <Plane size={14} />
                Calculateur de Fret
              </span>
            )}
          </NavLink>
          <NavLink to="/prix-de-revient">
            {({ isActive }) => (
              <span
                className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
                style={tabStyle(isActive)}
              >
                <Landmark size={14} />
                Prix de Revient — Côte d'Ivoire
              </span>
            )}
          </NavLink>
        </nav>

        {children}
      </div>
    </div>
  );
}
