import { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, AlertCircle, Info } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import type { Notification as PortalNotification } from '../types';

export default function Notifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<PortalNotification[]>([]);
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

  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/portal/notificacoes', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Erro ao buscar notificações', err);
    }
  }, [token]);

  useEffect(() => {
    fetchNotifications();
    // Polling a cada 30s para simular realtime via SchoolData
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = async (id: string) => {
    try {
      await fetch(`/api/portal/notificacoes/ler/${id}`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Agora';
    try {
      return new Date(dateStr).toLocaleString('pt-BR');
    } catch {
      return dateStr;
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
            fontSize: '0.65rem', fontWeight: 'bold',
          }}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 10px)', right: 0,
          width: 340, background: 'var(--color-surface)',
          border: '1px solid var(--glass-border)', borderRadius: 12,
          boxShadow: '0 10px 25px rgba(0,0,0,0.15)', zIndex: 1000,
          overflow: 'hidden',
        }}
          className="animate-scale-in"
        >
          <div style={{
            padding: '1rem', borderBottom: '1px solid var(--glass-border)',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <h3 style={{ fontSize: '0.9rem', fontWeight: 600 }}>Notificações</h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
              {unreadCount} {unreadCount === 1 ? 'não lida' : 'não lidas'}
            </span>
          </div>

          <div style={{ maxHeight: 380, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                <Bell size={32} style={{ opacity: 0.2, margin: '0 auto 10px' }} />
                <p style={{ fontSize: '0.85rem' }}>Nenhuma notificação</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {notifications.map(notif => {
                  // Detect cancel/repo keywords from title/message for visual cues
                  const msgLower = (notif.title + ' ' + notif.message).toLowerCase();
                  const isCancelamento = msgLower.includes('cancel');
                  const isReposicao = msgLower.includes('reposi');

                  return (
                    <div key={notif.id} style={{
                      padding: '1rem', borderBottom: '1px solid var(--glass-border)',
                      background: notif.read ? 'transparent' : 'var(--bg-primary-alpha)',
                      display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                      transition: 'background 0.2s',
                    }}>
                      <div style={{
                        padding: 8, borderRadius: '50%', flexShrink: 0,
                        background: isCancelamento ? 'var(--bg-danger-alpha)'
                          : isReposicao ? 'var(--bg-success-alpha)'
                          : 'var(--bg-primary-alpha)',
                      }}>
                        {isCancelamento
                          ? <AlertCircle size={16} color="var(--color-danger)" />
                          : <Info size={16} color={isReposicao ? 'var(--color-success)' : 'var(--color-primary)'} />
                        }
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{
                          fontSize: '0.8125rem', fontWeight: 600,
                          color: isCancelamento ? 'var(--color-danger)' : 'var(--color-text)',
                          marginBottom: 2,
                        }}>
                          {notif.title}
                        </p>
                        <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', marginBottom: 4 }}>
                          {notif.message}
                        </p>
                        <span style={{ fontSize: '0.65rem', color: 'var(--color-text-secondary)' }}>
                          {formatDate(notif.createdAt)}
                        </span>
                      </div>
                      {!notif.read && (
                        <button
                          onClick={(e) => { e.stopPropagation(); markAsRead(notif.id); }}
                          title="Marcar como lida"
                          style={{
                            background: 'none', border: 'none', color: 'var(--color-primary)',
                            cursor: 'pointer', padding: 4, borderRadius: 4,
                          }}
                        >
                          <Check size={16} />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
