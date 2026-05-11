/**
 * ProfileSheet.jsx
 * Two-tab sheet: "Perfil" (user info + currency) and "Categorías" (subcategory manager).
 */
import React, { useState } from 'react';
import { Mail, CalendarDays } from 'lucide-react';
import './ProfileSheet.css';
import BaseSheet                    from './ui/BaseSheet';
import CurrencyPicker               from './ui/CurrencyPicker';
import CategoriesManagerView        from './ui/CategoriesManagerView';
import { useNotificationSettings }  from '../hooks/useNotificationSettings';
import { useTheme }                 from '../context/ThemeContext';

function NotifRow({ label, description, checked, onToggle }) {
  return (
    <div className="notif-row">
      <div className="notif-row-text">
        <span className="notif-row-label">{label}</span>
        {description && <span className="notif-row-desc">{description}</span>}
      </div>
      <button
        className={`notif-toggle${checked ? ' on' : ''}`}
        onClick={onToggle}
        aria-pressed={checked}
      >
        <span className="notif-toggle-thumb" />
      </button>
    </div>
  );
}

function NotifGroup({ title, children }) {
  return (
    <div className="notif-group">
      <div className="profile-setting-label">{title}</div>
      <div className="notif-group-card">{children}</div>
    </div>
  );
}

export default function ProfileSheet({
  user,
  onClose,
  onSignOut,
  defaultCurrency,
  onCurrencyChange,
  userCategories,
  onCreateSubcategory,
  onDeleteSubcategory,
  yapePermission = false,
  onRequestYapePermission,
}) {
  const [tab, setTab] = useState('perfil');
  const { settings, toggle } = useNotificationSettings(user?.id);
  const { theme, setTheme } = useTheme();

  const email  = user?.email ?? '';
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  const handleSignOut = () => { onSignOut(); onClose(); };

  const tabTitle = tab === 'perfil'       ? 'Mi perfil'
                 : tab === 'categorias'  ? 'Categorías'
                 : tab === 'tema'        ? 'Tema'
                 : 'Notificaciones';

  return (
    <BaseSheet title={tabTitle} onClose={onClose}>

      {/* Tab bar */}
      <div className="profile-tabs">
        <button className={`profile-tab${tab === 'perfil' ? ' active' : ''}`} onClick={() => setTab('perfil')} id="tab-profile">Perfil</button>
        <button className={`profile-tab${tab === 'categorias' ? ' active' : ''}`} onClick={() => setTab('categorias')} id="tab-categories">Categorías</button>
        <button className={`profile-tab${tab === 'notificaciones' ? ' active' : ''}`} onClick={() => setTab('notificaciones')} id="tab-notifications">Alertas</button>
        <button className={`profile-tab${tab === 'tema' ? ' active' : ''}`} onClick={() => setTab('tema')} id="tab-theme">Tema</button>
      </div>

      {/* ── Perfil tab ── */}
      {tab === 'perfil' && (
        <div className="profile-sheet-body">
          <div className="profile-avatar-lg">
            {email ? email[0].toUpperCase() : '?'}
          </div>

          <div className="profile-info-group">
            <div className="profile-info-row">
              <span className="profile-info-icon"><Mail size={17} strokeWidth={2} /></span>
              <div className="profile-info-inner">
                <span className="profile-info-label">Email</span>
                <span className="profile-info-value">{email}</span>
              </div>
            </div>
            <div className="profile-info-divider" />
            <div className="profile-info-row">
              <span className="profile-info-icon"><CalendarDays size={17} strokeWidth={2} /></span>
              <div className="profile-info-inner">
                <span className="profile-info-label">Miembro desde</span>
                <span className="profile-info-value" style={{ textTransform: 'capitalize' }}>{joined}</span>
              </div>
            </div>
          </div>

          <div className="profile-setting-group">
            <div className="profile-setting-label">Moneda por defecto</div>
            <p className="profile-setting-hint">Se usará automáticamente al registrar un nuevo gasto.</p>
            <CurrencyPicker selected={defaultCurrency ?? 'MXN'} onSelect={onCurrencyChange} />
          </div>

          <button className="profile-signout-btn" onClick={handleSignOut} id="btn-sign-out">
            Cerrar sesión
          </button>
        </div>
      )}

      {/* ── Categorías tab ── */}
      {tab === 'categorias' && (
        <CategoriesManagerView
          userCategories={userCategories ?? []}
          onCreateSubcategory={onCreateSubcategory}
          onDeleteSubcategory={onDeleteSubcategory}
        />
      )}

      {/* ── Notificaciones tab ── */}
      {tab === 'notificaciones' && (
        <div className="profile-sheet-body">

          <NotifGroup title="Integraciones">
            <NotifRow
              label="Yape"
              description={yapePermission ? 'Detectando pagos automáticamente' : 'Activa para registrar pagos al instante'}
              checked={yapePermission}
              onToggle={onRequestYapePermission}
            />
          </NotifGroup>

          <NotifGroup title="Diarias">
            <NotifRow label="☀️ Buenos días" description="8am — arrancar el día registrando" checked={settings.daily_morning} onToggle={() => toggle('daily_morning')} />
            <div className="notif-divider" />
            <NotifRow label="🌙 Recordatorio noche" description="9pm si no registraste nada hoy" checked={settings.daily_night} onToggle={() => toggle('daily_night')} />
          </NotifGroup>

          <NotifGroup title="Semanales">
            <NotifRow label="📊 Resumen semanal" description="Lunes — total y categoría más alta" checked={settings.weekly_summary} onToggle={() => toggle('weekly_summary')} />
            <div className="notif-divider" />
            <NotifRow label="📈 Comparación semanal" description="Lunes — esta semana vs la anterior" checked={settings.weekly_compare} onToggle={() => toggle('weekly_compare')} />
          </NotifGroup>

          <NotifGroup title="Mensual">
            <NotifRow label="🗓️ Cierre de mes" description="Día 1 — resumen del mes anterior" checked={settings.month_close} onToggle={() => toggle('month_close')} />
          </NotifGroup>

          <NotifGroup title="Logros">
            <NotifRow label="✅ Balance positivo" description="3 semanas consecutivas en verde" checked={settings.positive_balance} onToggle={() => toggle('positive_balance')} />
            <div className="notif-divider" />
            <NotifRow label="🔥 Racha de registro" description="Al cumplir 7, 14 o 30 días seguidos" checked={settings.streak} onToggle={() => toggle('streak')} />
            <div className="notif-divider" />
            <NotifRow label="👋 Si me ausento" description="72h sin registrar nada" checked={settings.re_engagement} onToggle={() => toggle('re_engagement')} />
          </NotifGroup>

          <NotifGroup title="Gastos recurrentes">
            <NotifRow label="💸 Recordatorio de pago" description="El día que toca confirmar un gasto recurrente" checked={settings.recurring_reminder} onToggle={() => toggle('recurring_reminder')} />
          </NotifGroup>

          <NotifGroup title="Suscripciones">
            <NotifRow label="📅 3 días antes del cobro" description="Aviso previo para que tengas saldo" checked={settings.subscription_before_3days} onToggle={() => toggle('subscription_before_3days')} />
            <div className="notif-divider" />
            <NotifRow label="⏰ 1 día antes del cobro" description="Recordatorio el día previo al cargo" checked={settings.subscription_before_1day} onToggle={() => toggle('subscription_before_1day')} />
            <div className="notif-divider" />
            <NotifRow label="✅ Cobro registrado" description="Confirmación cuando se registra automáticamente" checked={settings.subscription_charged} onToggle={() => toggle('subscription_charged')} />
            <div className="notif-divider" />
            <NotifRow label="📊 Hitos anuales" description="A los 3 y 6 meses de tu suscripción anual" checked={settings.subscription_annual_milestone} onToggle={() => toggle('subscription_annual_milestone')} />
            <div className="notif-divider" />
            <NotifRow label="🔔 Vencimiento anual" description="3 meses, 1 mes, 1 semana, 3 días y 1 día antes de renovar" checked={settings.subscription_annual_expiry} onToggle={() => toggle('subscription_annual_expiry')} />
          </NotifGroup>
        </div>
      )}

      {/* ── Tema tab ── */}
      {tab === 'tema' && (
        <div className="profile-sheet-body">
          <div className="theme-picker-group">
            {[
              { value: 'claro',   label: 'Claro',   icon: '☀️' },
              { value: 'oscuro',  label: 'Oscuro',  icon: '🌙' },
              { value: 'sistema', label: 'Sistema', icon: '⚙️' },
            ].map((opt, i, arr) => (
              <React.Fragment key={opt.value}>
                <button
                  className={`theme-option-row${theme === opt.value ? ' active' : ''}`}
                  onClick={() => setTheme(opt.value)}
                >
                  <span className="theme-option-icon">{opt.icon}</span>
                  <span className="theme-option-label">{opt.label}</span>
                  {theme === opt.value && (
                    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                      <path d="M3 9l4.5 4.5L15 5" stroke="#007aff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </button>
                {i < arr.length - 1 && <div className="theme-option-divider" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

    </BaseSheet>
  );
}
