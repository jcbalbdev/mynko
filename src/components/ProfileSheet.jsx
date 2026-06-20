import React, { useState, useRef } from 'react';
import { User, Tag, Bell, Palette, Mail, CalendarDays, ChevronRight, LayoutList, Sun, Moon, Monitor, Check, Target } from 'lucide-react';
import './ProfileSheet.css';
import BaseSheet                    from './ui/BaseSheet';
import CurrencyPicker               from './ui/CurrencyPicker';
import CategoriesManagerView        from './ui/CategoriesManagerView';
import MenuConfigView               from '../components/MenuConfigView';
import BudgetsManagerView           from '../components/BudgetsManagerView';
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

const SETTINGS_ITEMS = [
  { id: 'perfil',         Icon: User,       label: 'Perfil',        desc: 'Tu información y moneda por defecto'        },
  { id: 'categorias',     Icon: Tag,        label: 'Categorías',    desc: 'Gestiona tus categorías personalizadas'     },
  { id: 'presupuestos',   Icon: Target,     label: 'Presupuestos',  desc: 'Límites de gasto por categoría'            },
  { id: 'notificaciones', Icon: Bell,       label: 'Alertas',       desc: 'Notificaciones y recordatorios'             },
  { id: 'tema',           Icon: Palette,    label: 'Tema',          desc: 'Apariencia de la aplicación'                },
  { id: 'menu',           Icon: LayoutList, label: 'Menú',          desc: 'Orden y visibilidad de las secciones'       },
];

export default function ProfileSheet({
  user,
  onClose,
  onSignOut,
  defaultCurrency,
  onCurrencyChange,
  userCategories,
  onCreateSubcategory,
  onDeleteSubcategory,
  onCreateParentCategory,
  onUpdateCategoryColor,
  onUpdateSystemCategoryColor,
  yapePermission = false,
  onRequestYapePermission,
  navViews        = [],
  menuConfig      = { order: [], hidden: [] },
  onMenuToggleHidden,
  onMenuReorder,
  budgets         = [],
  onAddBudget,
  onUpdateBudget,
  onDeleteBudget,
  expenses        = [],
}) {
  const [section,       setSection]       = useState(null);
  const [catSubTitle,   setCatSubTitle]   = useState(null);
  const [budgetSubTitle, setBudgetSubTitle] = useState(null);
  const backOverrideRef = useRef(null);
  const { settings, toggle } = useNotificationSettings(user?.id);
  const { theme, setTheme } = useTheme();

  const email  = user?.email ?? '';
  const joined = user?.created_at
    ? new Date(user.created_at).toLocaleDateString('es-MX', {
        year: 'numeric', month: 'long', day: 'numeric',
      })
    : '—';

  const handleSignOut = () => { onSignOut(); onClose(); };

  function handleBack() {
    if (backOverrideRef.current) {
      backOverrideRef.current();
      return;
    }
    setSection(null);
    setCatSubTitle(null);
    setBudgetSubTitle(null);
    backOverrideRef.current = null;
  }

  const sectionTitle = catSubTitle !== null            ? catSubTitle
                     : budgetSubTitle !== null         ? budgetSubTitle
                     : section === 'perfil'            ? 'Perfil'
                     : section === 'categorias'        ? 'Categorías'
                     : section === 'presupuestos'      ? 'Presupuestos'
                     : section === 'notificaciones'    ? 'Alertas'
                     : section === 'tema'              ? 'Tema'
                     : section === 'menu'              ? 'Menú'
                     : 'Configuración';

  return (
    <BaseSheet
      title={sectionTitle}
      onClose={onClose}
      onBack={section ? handleBack : undefined}
    >

      {/* ── Lista principal ── */}
      {!section && (
        <div className="config-sheet-list">
          {SETTINGS_ITEMS.map((item, i) => (
            <React.Fragment key={item.id}>
              <button
                className="config-sheet-item"
                onClick={() => setSection(item.id)}
                id={`config-item-${item.id}`}
              >
                <span className="config-sheet-item-icon-wrap">
                  <item.Icon size={16} strokeWidth={2} className="config-sheet-item-icon" />
                </span>
                <span className="config-sheet-item-text">
                  <span className="config-sheet-item-label">{item.label}</span>
                  <span className="config-sheet-item-desc">{item.desc}</span>
                </span>
                <ChevronRight size={16} strokeWidth={2.5} className="config-sheet-item-chevron" />
              </button>
            </React.Fragment>
          ))}
        </div>
      )}

      {/* ── Perfil ── */}
      {section === 'perfil' && (
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

      {/* ── Categorías ── */}
      {section === 'categorias' && (
        <CategoriesManagerView
          userCategories={userCategories ?? []}
          onCreateSubcategory={onCreateSubcategory}
          onDeleteSubcategory={onDeleteSubcategory}
          onCreateParentCategory={onCreateParentCategory}
          onUpdateCategoryColor={onUpdateCategoryColor}
          onUpdateSystemCategoryColor={onUpdateSystemCategoryColor}
          onTitleChange={setCatSubTitle}
        />
      )}

      {/* ── Presupuestos ── */}
      {section === 'presupuestos' && (
        <BudgetsManagerView
          budgets={budgets}
          userCategories={userCategories ?? []}
          defaultCurrency={defaultCurrency ?? 'MXN'}
          expenses={expenses}
          onAdd={onAddBudget}
          onUpdate={onUpdateBudget}
          onDelete={onDeleteBudget}
          onTitleChange={setBudgetSubTitle}
          onSetBack={(fn) => { backOverrideRef.current = fn; }}
        />
      )}

      {/* ── Alertas ── */}
      {section === 'notificaciones' && (
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
            <NotifRow label="Buenos días" description="8am — arrancar el día registrando" checked={settings.daily_morning} onToggle={() => toggle('daily_morning')} />
            <div className="notif-divider" />
            <NotifRow label="Recordatorio noche" description="9pm si no registraste nada hoy" checked={settings.daily_night} onToggle={() => toggle('daily_night')} />
          </NotifGroup>

          <NotifGroup title="Semanales">
            <NotifRow label="Resumen semanal" description="Lunes — total y categoría más alta" checked={settings.weekly_summary} onToggle={() => toggle('weekly_summary')} />
            <div className="notif-divider" />
            <NotifRow label="Comparación semanal" description="Lunes — esta semana vs la anterior" checked={settings.weekly_compare} onToggle={() => toggle('weekly_compare')} />
          </NotifGroup>

          <NotifGroup title="Mensual">
            <NotifRow label="Cierre de mes" description="Día 1 — resumen del mes anterior" checked={settings.month_close} onToggle={() => toggle('month_close')} />
          </NotifGroup>

          <NotifGroup title="Logros">
            <NotifRow label="Balance positivo" description="3 semanas consecutivas en verde" checked={settings.positive_balance} onToggle={() => toggle('positive_balance')} />
            <div className="notif-divider" />
            <NotifRow label="Racha de registro" description="Al cumplir 7, 14 o 30 días seguidos" checked={settings.streak} onToggle={() => toggle('streak')} />
            <div className="notif-divider" />
            <NotifRow label="Si me ausento" description="72h sin registrar nada" checked={settings.re_engagement} onToggle={() => toggle('re_engagement')} />
          </NotifGroup>

          <NotifGroup title="Gastos recurrentes">
            <NotifRow label="Recordatorio de pago" description="El día que toca confirmar un gasto recurrente" checked={settings.recurring_reminder} onToggle={() => toggle('recurring_reminder')} />
          </NotifGroup>

          <NotifGroup title="Suscripciones">
            <NotifRow label="3 días antes del cobro" description="Aviso previo para que tengas saldo" checked={settings.subscription_before_3days} onToggle={() => toggle('subscription_before_3days')} />
            <div className="notif-divider" />
            <NotifRow label="1 día antes del cobro" description="Recordatorio el día previo al cargo" checked={settings.subscription_before_1day} onToggle={() => toggle('subscription_before_1day')} />
            <div className="notif-divider" />
            <NotifRow label="Cobro registrado" description="Confirmación cuando se registra automáticamente" checked={settings.subscription_charged} onToggle={() => toggle('subscription_charged')} />
            <div className="notif-divider" />
            <NotifRow label="Hitos anuales" description="A los 3 y 6 meses de tu suscripción anual" checked={settings.subscription_annual_milestone} onToggle={() => toggle('subscription_annual_milestone')} />
            <div className="notif-divider" />
            <NotifRow label="Vencimiento anual" description="3 meses, 1 mes, 1 semana, 3 días y 1 día antes de renovar" checked={settings.subscription_annual_expiry} onToggle={() => toggle('subscription_annual_expiry')} />
          </NotifGroup>
        </div>
      )}

      {/* ── Tema ── */}
      {section === 'tema' && (
        <div className="profile-sheet-body">
          <div className="theme-picker-group">
            {[
              { value: 'claro',   label: 'Claro',   Icon: Sun     },
              { value: 'oscuro',  label: 'Oscuro',  Icon: Moon    },
              { value: 'sistema', label: 'Sistema', Icon: Monitor },
            ].map((opt, i, arr) => (
              <React.Fragment key={opt.value}>
                <button
                  className={`theme-option-row${theme === opt.value ? ' active' : ''}`}
                  onClick={() => setTheme(opt.value)}
                >
                  <span className="theme-option-icon">
                    <opt.Icon size={18} strokeWidth={2} />
                  </span>
                  <span className="theme-option-label">{opt.label}</span>
                  {theme === opt.value && (
                    <span className="theme-option-check">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </button>
                {i < arr.length - 1 && <div className="theme-option-divider" />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}

      {/* ── Menú ── */}
      {section === 'menu' && (
        <MenuConfigView
          navViews={navViews}
          config={menuConfig}
          onToggleHidden={onMenuToggleHidden}
          onReorder={onMenuReorder}
        />
      )}


    </BaseSheet>
  );
}
