import React from 'react';
import './VerifiedScreen.css';

export default function VerifiedScreen() {
  return (
    <div className="verified-screen">
      <div className="verified-card">
        <div className="verified-icon">✓</div>
        <h1 className="verified-title">¡Cuenta verificada!</h1>
        <p className="verified-message">
          Tu correo electrónico ha sido confirmado exitosamente.
        </p>
        <p className="verified-hint">
          Vuelve a la app <strong>Mynko</strong> para iniciar sesión.
        </p>
      </div>
    </div>
  );
}
