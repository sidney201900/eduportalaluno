import { useEffect, useState } from 'react';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Aula } from '../types';

export default function MinhasAulas() {
  const { token } = useAuth();
  const [aulas, setAulas] = useState<Aula[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/portal/aulas', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.aulas) {
          setAulas(data.aulas);
        }
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
        <div className="skeleton" style={{ width: 250, height: 32, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 16 }} />
      </div>
    );
  }

  // Ordenar por data (ignorando os nulls se baseando no time)
  const sortedAulas = [...aulas].sort((a, b) => 
    new Date(a.data || 0).getTime() - new Date(b.data || 0).getTime()
  );

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    try {
      // ajusta timezone issue para string do tipo YYYY-MM-DD
      const date = new Date(dateStr + "T12:00:00");
      return date.toLocaleDateString('pt-BR');
    } catch {
      return dateStr;
    }
  };

  const formatTime = (timeStr?: string) => {
    if (!timeStr) return '';
    return timeStr.substring(0, 5); // Ex: "08:00:00" -> "08:00"
  };

  return (
    <div className="page-container">
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Cronograma de Aulas</h1>
        <p className="page-subtitle">Acompanhe suas aulas e reposições agendadas</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} className="animate-fade-in stagger-children">
        {sortedAulas.length === 0 ? (
          <div className="glass-card" style={{ padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
            <CalendarIcon size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p>Nenhuma aula encontrada no cronograma.</p>
          </div>
        ) : (
          sortedAulas.map(aula => {
            const isCancelada = aula.status === 'cancelada';
            const isReposicao = aula.tipo === 'reposicao';

            return (
              <div 
                key={aula.id} 
                className="glass-card" 
                style={{ 
                  padding: '1.5rem', 
                  opacity: isCancelada ? 0.6 : 1,
                  borderLeft: isCancelada ? '4px solid var(--color-danger)' : isReposicao ? '4px solid var(--color-success)' : '4px solid var(--color-primary)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1rem' }}>
                  
                  <div>
                    <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--color-text)', marginBottom: '0.25rem' }}>
                      {aula.disciplina_nome || 'Aula Regular'}
                    </h3>
                    
                    <div style={{ display: 'flex', gap: '1rem', color: 'var(--color-text-secondary)', fontSize: '0.875rem', flexWrap: 'wrap' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CalendarIcon size={16} />
                        <span>🗓️ {formatDate(aula.data || '')}</span>
                      </div>
                      
                      {(aula.horario_inicio || aula.horario_fim) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={16} />
                          <span>
                            ⏰ {formatTime(aula.horario_inicio)} {aula.horario_fim && `às ${formatTime(aula.horario_fim)}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                    {isCancelada && (
                      <span style={{ 
                        background: 'var(--color-danger)', color: 'white', 
                        padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600
                      }}>
                        CANCELADA {aula.motivo ? `- ${aula.motivo}` : ''}
                      </span>
                    )}

                    {isReposicao && (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                        <span style={{ 
                          background: 'var(--color-success)', color: 'white', 
                          padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600
                        }}>
                          AULA DE REPOSIÇÃO
                        </span>
                        {aula.data_da_original && (
                          <span style={{ fontSize: '0.7rem', color: 'var(--color-text-secondary)', marginTop: '4px' }}>
                            Reposição da aula de {formatDate(aula.data_da_original)}
                          </span>
                        )}
                      </div>
                    )}
                    
                    {!isCancelada && !isReposicao && aula.status === 'realizada' && (
                      <span style={{ 
                        background: 'var(--color-border)', color: 'var(--color-text-secondary)', 
                        padding: '4px 8px', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600
                      }}>
                        CONCLUÍDA
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
