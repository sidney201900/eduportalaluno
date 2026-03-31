import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, CreditCard, BookOpen, CalendarCheck,
  FileText, Award, User, LogOut, GraduationCap, X, Menu
} from 'lucide-react';
import { useState, useEffect } from 'react';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/financeiro', label: 'Financeiro', icon: CreditCard },
  { path: '/notas', label: 'Notas', icon: BookOpen },
  { path: '/frequencia', label: 'Frequência', icon: CalendarCheck },
  { path: '/contratos', label: 'Contratos', icon: FileText },
  { path: '/certificados', label: 'Certificados', icon: Award },
  { path: '/meus-dados', label: 'Meus Dados', icon: User },
];

export default function Sidebar() {
  const { logout, student } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setMobileOpen(false);
  }, [location]);

  return (
    <>
      {/* Mobile toggle */}
      <button
        id="sidebar-toggle"
        onClick={() => setMobileOpen(true)}
        style={{
          position: 'fixed', top: 16, left: 16, zIndex: 1001,
          background: 'var(--glass-bg)', backdropFilter: 'blur(12px)',
          border: '1px solid var(--glass-border)', borderRadius: 12,
          padding: 10, color: 'var(--color-text)', cursor: 'pointer',
          display: 'none',
        }}
        className="mobile-sidebar-toggle"
      >
        <Menu size={22} />
      </button>

      {/* Overlay */}
      {mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
            zIndex: 1099, display: 'block',
          }}
        />
      )}

      {/* Sidebar */}
      <aside
        style={{
          width: 280,
          minHeight: '100vh',
          background: 'linear-gradient(180deg, #0c1222 0%, #131b2e 50%, #0f172a 100%)',
          borderRight: '1px solid var(--glass-border)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          zIndex: 1100,
          transition: 'transform 0.3s ease',
        }}
        className={`sidebar ${mobileOpen ? 'sidebar-open' : ''}`}
      >
        {/* Mobile close */}
        <button
          onClick={() => setMobileOpen(false)}
          className="mobile-close-btn"
          style={{
            position: 'absolute', top: 12, right: 12, display: 'none',
            background: 'none', border: 'none', color: 'var(--color-text-secondary)',
            cursor: 'pointer', padding: 4,
          }}
        >
          <X size={20} />
        </button>

        {/* Logo */}
        <div style={{
          padding: '2rem 1.5rem', borderBottom: '1px solid var(--glass-border)',
          display: 'flex', alignItems: 'center', gap: '0.75rem',
        }}>
          <div style={{
            width: 44, height: 44, borderRadius: 14,
            background: 'var(--gradient-primary)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <GraduationCap size={24} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: '1.1rem', fontWeight: 700, lineHeight: 1.2 }}>
              Portal do <span className="gradient-text">Aluno</span>
            </h1>
            <p style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
              EduManager
            </p>
          </div>
        </div>

        {/* Student Info */}
        {student && (
          <div style={{
            padding: '1.25rem 1.5rem',
            borderBottom: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
          }}>
            <div style={{
              width: 40, height: 40, borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.9rem', fontWeight: 700, flexShrink: 0,
              overflow: 'hidden',
            }}>
              {student.photo ? (
                <img src={student.photo} alt={student.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                student.name.charAt(0).toUpperCase()
              )}
            </div>
            <div style={{ overflow: 'hidden' }}>
              <p style={{
                fontSize: '0.8125rem', fontWeight: 600,
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {student.name}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                {student.enrollmentNumber}
              </p>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav style={{
          flex: 1, padding: '1rem 0.75rem',
          display: 'flex', flexDirection: 'column', gap: '0.25rem',
        }}>
          {navItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                padding: '0.75rem 1rem', borderRadius: 12,
                textDecoration: 'none', fontSize: '0.875rem', fontWeight: 500,
                transition: 'all 0.2s ease',
                color: isActive ? 'white' : 'var(--color-text-secondary)',
                background: isActive
                  ? 'linear-gradient(135deg, rgba(99,102,241,0.2) 0%, rgba(6,182,212,0.1) 100%)'
                  : 'transparent',
                borderLeft: isActive ? '3px solid var(--color-primary)' : '3px solid transparent',
              })}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Logout */}
        <div style={{ padding: '1rem 0.75rem', borderTop: '1px solid var(--glass-border)' }}>
          <button
            id="logout-btn"
            onClick={logout}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem', borderRadius: 12, border: 'none',
              background: 'rgba(239, 68, 68, 0.1)', color: '#f87171',
              cursor: 'pointer', fontSize: '0.875rem', fontWeight: 500,
              transition: 'all 0.2s ease', fontFamily: 'Inter, sans-serif',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
            }}
          >
            <LogOut size={20} />
            <span>Sair</span>
          </button>
        </div>
      </aside>

      <style>{`
        @media (max-width: 768px) {
          .mobile-sidebar-toggle { display: flex !important; }
          .mobile-close-btn { display: block !important; }
          .sidebar {
            position: fixed !important;
            left: 0; top: 0;
            transform: translateX(-100%);
            box-shadow: 4px 0 24px rgba(0,0,0,0.4);
          }
          .sidebar.sidebar-open {
            transform: translateX(0);
          }
        }
      `}</style>
    </>
  );
}
