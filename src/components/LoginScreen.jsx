/**
 * LoginScreen.jsx
 * Email + Password auth with tab toggle between Login and Sign Up.
 */
import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import './LoginScreen.css';

const ERROR_MESSAGES = {
  'Invalid login credentials':      'Email o contraseña incorrectos.',
  'Email not confirmed':            '📧 Debes confirmar tu email antes de iniciar sesión. Revisa tu bandeja de entrada.',
  'User already registered':        'Ya existe una cuenta con ese email. Inicia sesión.',
  'Password should be at least 6':  'La contraseña debe tener al menos 6 caracteres.',
  'Unable to validate email':       'Ingresa un email válido.',
};

function friendlyError(msg = '') {
  for (const [key, val] of Object.entries(ERROR_MESSAGES)) {
    if (msg.includes(key)) return val;
  }
  return 'Algo salió mal. Intenta de nuevo.';
}

export default function LoginScreen({ onSignIn, onSignUp }) {
  const [mode,     setMode]     = useState('login'); // 'login' | 'signup'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const [success,     setSuccess]     = useState(false);
  const [showPass,    setShowPass]    = useState(false);

  const isLogin  = mode === 'login';
  const isValid  = email.trim() && password.length >= 6;

  const switchMode = (m) => {
    setMode(m);
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError('');

    let err;
    if (isLogin) {
      ({ error: err } = await onSignIn(email.trim(), password));
      // on success App will re-render automatically via session change
    } else {
      ({ error: err } = await onSignUp(email.trim(), password));
      if (!err) setSuccess(true);
    }

    if (err) setError(friendlyError(err.message));
    setLoading(false);
  };

  return (
    <div className="login-screen">
      <div className="login-card">

        {/* Branding */}
        <div className="login-logo">🪙</div>
        <h1 className="login-title">Mynko</h1>
        <p className="login-subtitle">Tu historial de gastos, siempre contigo</p>

        {/* Mode tabs */}
        <div className="login-tabs">
          <button
            className={`login-tab${isLogin ? ' active' : ''}`}
            onClick={() => switchMode('login')}
            type="button"
            id="tab-login"
          >
            Iniciar sesión
          </button>
          <button
            className={`login-tab${!isLogin ? ' active' : ''}`}
            onClick={() => switchMode('signup')}
            type="button"
            id="tab-signup"
          >
            Crear cuenta
          </button>
        </div>

        {success ? (
          /* ── Sign-up success ── */
          <div className="login-sent">
            <div className="login-sent-icon">🎉</div>
            <p className="login-sent-title">¡Cuenta creada!</p>
            <p className="login-sent-body">
              Revisa tu email <strong>{email}</strong> para confirmar tu cuenta y luego inicia sesión.
            </p>
            <button
              className="login-resend-btn"
              onClick={() => switchMode('login')}
            >
              Iniciar sesión
            </button>
          </div>
        ) : (
          /* ── Form ── */
          <form className="login-form" onSubmit={handleSubmit}>

            <label className="login-label" htmlFor="auth-email">Email</label>
            <input
              id="auth-email"
              className="login-input"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              autoComplete="email"
              inputMode="email"
              required
            />

            <label className="login-label" htmlFor="auth-password">Contraseña</label>
            <div style={{ position: 'relative' }}>
              <input
                id="auth-password"
                className="login-input"
                type={showPass ? 'text' : 'password'}
                placeholder={isLogin ? '••••••••' : 'Mínimo 6 caracteres'}
                value={password}
                onChange={e => setPassword(e.target.value)}
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                required
                minLength={6}
                style={{ paddingRight: 42 }}
              />
              <button
                type="button"
                onClick={() => setShowPass(v => !v)}
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                id="btn-toggle-password"
                style={{
                  position: 'absolute', right: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  cursor: 'pointer', padding: 4, color: 'var(--label-tertiary)',
                  display: 'flex', alignItems: 'center',
                }}
              >
                {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button
              type="submit"
              className="login-btn"
              disabled={loading || !isValid}
              id="btn-auth-submit"
            >
              {loading
                ? (isLogin ? 'Entrando…' : 'Creando cuenta…')
                : (isLogin ? 'Iniciar sesión' : 'Crear cuenta')}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}
