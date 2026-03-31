import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock, AlertTriangle, Send, X, Loader2, FileText } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Lesson, Attendance } from '../types';

export default function MinhasAulas() {
  const { token } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Justify modal state
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [justificationFile, setJustificationFile] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [aulasRes, freqRes] = await Promise.all([
          fetch('/api/portal/aulas', { headers }),
          fetch('/api/portal/frequencia', { headers }),
        ]);
        const aulasData = await aulasRes.json();
        const freqData = await freqRes.json();
        setLessons(aulasData.lessons || []);
        setAttendance(freqData.attendance || []);
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setJustificationFile(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleJustify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificationText.trim()) {
      setModalError('A justificativa é obrigatória');
      return;
    }

    setSubmitLoading(true);
    setModalError('');

    // Build the justification payload
    const payload: any = { motivo: justificationText.trim() };
    if (justificationFile) {
      payload.arquivo_base64 = justificationFile;
    }

    try {
      const res = await fetch(`/api/portal/frequencia/justificar/${justifyingId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ justification: JSON.stringify(payload) }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao enviar justificativa');
      }

      const { record } = await res.json();
      setAttendance(prev => prev.map(a => a.id === record.id ? record : a));

      // Close modal
      setJustifyingId(null);
      setJustificationText('');
      setJustificationFile(null);
    } catch (err: any) {
      setModalError(err.message || 'Erro ao comunicar com o servidor');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ width: 250, height: 32, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 16 }} />
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Find absence record for a given lesson date (without justification)
  const getAbsenceForDate = (lessonDate: string): Attendance | undefined => {
    return attendance.find(a =>
      a.date && lessonDate &&
      a.date.substring(0, 10) === lessonDate.substring(0, 10) &&
      (a.type === 'absence' || (!a.verified && a.type !== 'presence'))
    );
  };

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
            const isReposicao = lesson.type === 'reposicao';
            const isCompleted = lesson.status === 'completed';
            const lessonDate = new Date(lesson.date + 'T12:00:00');
            const isPast = lessonDate < today;

            // Check absence for past, non-cancelled lessons
            const absenceRecord = isPast && !isCancelled ? getAbsenceForDate(lesson.date) : undefined;
            const canJustify = absenceRecord && !absenceRecord.justification;

            let parsedJustification: string | null = null;
            if (absenceRecord?.justification) {
              try {
                const j = JSON.parse(absenceRecord.justification);
                parsedJustification = j.motivo || absenceRecord.justification;
              } catch {
                parsedJustification = absenceRecord.justification;
              }
            }

            return (
              <div
                key={lesson.id}
                className="glass-card"
                style={{
                  padding: '1.5rem',
                  opacity: isCancelled ? 0.55 : 1,
                  borderLeft: isCancelled ? '4px solid var(--color-danger)'
                    : isReposicao ? '4px solid var(--color-success)'
                    : '4px solid var(--color-primary)',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    {/* Date & time */}
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem', flexWrap: 'wrap', marginBottom: '0.25rem' }}>
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

                    {/* Absence info */}
                    {absenceRecord && parsedJustification && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.5rem', fontSize: '0.8rem' }}>
                        <FileText size={14} color="var(--color-accent)" />
                        <span style={{ color: 'var(--color-text-secondary)' }}>Justificativa: {parsedJustification}</span>
                      </div>
                    )}

                    {canJustify && (
                      <button
                        className="btn-secondary"
                        onClick={() => { setJustifyingId(absenceRecord!.id); setModalError(''); }}
                        style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', marginTop: '0.5rem', color: 'var(--color-danger)', borderColor: 'var(--color-danger)' }}
                      >
                        <AlertTriangle size={14} />
                        Justificar Falta
                      </button>
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

                    {isCompleted && !isReposicao && (
                      <span style={{
                        background: 'var(--color-border)', color: 'var(--color-text-secondary)',
                        padding: '4px 10px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                      }}>
                        CONCLUÍDA
                      </span>
                    )}

                    {!isCancelled && !isCompleted && !isReposicao && (
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

      {/* Modal de Justificativa */}
      {justifyingId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--overlay-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem',
        }}>
          <div className="glass-card animate-scale-in" style={{
            width: '100%', maxWidth: 480, padding: '1.5rem',
            background: 'var(--color-surface)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '1rem',
            }}>
              <h3 style={{ fontWeight: 600 }}>Justificar Falta</h3>
              <button
                onClick={() => { setJustifyingId(null); setJustificationFile(null); setJustificationText(''); }}
                style={{ background: 'none', border: 'none', color: 'var(--color-text-secondary)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {modalError && (
              <div style={{
                background: 'var(--bg-danger-alpha)', color: 'var(--color-danger)',
                padding: '0.75rem', borderRadius: 8, fontSize: '0.8125rem', marginBottom: '1rem',
              }}>
                {modalError}
              </div>
            )}

            <form onSubmit={handleJustify} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Motivo da ausência
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Descreva o motivo da sua falta (ex: Atestado médico, problema familiar...)"
                  value={justificationText}
                  onChange={e => setJustificationText(e.target.value)}
                  style={{ resize: 'vertical', marginTop: '0.5rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)' }}>
                  Anexar documento (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="input-field"
                  style={{ marginTop: '0.5rem', padding: '0.5rem' }}
                />
                {justificationFile && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>
                    ✅ Arquivo carregado com sucesso
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => { setJustifyingId(null); setJustificationFile(null); setJustificationText(''); }}
                  disabled={submitLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitLoading}
                  style={{ minWidth: 100 }}
                >
                  {submitLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : (
                    <><Send size={14} /> Enviar</>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
