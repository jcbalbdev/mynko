/**
 * LoadingScreen.jsx — full-screen loading splash.
 */
import React from 'react';

export default function LoadingScreen() {
  return (
    <div className="login-screen">
      <div className="login-card" style={{ gap: 16 }}>
        <div className="login-logo">💸</div>
        <p className="loading-text">Cargando…</p>
      </div>
    </div>
  );
}
