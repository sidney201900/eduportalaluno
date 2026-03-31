import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { BookOpen } from 'lucide-react';
import type { Grade, Subject } from '../types';

interface GradeWithSubject extends Grade {
  subjectName: string;
}

export default function Notas() {
  const { token } = useAuth();
  const [grades, setGrades] = useState<GradeWithSubject[]>([]);
  const [periods, setPeriods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/portal/notas', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setGrades(data.grades || []);
        setPeriods(data.periods || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 300, borderRadius: 16 }} />
      </div>
    );
  }

  // Group grades by subject
  const subjects = [...new Set(grades.map(g => g.subjectId))];
  const subjectNames: Record<string, string> = {};
  grades.forEach(g => { subjectNames[g.subjectId] = g.subjectName; });

  const getGradeColor = (value: number) => {
    if (value >= 7) return 'var(--color-success)';
    if (value >= 5) return 'var(--color-warning)';
    return 'var(--color-danger)';
  };

  return (
    <div className="page-container">
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Notas & Boletim</h1>
        <p className="page-subtitle">Acompanhe seu desempenho acadêmico</p>
      </div>

      {grades.length === 0 ? (
        <div className="glass-card animate-fade-in" style={{
          padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)',
        }}>
          <BookOpen size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p style={{ fontSize: '0.9375rem' }}>Nenhuma nota lançada ainda</p>
        </div>
      ) : (
        <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Disciplina</th>
                  {periods.map(p => (
                    <th key={p} style={{ textAlign: 'center' }}>{p}</th>
                  ))}
                  <th style={{ textAlign: 'center' }}>Média</th>
                </tr>
              </thead>
              <tbody>
                {subjects.map((subjectId, idx) => {
                  const subjectGrades = grades.filter(g => g.subjectId === subjectId);
                  const avg = subjectGrades.length > 0
                    ? subjectGrades.reduce((s, g) => s + g.value, 0) / subjectGrades.length
                    : 0;
                  return (
                    <tr key={subjectId} style={{
                      animation: `fadeIn 0.3s ease-out ${idx * 0.05}s forwards`,
                      opacity: 0,
                    }}>
                      <td style={{ fontWeight: 500 }}>
                        {subjectNames[subjectId] || subjectId}
                      </td>
                      {periods.map(period => {
                        const grade = subjectGrades.find(g => g.period === period);
                        return (
                          <td key={period} style={{ textAlign: 'center' }}>
                            {grade ? (
                              <span style={{
                                fontWeight: 700, fontSize: '0.9375rem',
                                color: getGradeColor(grade.value),
                              }}>
                                {grade.value.toFixed(1)}
                              </span>
                            ) : (
                              <span style={{ color: 'var(--color-text-secondary)' }}>—</span>
                            )}
                          </td>
                        );
                      })}
                      <td style={{ textAlign: 'center' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                          width: 48, height: 32, borderRadius: 8,
                          background: avg >= 7 ? 'var(--bg-success-alpha)' : avg >= 5 ? 'var(--bg-warning-alpha)' : 'var(--bg-danger-alpha)',
                          fontWeight: 700, fontSize: '0.9375rem',
                          color: getGradeColor(avg),
                        }}>
                          {avg.toFixed(1)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="animate-fade-in" style={{
        display: 'flex', gap: '1.5rem', marginTop: '1rem',
        fontSize: '0.75rem', color: 'var(--color-text-secondary)',
        flexWrap: 'wrap',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-success)' }} />
          Aprovado (≥ 7.0)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-warning)' }} />
          Recuperação (5.0 - 6.9)
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-danger)' }} />
          Reprovado (&lt; 5.0)
        </span>
      </div>
    </div>
  );
}
