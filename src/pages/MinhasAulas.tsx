import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Lesson } from '../types';
import { getLessonTimeStatus } from '../lib/lessonUtils';
import { useRealTimeDate } from '../hooks/useRealTimeDate';

export default function MinhasAulas() {
  const { token } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  
  // MUST be called logically at the top level
  const now = useRealTimeDate(30000);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/portal/aulas', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setLessons(data.lessons || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T12:00:00');
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr || typeof timeStr !== 'string') return '';
    return timeStr.substring(0, 5);
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ width: 250, height: 32, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 16 }} />
      </div>
    );
  }

  const nowTime = now.getTime();

  const sortedLessons = [...lessons].sort((a, b) => {
    const { isInProgress: aProgress } = getLessonTimeStatus(a, now);
    const { isInProgress: bProgress } = getLessonTimeStatus(b, now);

    if (aProgress && !bProgress) return -1;
    if (!aProgress && bProgress) return 1;

    const dA = a.date || '';
    const dB = b.date || '';
    if (!dA) return 1;
    if (!dB) return -1;

    const timeA = typeof a.startTime === 'string' ? a.startTime.substring(0, 5) : '12:00';
    const timeB = typeof b.startTime === 'string' ? b.startTime.substring(0, 5) : '12:00';
    const tA = timeA.split(':');
    const tB = timeB.split(':');
    const pA = dA.split('-');
    const pB = dB.split('-');

    const dateA = new Date(Number(pA[0]), Number(pA[1]) - 1, Number(pA[2]), Number(tA[0]), Number(tA[1])).getTime();
    const dateB = new Date(Number(pB[0]), Number(pB[1]) - 1, Number(pB[2]), Number(tB[0]), Number(tB[1])).getTime();
    
    // Check for NaN if date splitting failed, fallback to 0
    const diffA = isNaN(dateA) ? Infinity : Math.abs(dateA - nowTime);
    const diffB = isNaN(dateB) ? Infinity : Math.abs(dateB - nowTime);
    
    return diffA - diffB;
  });

  return (
    <div className="page-container">
      <style>{`
        @keyframes blink-status {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Cronograma de Aulas</h1>
        <p className="page-subtitle">Acompanhe suas aulas e reposições agendadas</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in stagger-children">
        {sortedLessons.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <CalendarIcon size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>Nenhuma aula encontrada no cronograma.</p>
          </div>
        ) : (
          sortedLessons.map(lesson => {
            const isCancelled = lesson.status === 'cancelled';
            const isRescheduled = lesson.status === 'rescheduled';
            const isReposicao = lesson.type === 'reposicao';
            const dateStr = lesson.date;
            
            const { isInProgress, isCompleted } = getLessonTimeStatus(lesson, now);

            return (
              <div
                key={lesson.id}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  opacity: isCancelled ? 0.55 : 1,
                  borderLeft: isCancelled ? '4px solid var(--color-danger)'
                    : isRescheduled ? '4px solid var(--color-warning)'
                    : isInProgress ? '4px solid var(--color-info)'
                    : isCompleted ? '4px solid var(--color-success)'
                    : '4px solid var(--color-primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                        <CalendarIcon size={16} />
                        <span style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
                          🗓️ {formatDate(lesson.date)}
                        </span>
                      </div>
                      {(lesson.startTime || lesson.endTime) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                          <Clock size={16} />
                          <span style={{ textDecoration: isCancelled ? 'line-through' : 'none' }}>
                            ⏰ {formatTime(lesson.startTime)}{lesson.endTime ? ` às ${formatTime(lesson.endTime)}` : ''}
                          </span>
                        </div>
                      )}
                    </div>
                    {isReposicao && (
                      <div style={{ marginTop: '0.5rem' }}>
                         <span style={{
                          background: 'var(--bg-primary-alpha)', color: 'var(--color-primary)',
                          padding: '2px 8px', borderRadius: 4, fontSize: '0.65rem', fontWeight: 600,
                          border: '1px solid var(--color-primary-alpha)'
                        }}>
                          AULA DE REPOSIÇÃO
                        </span>
                        {lesson.originalLessonId && (
                           <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)', marginLeft: '8px' }}>
                             Ref. aula original
                           </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    {isCancelled && (
                      <span style={{
                        background: 'var(--color-danger)', color: 'white',
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                      }}>
                        CANCELADA{lesson.cancelReason ? ` - ${lesson.cancelReason}` : ''}
                      </span>
                    )}

                    {isRescheduled && (
                      <span style={{
                        background: 'var(--color-warning)', color: 'white',
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                      }}>
                        REAGENDADA
                      </span>
                    )}

                    {isInProgress && !isCancelled && !isRescheduled && (
                      <span style={{
                        background: 'var(--color-info)', color: 'white',
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                        display: 'flex', alignItems: 'center', gap: 4,
                        animation: 'blink-status 1.5s infinite'
                      }}>
                        <Clock size={12} /> EM ANDAMENTO
                      </span>
                    )}

                    {isCompleted && !isCancelled && !isRescheduled && !isInProgress && (
                      <span style={{
                        background: 'var(--color-success)', color: 'white',
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                      }}>
                        CONCLUÍDA
                      </span>
                    )}

                    {!isCancelled && !isCompleted && !isRescheduled && !isInProgress && (
                      <span style={{
                        background: 'var(--bg-primary-alpha)', color: 'var(--color-primary)',
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                      }}>
                        AGENDADA
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
