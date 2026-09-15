import { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/authContext';
import Icon from './Icon';

// Layout v2: skip-link, sidebar con aria-expanded + Escape, foco al contenido
// al cambiar de ruta (A11Y-06/09/10).
export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const mainRef = useRef(null);

  const isStudent = user?.role === 'student';

  // Al cambiar de ruta: mover foco al contenido (el sidebar se cierra por evento en cada NavLink)
  useEffect(() => {
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  // Escape cierra el sidebar móvil
  useEffect(() => {
    if (!sidebarOpen) return;
    function onKeyDown(e) {
      if (e.key === 'Escape') setSidebarOpen(false);
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [sidebarOpen]);

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  const navItems = isStudent
    ? [{ to: '/mis-asignaciones', icon: 'clipboard', label: 'Mis Asignaciones' }]
    : [
        { to: '/', icon: 'chart', label: 'Dashboard', end: true },
        { to: '/patients', icon: 'users', label: 'Pacientes' },
        { to: '/students', icon: 'grad-cap', label: 'Estudiantes' },
        { to: '/matching', icon: 'chart', label: 'Matching' },
        { to: '/assignments', icon: 'link', label: 'Asignaciones' },
        { to: '/notifications', icon: 'mail', label: 'Notificaciones' },
      ];

  const initials = (user?.nombre_completo || user?.nombre || 'U')
    .split(' ')
    .map(s => s[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <div className="app-layout">
      <a href="#main" className="skip-link">Saltar al contenido principal</a>

      <button
        type="button"
        className="sidebar-toggle-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label="Abrir menú de navegación"
        aria-expanded={sidebarOpen}
        aria-controls="sidebar"
      >
        <Icon name="menu" size={20} />
      </button>

      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)} aria-hidden="true" />}

      <aside className={`sidebar${sidebarOpen ? ' open' : ''}`} id="sidebar" aria-label="Navegación principal">
        <div className="sidebar-header">
          <div className="logo">
            <Icon name="tooth" size={22} />
            <span>Dental Matching</span>
          </div>
          <button type="button" className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Cerrar menú">
            <Icon name="close" size={20} />
          </button>
        </div>

        <nav className="sidebar-nav">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <Icon name={item.icon} size={17} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="user-profile">
            <div className="user-avatar" aria-hidden="true">{initials}</div>
            <div className="user-info">
              <div className="user-name">{user?.nombre_completo || user?.nombre || 'Usuario'}</div>
              <div className="user-role">{user?.role || 'Sistema'}</div>
            </div>
          </div>
          <button type="button" className="btn-logout" onClick={handleLogout}>
            <Icon name="logout" size={16} /> Cerrar sesión
          </button>
        </div>
      </aside>

      <main className="main-content" id="main" ref={mainRef} tabIndex={-1}>
        {/* key por ruta: transición de entrada al navegar (motion.css .dm-enter) */}
        <div key={location.pathname} className="dm-enter">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
