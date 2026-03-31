import { useState, useEffect, useRef } from 'react';
import { Bell, Check, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createClient } from '@supabase/supabase-js';
import type { Notificacao } from '../types';

export default function Notifications() {
  const { token, student } = useAuth();
  const [notifications, setNotifications] = useState<Notificacao[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!token || !student) return;

    let supabaseClient: any = null;

    const init = async () => {
      try {
        const [configRes, notifRes] = await Promise.all([
          fetch('/api/portal/config').then(r => r.json()),
          fetch('/api/portal/notificacoes', {
            headers: { Authorization: `Bearer ${token}` }
          }).then(r => r.json())
        ]);
        
        if (notifRes.notificacoes) {
          setNotifications(notifRes.notificacoes);
        }

        if (configRes.supabaseUrl && configRes.supabaseAnonKey) {
          supabaseClient = createClient(configRes.supabaseUrl, configRes.supabaseAnonKey);
          
          supabaseClient
            .channel('portal_notificacoes')
            .on(
              'postgres_changes',
              {
                event: 'INSERT',
                schema: 'public',
                table: 'notificacoes_aluno',
                filter: `aluno_id=eq.${student.id}`
              },
              (payload: any) => {
                const newNotif = payload.new as Notificacao;
                setNotifications(prev => [newNotif, ...prev]);
              }
            )
            .on(
              'postgres_changes',
              {
                event: 'UPDATE',
                schema: 'public',
                table: 'notificacoes_aluno',
                filter: `aluno_id=eq.${student.id}`
              },
              (payload: any) => {
                const updated = payload.new as Notificacao;
                setNotifications(prev => prev.map(n => n.id === updated.id ? updated : n));
              }
            )
            .subscribe();
        }
      } catch (err) {
        console.error('Erro ao inicializar notificações', err);
      }
    };
    
    init();

    return () => {
      if (supabaseClient) supabaseClient.removeAllChannels();
    };
  }, [token, student]);

  const unreadCount = notifications.filter(n => !n.lida).length;

  const markAsRead = async (id: string | number) => {
    try {
      await fetch(`/api/portal/notificacoes/ler/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const getIcon = (tipo: string) => {
    switch (tipo) {
      case 'cancelamento': return <AlertCircle size={16} color="var(--color-danger)" />;
      case 'reposicao': return <Calendar size={16} color="var(--color-success)" />;
      default: return <Bell size={16} color="var(--color-primary)" />;
    }
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
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
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: -4, right: -4,
            background: 'var(--color-danger)', color: 'white',
            width: 18, height: 18, borderRadius: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.65rem', fontWeight: 'bold'
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 320, background: 'var(--color-surface)',
          border: '1px solid var(--glass-border)', borderRadius: 12,
          boxShadow: '0 10px 25px rgba(0,0,0,0.1)', zIndex: 1000,
          overflow: 'hidden'
        }}
          className="animate-scale-in"
        >
          <div style={{
            padding: '1rem', borderBottom: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between'
          }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Notificações</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
            </span>
          </div>

          <div style={{ maxHeight: 350, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <Bell size={32} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                <p style={{ fontSize: '0.85rem' }}>Nenhuma notificação</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map(notif => (
                  <div key={notif.id} style={{
                    padding: '1rem', borderBottom: '1px solid var(--glass-border)',
                    background: notif.lida ? 'transparent' : 'var(--bg-primary-alpha)',
                    display: 'flex', gap: '1rem', alignItems: 'flex-start',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{
                      padding: 8, borderRadius: '50%', flexShrink: 0,
                      background: notif.tipo === 'cancelamento' ? 'var(--bg-danger-alpha)' : notif.tipo === 'reposicao' ? 'var(--bg-success-alpha)' : 'var(--bg-primary-alpha)'
                    }}>
                      {getIcon(notif.tipo)}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: '0.8125rem', color: 'var(--color-text)', marginBottom: 4 }}>
                        {notif.mensagem}
                      </p>
                      <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>
                        {notif.created_at ? new Date(notif.created_at).toLocaleString('pt-BR') : 'Agora'}
                      </span>
                    </div>
                    {!notif.lida && (
                      <button
                        onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                        title="Marcar como lida"
                        style={{
                          background: 'none', border: 'none', color: 'var(--color-primary)',
                          cursor: 'pointer', padding: 4, borderRadius: 4
                        }}
                      >
                        <Check size={16} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
