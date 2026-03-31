import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CalendarCheck, BookOpen, Clock, TrendingUp, AlertTriangle } from 'lucide-react';
import type { Payment, Attendance, Class, Course } from '../types';

interface DashboardData {
  payments: Payment[];
  attendance: Attendance[];
  studentClass: Class | null;
  course: Course | null;
}

export default function Dashboard() {
  const { student, token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [finRes, freqRes, meRes] = await Promise.all([
          fetch('/api/portal/financeiro', { headers }),
          fetch('/api/portal/frequencia', { headers }),
          fetch('/api/portal/me', { headers }),
        ]);
        const finData = await finRes.json();
        const freqData = await freqRes.json();
        const meData = await meRes.json();
        setData({
          payments: finData.payments || [],
          attendance: freqData.attendance || [],
          studentClass: meData.class || null,
          course: meData.course || null,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchAll();
  }, [token]);

  if (loading) {
    return (
      <div className="page-container stagger-children">
        <div className="skeleton" style={{ width: 300, height: 32, marginBottom: 24 }} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="skeleton" style={{ height: 140, borderRadius: 16 }} />
          ))}
        </div>
      </div>
    );
  }

  const pendingPayments = data?.payments.filter(p => p.status === 'pending' || p.status === 'overdue') || [];
  const overduePayments = data?.payments.filter(p => p.status === 'overdue') || [];
  const totalPending = pendingPayments.reduce((s, p) => s + (p.amount - (p.discount || 0)), 0);

  const totalAttendance = data?.attendance.length || 0;
  const presences = data?.attendance.filter(a => a.type === 'presence' || a.verified).length || 0;
  const frequencyPercent = totalAttendance > 0 ? Math.round((presences / totalAttendance) * 100) : 100;

  const nextDue = pendingPayments
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const greeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Bom dia';
    if (hour < 18) return 'Boa tarde';
    return 'Boa noite';
  };

  return (
    <div className="page-container">
      {/* Greeting */}
      <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">
          {greeting()}, <span className="gradient-text">{student?.name.split(' ')[0]}</span>! 👋
        </h1>
        <p className="page-subtitle">
          Aqui está um resumo da sua vida acadêmica
        </p>
      </div>

      {/* Cards Grid */}
      <div className="stagger-children" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '1rem',
        marginBottom: '2rem',
      }}>
        {/* Turma Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--bg-primary-alpha)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <BookOpen size={22} color="var(--color-primary-light)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                MINHA TURMA
              </p>
            </div>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {data?.studentClass?.name || 'Não vinculado'}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
            {data?.course?.name || '—'}
          </p>
          {data?.studentClass?.schedule && (
            <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
              <Clock size={14} /> {data.studentClass.schedule}
            </p>
          )}
        </div>

        {/* Financeiro Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: overduePayments.length > 0 ? 'var(--bg-danger-alpha)' : 'var(--bg-success-alpha)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CreditCard size={22} color={overduePayments.length > 0 ? 'var(--color-danger)' : 'var(--color-success)'} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                FINANCEIRO
              </p>
            </div>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {formatCurrency(totalPending)}
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
            {pendingPayments.length} parcela{pendingPayments.length !== 1 ? 's' : ''} pendente{pendingPayments.length !== 1 ? 's' : ''}
          </p>
          {overduePayments.length > 0 && (
            <p style={{
              fontSize: '0.75rem', color: 'var(--color-danger)',
              marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 4,
            }}>
              <AlertTriangle size={14} /> {overduePayments.length} atrasada{overduePayments.length !== 1 ? 's' : ''}
            </p>
          )}
        </div>

        {/* Frequência Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: frequencyPercent >= 75 ? 'var(--bg-accent-alpha)' : 'var(--bg-warning-alpha)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <CalendarCheck size={22} color={frequencyPercent >= 75 ? 'var(--color-accent-light)' : 'var(--color-warning)'} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                FREQUÊNCIA
              </p>
            </div>
          </div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {frequencyPercent}%
          </h3>
          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
            {presences} presença{presences !== 1 ? 's' : ''} de {totalAttendance} aula{totalAttendance !== 1 ? 's' : ''}
          </p>
          <div style={{
            marginTop: '0.75rem', height: 6, borderRadius: 3,
            background: 'var(--color-surface)',
          }}>
            <div style={{
              height: '100%', borderRadius: 3,
              width: `${frequencyPercent}%`,
              background: frequencyPercent >= 75 ? 'var(--gradient-primary)' : 'var(--color-warning)',
              transition: 'width 1s ease',
            }} />
          </div>
        </div>

        {/* Próximo Vencimento Card */}
        <div className="glass-card" style={{ padding: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: 'var(--bg-warning-alpha)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <TrendingUp size={22} color="var(--color-warning)" />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                PRÓXIMO VENCIMENTO
              </p>
            </div>
          </div>
          {nextDue ? (
            <>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700 }}>
                {formatCurrency(nextDue.amount - (nextDue.discount || 0))}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
                Vence em {formatDate(nextDue.dueDate)}
              </p>
              {nextDue.description && (
                <p style={{ fontSize: '0.75rem', color: 'var(--color-accent)', marginTop: '0.5rem' }}>
                  {nextDue.description}
                </p>
              )}
            </>
          ) : (
            <>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-success)' }}>
                Em dia! ✅
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
                Nenhuma parcela pendente
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
