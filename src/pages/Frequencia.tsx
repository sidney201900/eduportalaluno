import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { CalendarCheck, CheckCircle2, XCircle, FileText, Send, X, Loader2 } from 'lucide-react';
import type { Attendance } from '../types';

export default function Frequencia() {
  const { token } = useAuth();
  const [attendance, setAttendance] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [justifyingId, setJustifyingId] = useState<string | null>(null);
  const [justificationText, setJustificationText] = useState('');
  const [submitLoading, setSubmitLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/portal/frequencia', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setAttendance(data.attendance || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  const handleJustify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificationText.trim()) {
      setError('A justificativa é obrigatória');
      return;
    }
    
    setSubmitLoading(true);
    setError('');
    
    try {
      const res = await fetch(`/api/portal/frequencia/justificar/${justifyingId}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ justification: justificationText }),
      });
      
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Erro ao enviar justificativa');
      }
      
      const { record } = await res.json();
      
      // Update local state
      setAttendance(prev => prev.map(a => a.id === record.id ? record : a));
      
      // Close modal
      setJustifyingId(null);
      setJustificationText('');
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

  const totalRecords = attendance.length;
  const presences = attendance.filter(a => a.type === 'presence' || a.verified).length;
  const absences = totalRecords - presences;
  const percentage = totalRecords > 0 ? Math.round((presences / totalRecords) * 100) : 100;

  const sorted = [...attendance].sort((a, b) =>
    new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR', {
      weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric',
    });
  };

  return (
    <div className="page-container">
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Frequência</h1>
        <p className="page-subtitle">Acompanhe sua presença nas aulas</p>
      </div>

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
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#34d399' }}>{presences}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: 4 }}>
            PRESENÇAS
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 700, color: '#f87171' }}>{absences}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: 4 }}>
            FALTAS
          </p>
        </div>

        <div className="glass-card" style={{ padding: '1.25rem', textAlign: 'center' }}>
          <p style={{ fontSize: '2rem', fontWeight: 700 }}>{totalRecords}</p>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginTop: 4 }}>
            TOTAL DE AULAS
          </p>
        </div>
      </div>

      {/* List */}
      {sorted.length === 0 ? (
        <div className="glass-card animate-fade-in" style={{
          padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)',
        }}>
          <CalendarCheck size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>Nenhum registro de frequência encontrado</p>
        </div>
      ) : (
        <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Justificativa</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((record, idx) => {
                  const isPresent = record.type === 'presence' || record.verified;
                  return (
                    <tr key={record.id} style={{
                      animation: `fadeIn 0.3s ease-out ${idx * 0.03}s forwards`,
                      opacity: 0,
                    }}>
                      <td>{formatDate(record.date)}</td>
                      <td>
                        {isPresent ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#34d399' }}>
                            <CheckCircle2 size={16} /> Presente
                          </span>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#f87171' }}>
                            <XCircle size={16} /> Falta
                          </span>
                        )}
                      </td>
                      <td>
                        {record.justification ? (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}>
                            <FileText size={14} color="var(--color-accent)" />
                            {record.justification}
                          </span>
                        ) : !isPresent ? (
                          <button
                            className="btn-secondary"
                            onClick={() => { setJustifyingId(record.id); setError(''); }}
                            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem' }}
                          >
                            <Send size={14} />
                            Justificar Falta
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

      {/* Modal de Justificativa */}
      {justifyingId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem',
        }}>
          <div className="glass-card animate-scale-in" style={{
            width: '100%', maxWidth: 450, padding: '1.5rem',
            background: 'var(--color-surface)',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              marginBottom: '1rem',
            }}>
              <h3 style={{ fontWeight: 600 }}>Justificar Falta</h3>
              <button
                onClick={() => setJustifyingId(null)}
                style={{
                  background: 'none', border: 'none', color: 'var(--color-text-secondary)',
                  cursor: 'pointer',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.12)', color: '#f87171',
                padding: '0.75rem', borderRadius: 8, fontSize: '0.8125rem', marginBottom: '1rem',
              }}>
                {error}
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

              <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setJustifyingId(null)}
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
                  {submitLoading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Enviar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
