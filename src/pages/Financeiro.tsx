import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ExternalLink, Filter, CreditCard } from 'lucide-react';
import type { Payment, Boleto } from '../types';

type FilterType = 'all' | 'pending' | 'paid' | 'overdue';

export default function Financeiro() {
  const { token } = useAuth();
  const [payments, setPayments] = useState<Payment[]>([]);
  const [boletos, setBoletos] = useState<Boleto[]>([]);
  const [filter, setFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [payRes, bolRes] = await Promise.all([
          fetch('/api/portal/financeiro', { headers }),
          fetch('/api/portal/boletos', { headers }),
        ]);
        const payData = await payRes.json();
        const bolData = await bolRes.json();
        setPayments(payData.payments || []);
        setBoletos(bolData.boletos || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  const filtered = payments.filter(p => {
    if (filter === 'all') return true;
    return p.status === filter;
  });

  const sorted = [...filtered].sort((a, b) =>
    new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
  );

  const formatCurrency = (val: number) =>
    val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const formatDate = (d: string) => {
    const date = new Date(d + 'T00:00:00');
    return date.toLocaleDateString('pt-BR');
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { className: string; label: string }> = {
      paid: { className: 'badge badge-success', label: 'Pago' },
      pending: { className: 'badge badge-warning', label: 'Pendente' },
      overdue: { className: 'badge badge-danger', label: 'Atrasado' },
    };
    const s = map[status] || { className: 'badge badge-info', label: status };
    return <span className={s.className}>{s.label}</span>;
  };

  const getBoletoLink = (payment: Payment) => {
    if (payment.asaasPaymentUrl) return payment.asaasPaymentUrl;
    const boleto = boletos.find(b =>
      b.asaas_payment_id === payment.asaasPaymentId
    );
    return boleto?.link_boleto || null;
  };

  const totalPending = payments
    .filter(p => p.status === 'pending' || p.status === 'overdue')
    .reduce((s, p) => s + (p.amount - (p.discount || 0)), 0);

  const totalPaid = payments
    .filter(p => p.status === 'paid')
    .reduce((s, p) => s + (p.amount - (p.discount || 0)), 0);

  const filters: { key: FilterType; label: string }[] = [
    { key: 'all', label: 'Todos' },
    { key: 'pending', label: 'Pendentes' },
    { key: 'paid', label: 'Pagos' },
    { key: 'overdue', label: 'Atrasados' },
  ];

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 400, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Financeiro</h1>
        <p className="page-subtitle">Acompanhe seus pagamentos e boletos</p>
      </div>

      {/* Summary Cards */}
      <div className="stagger-children" style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
        gap: '1rem', marginBottom: '1.5rem',
      }}>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '0.5rem' }}>
            TOTAL EM ABERTO
          </p>
          <p style={{ fontSize: '1.375rem', fontWeight: 700, color: totalPending > 0 ? '#fbbf24' : '#34d399' }}>
            {formatCurrency(totalPending)}
          </p>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '0.5rem' }}>
            TOTAL PAGO
          </p>
          <p style={{ fontSize: '1.375rem', fontWeight: 700, color: '#34d399' }}>
            {formatCurrency(totalPaid)}
          </p>
        </div>
        <div className="glass-card" style={{ padding: '1.25rem' }}>
          <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: '0.5rem' }}>
            TOTAL DE PARCELAS
          </p>
          <p style={{ fontSize: '1.375rem', fontWeight: 700 }}>
            {payments.length}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '0.5rem',
        marginBottom: '1rem', flexWrap: 'wrap',
      }}>
        <Filter size={16} color="var(--color-text-secondary)" />
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            style={{
              padding: '0.4375rem 0.875rem', borderRadius: 9999,
              border: '1px solid',
              borderColor: filter === f.key ? 'var(--color-primary)' : 'var(--color-border)',
              background: filter === f.key ? 'rgba(99,102,241,0.15)' : 'transparent',
              color: filter === f.key ? 'var(--color-primary-light)' : 'var(--color-text-secondary)',
              fontSize: '0.8125rem', fontWeight: 500, cursor: 'pointer',
              transition: 'all 0.2s ease', fontFamily: 'Inter, sans-serif',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="glass-card animate-fade-in" style={{ overflow: 'hidden' }}>
        {sorted.length === 0 ? (
          <div style={{
            padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)',
          }}>
            <CreditCard size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
            <p style={{ fontSize: '0.9375rem' }}>Nenhum pagamento encontrado</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((payment, idx) => {
                  const link = getBoletoLink(payment);
                  return (
                    <tr key={payment.id} style={{
                      animation: `fadeIn 0.3s ease-out ${idx * 0.04}s forwards`,
                      opacity: 0,
                    }}>
                      <td>
                        <div>
                          <p style={{ fontWeight: 500 }}>
                            {payment.description || `Parcela ${payment.installmentNumber || '—'}`}
                          </p>
                          {payment.totalInstallments && (
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                              {payment.installmentNumber}/{payment.totalInstallments}
                            </p>
                          )}
                        </div>
                      </td>
                      <td>{formatDate(payment.dueDate)}</td>
                      <td style={{ fontWeight: 600 }}>
                        {formatCurrency(payment.amount - (payment.discount || 0))}
                      </td>
                      <td>{getStatusBadge(payment.status)}</td>
                      <td>
                        {link && payment.status !== 'paid' ? (
                          <a
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn-secondary"
                            style={{ fontSize: '0.75rem', padding: '0.375rem 0.75rem', textDecoration: 'none' }}
                          >
                            <ExternalLink size={14} />
                            Ver Boleto
                          </a>
                        ) : payment.status === 'paid' ? (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-success)' }}>✓ Quitado</span>
                        ) : (
                          <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
