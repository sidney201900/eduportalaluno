import { useAuth } from '../context/AuthContext';
import { Bell } from 'lucide-react';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/financeiro': 'Financeiro',
  '/notas': 'Notas & Boletim',
  '/frequencia': 'Frequência',
  '/contratos': 'Contratos',
  '/certificados': 'Certificados',
  '/meus-dados': 'Meus Dados',
};

export default function Header() {
  const { student } = useAuth();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Portal do Aluno';

  return (
    <header style={{
      height: 64,
      borderBottom: '1px solid var(--glass-border)',
      background: 'rgba(15, 23, 42, 0.9)',
      backdropFilter: 'blur(12px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 1.5rem 0 1.5rem',
      position: 'sticky',
      top: 0,
      zIndex: 100,
    }}
      className="portal-header"
    >
      <div style={{ marginLeft: 0 }} className="header-title-area">
        <h2 style={{ fontSize: '1.125rem', fontWeight: 600 }}>{title}</h2>
      </div>

      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
      }}>
        <button
          id="notifications-btn"
          style={{
            width: 38, height: 38, borderRadius: 10,
            background: 'var(--color-surface-light)', border: '1px solid var(--color-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--color-text-secondary)',
            transition: 'all 0.2s ease', position: 'relative',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-primary)';
            e.currentTarget.style.color = 'var(--color-primary-light)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = 'var(--color-border)';
            e.currentTarget.style.color = 'var(--color-text-secondary)';
          }}
        >
          <Bell size={18} />
        </button>

        {student && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: '0.625rem',
          }}
            className="header-student-info"
          >
            <div style={{
              width: 36, height: 36, borderRadius: '50%',
              background: 'var(--gradient-primary)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '0.8125rem', fontWeight: 700,
              overflow: 'hidden', flexShrink: 0,
            }}>
              {student.photo ? (
                <img src={student.photo} alt={student.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                student.name.charAt(0).toUpperCase()
              )}
            </div>
            <div className="header-student-name">
              <p style={{ fontSize: '0.8125rem', fontWeight: 600, lineHeight: 1.2 }}>
                {student.name.split(' ')[0]}
              </p>
              <p style={{ fontSize: '0.6875rem', color: 'var(--color-text-secondary)' }}>
                Aluno
              </p>
            </div>
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 768px) {
          .header-title-area { margin-left: 52px !important; }
          .header-student-name { display: none !important; }
        }
      `}</style>
    </header>
  );
}
