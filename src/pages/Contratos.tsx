import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { FileText, Eye, Printer, X, FileSignature } from 'lucide-react';
import type { Contract } from '../types';

export default function Contratos() {
  const { token } = useAuth();
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingContract, setViewingContract] = useState<Contract | null>(null);
  const [pdfBlobUrl, setPdfBlobUrl] = useState<string | null>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/portal/contratos', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        setContracts(data.contracts || []);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchData();
  }, [token]);

  const generateContractPDF = async (contract: Contract) => {
    try {
      // @ts-ignore
      const { jsPDF } = await import('jspdf');
      const doc = new jsPDF();
      
      const res = await fetch('/api/portal/escola');
      const schoolData = await res.json();
      const schoolName = schoolData?.name || 'Escola';

      doc.setFontSize(16);
      doc.text(schoolName, 105, 20, { align: 'center' });
      
      doc.setFontSize(14);
      doc.text(contract.title, 105, 30, { align: 'center' });
      
      doc.setFontSize(12);
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = contract.content || '';
      const textContent = tempDiv.textContent || tempDiv.innerText || '';
      
      const lines = doc.splitTextToSize(textContent, 170);
      
      let y = 45;
      for (let i = 0; i < lines.length; i++) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(lines[i], 20, y);
        y += 7;
      }
      
      const blobUrl = doc.output('bloburl');
      setPdfBlobUrl(blobUrl as string);
    } catch (err) {
      console.error('Failed to generate PDF:', err);
      // Fallback
    }
  };

  const handleOpenModal = (contract: Contract) => {
    setViewingContract(contract);
    setPdfBlobUrl(null);
    generateContractPDF(contract);
  };

  const closeModal = () => {
    setViewingContract(null);
    setPdfBlobUrl(null);
  };

  const formatDate = (d: string) => {
    const date = new Date(d);
    return date.toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="skeleton" style={{ width: 200, height: 32, marginBottom: 24 }} />
        <div className="skeleton" style={{ width: '100%', height: 200, borderRadius: 16 }} />
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="animate-fade-in" style={{ marginBottom: '1.5rem' }}>
        <h1 className="page-title">Contratos</h1>
        <p className="page-subtitle">Seus contratos com a instituição</p>
      </div>

      {contracts.length === 0 ? (
        <div className="glass-card animate-fade-in" style={{
          padding: '3rem', textAlign: 'center', color: 'var(--color-text-secondary)',
        }}>
          <FileText size={48} style={{ opacity: 0.3, marginBottom: '1rem' }} />
          <p>Nenhum contrato encontrado</p>
        </div>
      ) : (
        <div className="stagger-children" style={{
          display: 'grid', gap: '1rem',
        }}>
          {contracts.map(contract => (
            <div key={contract.id} className="glass-card" style={{
              padding: '1.5rem', display: 'flex', alignItems: 'center',
              justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'var(--bg-primary-alpha)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                }}>
                  <FileText size={24} color="var(--color-primary-light)" />
                </div>
                <div>
                  <h3 style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{contract.title}</h3>
                  <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-secondary)', marginTop: 2 }}>
                    Emitido em {formatDate(contract.createdAt)}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  className="btn-primary"
                  onClick={() => handleOpenModal(contract)}
                  style={{ fontSize: '0.8125rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}
                >
                  <FileSignature size={16} /> Ver Contrato Atual
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {viewingContract && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 2000, padding: '1rem',
        }}
          onClick={closeModal}
        >
          <div className="glass-card animate-scale-in" style={{
            width: '100%', maxWidth: '896px', height: '80vh',
            display: 'flex', flexDirection: 'column',
          }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--glass-border)',
            }}>
              <h3 style={{ fontWeight: 600 }}>{viewingContract.title}</h3>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button
                  onClick={closeModal}
                  style={{
                    width: 36, height: 36, borderRadius: 10, border: 'none',
                    background: 'var(--color-surface-lighter)', color: 'var(--color-text)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  <X size={18} />
                </button>
              </div>
            </div>
            
            <div style={{ flex: 1, padding: 0, overflow: 'hidden' }}>
              {pdfBlobUrl ? (
                <iframe 
                  src={pdfBlobUrl} 
                  style={{ width: '100%', height: '100%', border: 'none', borderBottomLeftRadius: '1rem', borderBottomRightRadius: '1rem' }} 
                  title="PDF Contract Viewer"
                />
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-secondary)' }}>
                  Gerando PDF...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
