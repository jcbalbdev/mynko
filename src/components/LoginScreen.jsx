import { useState } from 'react';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
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
  const [view,     setView]     = useState('welcome'); // 'welcome' | 'login' | 'signup'
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [success,  setSuccess]  = useState(false);
  const [showPass, setShowPass] = useState(false);

  const isValid = email.trim() && password.length >= 6;

  const goTo = (v) => {
    setView(v);
    setError('');
    setSuccess(false);
    setEmail('');
    setPassword('');
    setShowPass(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isValid) return;
    setLoading(true);
    setError('');

    if (view === 'login') {
      const { error: err } = await onSignIn(email.trim(), password);
      if (err) setError(friendlyError(err.message));
    } else {
      const { error: err } = await onSignUp(email.trim(), password);
      if (!err) setSuccess(true);
      else { console.error('[signUp error]', err); setError(friendlyError(err.message)); }
    }
    setLoading(false);
  };

  if (view === 'welcome') {
    return (
      <div className="login-screen login-welcome">
        <div className="login-welcome-brand">
          <div className="login-logo-lg">
            <img src="/mynko-icon-app.png" alt="Mynko" />
          </div>
          <h1 className="login-welcome-title">Mynko</h1>
          <p className="login-welcome-sub">Finanzas que se adaptan a ti.</p>
        </div>
        <div className="login-welcome-actions">
          <button
            className="login-btn login-btn-primary"
            onClick={() => goTo('signup')}
            id="btn-welcome-signup"
          >
            EMPEZAR AHORA
          </button>
          <button
            className="login-btn login-btn-ghost"
            onClick={() => goTo('login')}
            id="btn-welcome-login"
          >
            YA TENGO UNA CUENTA
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="login-screen login-form-screen">

      <div className="login-form-header">
        <button
          className="login-back-btn"
          onClick={() => goTo('welcome')}
          type="button"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <h2 className="login-card-title">
          {view === 'login' ? 'Iniciar sesión' : 'Crear cuenta'}
        </h2>
        <div className="login-header-spacer" />
      </div>

      <div className="login-form-body">
        {success ? (
          <div className="login-sent">
            <div className="login-sent-icon">🎉</div>
            <p className="login-sent-title">¡Cuenta creada!</p>
            <p className="login-sent-body">
              Revisa tu email <strong>{email}</strong> para confirmar tu cuenta y luego inicia sesión.
            </p>
            <button className="login-resend-btn" onClick={() => goTo('login')}>
              Iniciar sesión
            </button>
          </div>
        ) : (
          <form className="login-form" onSubmit={handleSubmit}>

            <div className="login-input-group">
              <input
                id="auth-email"
                className="login-input"
                type="email"
                placeholder="Correo"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                inputMode="email"
                required
              />
              <div className="login-input-divider" />
              <div className="login-input-pw-wrap">
                <input
                  id="auth-password"
                  className="login-input"
                  type={showPass ? 'text' : 'password'}
                  placeholder={view === 'login' ? 'Contraseña' : 'Contraseña (mín. 6 caracteres)'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete={view === 'login' ? 'current-password' : 'new-password'}
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  className="login-eye-btn"
                  onClick={() => setShowPass(v => !v)}
                  aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  id="btn-toggle-password"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {error && <p className="login-error">{error}</p>}

            <button
              type="submit"
              className="login-btn login-btn-primary"
              disabled={loading || !isValid}
              id="btn-auth-submit"
            >
              {loading
                ? (view === 'login' ? 'Entrando…' : 'Creando cuenta…')
                : (view === 'login' ? 'Iniciar sesión' : 'Crear cuenta')}
            </button>

          </form>
        )}
      </div>
    </div>
  );
}
