/**
 * LoadingScreen.jsx — full-screen loading splash.
 */
export default function LoadingScreen() {
  return (
    <div className="login-screen">
      <div className="login-card" style={{ gap: 16 }}>
        <div className="login-logo"><img src="/mynko-icon.png" alt="Mynko" style={{ width: 80, height: 80, objectFit: 'contain' }} /></div>
        <p className="loading-text">Cargando…</p>
      </div>
    </div>
  );
}
