import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Lesson } from '../types';

export default function MinhasAulas() {
  const { token } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

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
    if (!timeStr) return '';
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

  return (
    <div className="page-container">
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Cronograma de Aulas</h1>
        <p className="page-subtitle">Acompanhe suas aulas e reposições agendadas</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in stagger-children">
        {lessons.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <CalendarIcon size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>Nenhuma aula encontrada no cronograma.</p>
          </div>
        ) : (
          lessons.map(lesson => {
            const isCancelled = lesson.status === 'cancelled';
            const isRescheduled = lesson.status === 'rescheduled';
            const isReposicao = lesson.type === 'reposicao';
            const isCompleted = lesson.status === 'completed';

            return (
              <div
                key={lesson.id}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  opacity: isCancelled ? 0.55 : 1,
                  borderLeft: isCancelled ? '4px solid var(--color-danger)'
                    : isRescheduled ? '4px solid var(--color-warning)'
                    : isReposicao ? '4px solid var(--color-success)'
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

                    {isReposicao && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{
                          background: 'var(--color-success)', color: 'white',
                          padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                        }}>
                          REPOSIÇÃO
                        </span>
                        {lesson.originalLessonId && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            Ref. aula original
                          </span>
                        )}
                      </div>
                    )}

                    {isCompleted && !isReposicao && !isRescheduled && (
                      <span style={{
                        background: 'var(--color-border)', color: 'var(--color-text-secondary)',
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                      }}>
                        CONCLUÍDA
                      </span>
                    )}

                    {!isCancelled && !isCompleted && !isReposicao && !isRescheduled && (
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
