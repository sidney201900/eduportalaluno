import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CalendarCheck, CheckCircle2, XCircle, FileText, Send, X, Loader2, AlertTriangle, ChevronDown, Clock } from 'lucide-react';
import type { Attendance, Lesson } from '../types';
import { getLessonTimeStatus, isLessonWithinJustificationWindow } from '../lib/lessonUtils';

export default function Frequencia() {
  const { token } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMsg, setSuccessMsg] = useState('');

  // Modal State
  const [showJustifyModal, setShowJustifyModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState('');
  const [justificationText, setJustificationText] = useState('');
  const [justificationFile, setJustificationFile] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [freqRes, aulasRes] = await Promise.all([
          fetch('/api/portal/frequencia', { headers }),
          fetch('/api/portal/aulas', { headers })
        ]);
        const freqData = await freqRes.json();
        const aulasData = await aulasRes.json();
        setAttendance(freqData.attendance || []);
        setLessons(aulasData.lessons || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  const openJustifyModal = (preselectedDate?: string) => {
    setShowJustifyModal(true);
    setSelectedDate(preselectedDate || '');
    setJustificationText('');
    setJustificationFile(null);
    setError('');
    setSuccessMsg('');
  };

  const closeModal = () => {
    setShowJustifyModal(false);
    setSelectedDate('');
    setJustificationText('');
    setJustificationFile(null);
    setError('');
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
    if (!selectedDate) {
      setError('Selecione a data da aula');
      return;
    }
    if (!justificationText.trim()) {
      setError('A justificativa é obrigatória');
      return;
    }
    
    setSubmitLoading(true);
    setError('');

    const payload: any = { motivo: justificationText.trim() };
    if (justificationFile) {
      payload.arquivo_base64 = justificationFile;
    }
    
    try {
      const res = await fetch('/api/portal/frequencia/justificar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({
          date: selectedDate,
          justification: JSON.stringify(payload),
        }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao enviar justificativa');
      }
      
      const { record } = await res.json();
      
      // Update local state
      setAttendance(prev => {
        const exists = prev.find(a => a.id === record.id);
        if (exists) return prev.map(a => a.id === record.id ? record : a);
        return [...prev, record];
      });
      
      closeModal();
      setSuccessMsg(`Justificativa enviada com sucesso para o dia ${formatDate(selectedDate)}!`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err: any) {
      setError(err.message || 'Erro ao comunicar com o servidor');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 300, borderRadius: 16 }} />
      </div>
    );
  }

  const now = new Date();

  // Stats calculation (based on actual attendance records)
  const totalRecords = attendance.length;
  const presences = attendance.filter(a => a.type === 'presence' || a.verified).length;
  const absences = totalRecords - presences;
  const percentage = totalRecords > 0 ? Math.round((presences / totalRecords) * 100) : 100;

  // Merge lessons and attendance to show a complete history
  const mergedItems = lessons.map(lesson => {
    const att = attendance.find(a => a.date.substring(0, 10) === lesson.date);
    return { lesson, attendance: att };
  });

  const sortedItems = [...mergedItems].sort((a, b) =>
    new Date(b.lesson.date).getTime() - new Date(a.lesson.date).getTime()
  );

  // Collect lessons available for justification modal dropdown
  const justifiableLessons = lessons.filter(l => {
    if (l.status === 'cancelled') return false;
    
    // Check window
    if (!isLessonWithinJustificationWindow(l.date, now)) return false;
    
    const att = attendance.find(a => a.date.substring(0, 10) === l.date);
    if (att) {
      if (att.type === 'presence' || att.verified) return false;
      if (att.justification) return false;
    }
    return true;
  });

  const formatDate = (d: string) => {
    try {
      const date = new Date(d.length === 10 ? d + 'T12:00:00' : d);
      return date.toLocaleDateString('pt-BR');
    } catch {
      return d;
    }
  };

  const formatDateFull = (d: string) => {
    try {
      const date = new Date(d.length === 10 ? d + 'T12:00:00' : d);
      return date.toLocaleDateString('pt-BR', {
        weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
      });
    } catch {
      return d;
    }
  };

  const parseJustification = (j?: string): string | null => {
    if (!j) return null;
    try {
      const parsed = JSON.parse(j);
      return parsed.motivo || j;
    } catch {
      return j;
    }
  };

  return (
    <div className="page-container">
      <style>{`
        @keyframes blink-status {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }
      `}</style>
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="page-title">Frequência</h1>
            <p className="page-subtitle">Acompanhe sua presença nas aulas</p>
          </div>

          <button
            className="btn-primary"
            onClick={() => openJustifyModal()}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.75rem 1.25rem', fontSize: '0.875rem',
            }}
          >
            <AlertTriangle size={18} />
            Justificar Falta
          </button>
        </div>
      </div>

      {/* Success message */}
      {successMsg && (
        <div className="animate-fade-in" style={{
          background: 'var(--bg-success-alpha)', border: '1px solid var(--border-success-alpha)',
          borderRadius: 12, padding: '1rem', marginBottom: '1rem',
          color: 'var(--color-success)', fontSize: '0.875rem', fontWeight: 500,
          display: 'flex', alignItems: 'center', gap: '0.5rem',
        }}>
          ✅ {successMsg}
        </div>
      )}

      {/* Stats */}
      <div className="stagger-children" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%', margin: '0 auto 0.75rem',
            background: `conic-gradient(${percentage >= 75 ? 'var(--color-primary)' : 'var(--color-warning)'} ${percentage * 3.6}deg, var(--color-surface) 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', background: 'var(--color-surface-light)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '1rem',
            }}>
              {percentage}%
            </div>
          </div>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500 }}>
            FREQUÊNCIA TOTAL
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-success)' }}>{presences}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: 4 }}>
            PRESENÇAS
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-danger)' }}>{absences}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: 4 }}>
            FALTAS
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{totalRecords}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: 4 }}>
            TOTAL DE REGISTROS
          </p>
        </div>
      </div>

      {/* List */}
      {sortedItems.length === 0 ? (
        <div className="glass-card animate-fade-in" style={{
          padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)',
        }}>
          <CalendarCheck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>Nenhuma aula encontrada no cronograma</p>
        </div>
      ) : (
        <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Status de Aula</th>
                  <th>Presença</th>
                  <th>Justificativa</th>
                </tr>
              </thead>
              <tbody>
                {sortedItems.map((item, idx) => {
                  const { lesson, attendance: att } = item;
                  const isPresent = att ? (att.type === 'presence' || att.verified) : false;
                  const justText = parseJustification(att?.justification);
                  const isJustificationAccepted = att?.justificationAccepted === true;
                  const dateStr = lesson.date;
                  
                  const { isInProgress, isCompleted } = getLessonTimeStatus(lesson, now);

                  const isWithinWindow = isLessonWithinJustificationWindow(dateStr, now);
                  const canJustify = !isPresent && isWithinWindow && !justText && lesson.status !== 'cancelled';

                  return (
                    <tr key={lesson.id} style={{
                      animation: `fadeIn 0.3s ease-out ${idx * 0.03}s forwards`,
                      opacity: 0,
                      backgroundColor: isJustificationAccepted ? 'rgba(251, 191, 36, 0.12)' : 'transparent',
                    }}>
                      <td>{formatDateFull(lesson.date)}</td>
                      <td>
                        {lesson.status === 'cancelled' ? (
                          <span style={{
                            background: 'var(--color-danger)', color: 'white',
                            padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                          }}>
                            CANCELADA
                          </span>
                        ) : isInProgress ? (
                           <span style={{
                             background: 'var(--color-info)', color: 'white',
                             padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                             display: 'inline-flex', alignItems: 'center', gap: 4,
                             animation: 'blink-status 1.5s infinite'
                           }}>
                             <Clock size={12} /> EM ANDAMENTO
                           </span>
                        ) : isCompleted ? (
                           <span style={{
                             background: 'var(--color-success)', color: 'white',
                             padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                             display: 'inline-flex', alignItems: 'center', gap: 4
                           }}>
                             <CheckCircle2 size={12} /> CONCLUÍDA
                           </span>
                        ) : (
                           <span style={{
                             background: 'var(--color-border)', color: 'var(--color-text-secondary)',
                             padding: '4px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                           }}>
                             AGENDADA
                           </span>
                        )}
                      </td>
                      <td>
                        {att ? (
                          isPresent ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-success)' }}>
                              <CheckCircle2 size={16} /> Presente
                            </span>
                          ) : isJustificationAccepted ? (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-warning)' }}>
                              <AlertTriangle size={16} /> Falta justificada
                            </span>
                          ) : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-danger)' }}>
                              <XCircle size={16} /> Falta
                            </span>
                          )
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.85rem' }}>
                            {isCompleted ? 'Não registrado' : 'Aguardando'}
                          </span>
                        )}
                      </td>
                      <td>
                        {justText ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', color: isJustificationAccepted ? 'var(--color-success)' : 'var(--color-text-secondary)' }}>
                            <FileText size={14} color="currentColor" />
                            {isJustificationAccepted ? 'Justificativa Aceita' : 'Em Análise'}
                          </span>
                        ) : canJustify ? (
                          <button
                            onClick={() => openJustifyModal(dateStr)}
                            style={{
                              fontSize: '0.75rem', padding: '0.375rem 0.75rem', borderRadius: 8,
                              background: 'rgba(239, 68, 68, 0.1)', color: 'var(--color-danger)',
                              border: '1px solid rgba(239, 68, 68, 0.3)',
                              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.35rem',
                              fontFamily: 'Inter, sans-serif', fontWeight: 500,
                              transition: 'all 0.2s ease',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'; }}
                          >
                            <Send size={14} />
                            Justificar
                          </button>
                        ) : (
                          <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========== MODAL DE JUSTIFICATIVA ========== */}
      {showJustifyModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'var(--overlay-bg)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem',
        }}>
          <div className="glass-card animate-scale-in" style={{
            width: '100%', maxWidth: 500, padding: '2rem',
            background: 'var(--color-surface)',
          }}>
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '1.5rem',
            }}>
              <div>
                <h3 style={{ fontWeight: 700, fontSize: '1.1rem' }}>Justificar Falta</h3>
                <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                  Selecione a data e descreva o motivo
                </p>
              </div>
              <button
                onClick={closeModal}
                style={{
                  background: 'var(--color-surface-light)', border: '1px solid var(--glass-border)',
                  borderRadius: 8, width: 32, height: 32, display: 'flex',
                  alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer', color: 'var(--color-text-secondary)',
                }}
              >
                <X size={18} />
              </button>
            </div>

            {error && (
              <div style={{
                background: 'var(--bg-danger-alpha)', color: 'var(--color-danger)',
                padding: '0.75rem', borderRadius: 8, fontSize: '0.8125rem', marginBottom: '1rem',
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleJustify} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                  Data da aula *
                </label>
                <div style={{ position: 'relative' }}>
                  <select
                    className="input-field"
                    value={selectedDate}
                    onChange={e => setSelectedDate(e.target.value)}
                    style={{
                      appearance: 'none', paddingRight: '2.5rem',
                      cursor: 'pointer', width: '100%',
                    }}
                  >
                    <option value="">— Selecione a data da aula —</option>
                    {justifiableLessons
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map(l => (
                        <option key={l.id} value={l.date}>
                          {formatDateFull(l.date)}
                        </option>
                      ))
                    }
                  </select>
                  <ChevronDown size={18} style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    pointerEvents: 'none', color: 'var(--color-text-secondary)',
                  }} />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                  Motivo da ausência *
                </label>
                <textarea
                  className="input-field"
                  rows={4}
                  placeholder="Descreva o motivo da sua falta (ex: Atestado médico, problema familiar...)"
                  value={justificationText}
                  onChange={e => setJustificationText(e.target.value)}
                  style={{ resize: 'vertical' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.8125rem', fontWeight: 500, color: 'var(--color-text-secondary)', marginBottom: '0.5rem', display: 'block' }}>
                  Anexar documento (opcional)
                </label>
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileChange}
                  className="input-field"
                  style={{ padding: '0.5rem' }}
                />
                {justificationFile && (
                  <p style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>
                    ✅ Arquivo carregado com sucesso
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', paddingTop: '0.5rem' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeModal}
                  disabled={submitLoading}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={submitLoading}
                  style={{ minWidth: 120, display: 'flex', alignItems: 'center', gap: '0.35rem', justifyContent: 'center' }}
                >
                  {submitLoading ? (
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  ) : (
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
