import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CreditCard, CalendarCheck, BookOpen, Clock, TrendingUp, AlertTriangle, CalendarClock } from 'lucide-react';
import type { Payment, Attendance, Class, Course, Lesson } from '../types';
import { getLessonTimeStatus, parseLessonDateTime } from '../lib/lessonUtils';
import { useRealTimeDate } from '../hooks/useRealTimeDate';

interface DashboardData {
  payments: Payment[];
  attendance: Attendance[];
  lessons: Lesson[];
  studentClass: Class | null;
  course: Course | null;
}

export default function Dashboard() {
  const { student, token } = useAuth();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Real-time update every 30s
  const now = useRealTimeDate(30000);

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [finRes, freqRes, meRes, aulasRes] = await Promise.all([
          fetch('/api/portal/financeiro', { headers }),
          fetch('/api/portal/frequencia', { headers }),
          fetch('/api/portal/me', { headers }),
          fetch('/api/portal/aulas', { headers }),
        ]);
        const finData = await finRes.json();
        const freqData = await freqRes.json();
        const meData = await meRes.json();
        const aulasData = await aulasRes.json();
        setData({
          payments: finData.payments || [],
          attendance: freqData.attendance || [],
          lessons: aulasData.lessons || [],
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
  const presences = data?.attendance.filter(a => a.type === 'presence').length || 0;
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

  const getNext7DaysReplacements = () => {
    if (!data?.lessons) return [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const in7Days = new Date(today);
    in7Days.setDate(in7Days.getDate() + 7);
    return data.lessons.filter(l => {
      if (l.status === 'cancelled') return false;
      const parsedMs = parseLessonDateTime(l.date, '00:00', 0);
      if (isNaN(parsedMs)) return false;
      
      const classDate = new Date(parsedMs);
      classDate.setHours(0, 0, 0, 0);
      
      return l.type === 'reposicao' && classDate >= today && classDate <= in7Days;
    });
  };

  const getNextOrCurrentClass = (): { lesson: Lesson; isInProgress: boolean } | null => {
    if (!data?.lessons) return null;
    
    // First check if any lesson is currently in progress
    const activeLessons = data.lessons.filter(l => l.status !== 'cancelled' && l.status !== 'rescheduled');
    
    // 1. First, look for anything strictly "In Progress"
    const inProgress = activeLessons.find(l => {
      const { isInProgress } = getLessonTimeStatus(l, now);
      return isInProgress;
    });
    if (inProgress) return { lesson: inProgress, isInProgress: true };
    
    // 2. Next, look for the closest future lesson (or today's lesson that hasn't started)
    const future = activeLessons
      .filter(l => {
        const { isCompleted } = getLessonTimeStatus(l, now);
        return !isCompleted;
      })
      .sort((a, b) => {
        const dateA = parseLessonDateTime(a.date, a.startTime || (a as any).start_time, 0);
        const dateB = parseLessonDateTime(b.date, b.startTime || (b as any).start_time, 0);
        
        // Chronological order (earliest future first)
        return (dateA || 0) - (dateB || 0);
      });
      
    if (future[0]) {
      const { isInProgress } = getLessonTimeStatus(future[0], now);
      return { lesson: future[0], isInProgress };
    }
    
    return null;
  };

  const formatTime = (t?: string) => (t && typeof t === 'string') ? t.substring(0, 5) : '';

  const replacements = getNext7DaysReplacements();
  const nextClassInfo = getNextOrCurrentClass();
  const nextClass = nextClassInfo?.lesson || null;
  const isCurrentlyInProgress = nextClassInfo?.isInProgress || false;

  return (
    <div className="page-container">
      <style>{`
        @keyframes blink-status {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
        @keyframes pulse-glow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.05); opacity: 0.85; }
        }
      `}</style>
      {/* Greeting */}
      <div className="animate-fade-in" style={{ marginBottom: '2rem' }}>
        <h1 className="page-title">
          {greeting()}, <span className="gradient-text">{student?.name.split(' ')[0]}</span>! 👋
        </h1>
        <p className="page-subtitle">
          Aqui está um resumo da sua vida acadêmica.
        </p>

        {replacements.map(rep => (
          <div key={rep.id} className="glass-card animate-fade-in" style={{
            marginTop: '1.25rem', padding: '1rem',
            background: 'var(--bg-success-alpha)', border: '1px solid var(--border-success-alpha)',
            display: 'flex', alignItems: 'center', gap: '0.75rem',
            color: 'var(--color-success)'
          }}>
            <CalendarClock size={20} />
            <p style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text)' }}>
              🗓️ <strong>Aviso:</strong> Você tem uma reposição agendada para o dia <strong>{formatDate(rep.date || '')}</strong>
              {rep.startTime ? ` às ${formatTime(rep.startTime)}` : ''}.
            </p>
          </div>
        ))}
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

        {/* Próxima Aula Card */}
        <div className="glass-card" style={{
          padding: '1.5rem',
          borderLeft: isCurrentlyInProgress ? '4px solid var(--color-info)' : undefined,
          background: isCurrentlyInProgress ? 'var(--bg-primary-alpha)' : undefined,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
            <div style={{
              width: 44, height: 44, borderRadius: 12,
              background: isCurrentlyInProgress ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-primary-alpha)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: isCurrentlyInProgress ? 'pulse-glow 2s infinite' : undefined,
            }}>
              <CalendarClock size={22} color={isCurrentlyInProgress ? 'var(--color-info)' : 'var(--color-primary-light)'} />
            </div>
            <div>
              <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
                {isCurrentlyInProgress ? '🔴 AULA EM ANDAMENTO' : 'PRÓXIMA AULA'}
              </p>
            </div>
          </div>
          {nextClass ? (
            <>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, lineHeight: 1.2, color: isCurrentlyInProgress ? 'var(--color-info)' : undefined }}>
                {nextClass.type === 'reposicao' ? 'Reposição' : 'Aula Regular'}
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
                {formatDate(nextClass.date || '')}
              </p>
              {(nextClass.startTime || nextClass.endTime) && (
                <p style={{ fontSize: '0.75rem', color: isCurrentlyInProgress ? 'var(--color-info)' : 'var(--color-accent)', marginTop: '0.5rem', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Clock size={14} /> {formatTime(nextClass.startTime)} {nextClass.endTime && `às ${formatTime(nextClass.endTime)}`}
                </p>
              )}
              {isCurrentlyInProgress && (
                <span className="animate-pulse" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 4,
                  marginTop: '0.75rem', padding: '4px 10px', borderRadius: 6,
                  background: 'var(--color-info)', color: 'white',
                  fontSize: '0.7rem', fontWeight: 600,
                }}>
                  <Clock size={12} /> EM ANDAMENTO
                </span>
              )}
            </>
          ) : (
             <>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>
                Nenhuma aula
              </h3>
              <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: '0.375rem' }}>
                Você não possui próximas aulas
              </p>
             </>
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
