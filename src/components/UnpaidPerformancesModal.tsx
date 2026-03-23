import { useState, useEffect } from 'react';
import { X, Calendar, MapPin, DollarSign } from 'lucide-react';
import { api } from '../lib/api';

interface UnpaidPerformance {
  amount: number;
  is_paid: boolean;
  performances: {
    id: string;
    name: string;
    date: string;
    location: string | null;
  };
}

interface UnpaidPerformancesModalProps {
  musicianId: string;
  musicianName: string;
  onClose: () => void;
}

export function UnpaidPerformancesModal({ musicianId, musicianName, onClose }: UnpaidPerformancesModalProps) {
  const [performances, setPerformances] = useState<UnpaidPerformance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUnpaidPerformances();
  }, [musicianId]);

  const loadUnpaidPerformances = async () => {
    try {
      const data = await api.payments.getUnpaidPerformancesByMusician(musicianId);
      setPerformances(data);
    } catch (error) {
      console.error('Error loading unpaid performances:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(date);
  };

  const totalUnpaid = performances.reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Actuaciones Pendientes de Cobro</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '1.1rem', marginBottom: '8px' }}>{musicianName}</h3>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#ef4444' }}>
              Total pendiente: {totalUnpaid.toFixed(2)}€
            </div>
          </div>

          {loading ? (
            <div className="loading">Cargando...</div>
          ) : performances.length === 0 ? (
            <div className="empty-state">
              <p>No hay actuaciones pendientes de cobro</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {performances.map((perf) => (
                <div
                  key={perf.performances.id}
                  style={{
                    padding: '16px',
                    backgroundColor: 'var(--color-bg-secondary)',
                    borderRadius: '8px',
                    border: '1px solid var(--color-border)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 600 }}>
                      {perf.performances.name}
                    </h4>
                    <div style={{
                      fontSize: '1.1rem',
                      fontWeight: 'bold',
                      color: '#ef4444',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <DollarSign size={18} />
                      {perf.amount.toFixed(2)}€
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Calendar size={14} />
                      {formatDate(perf.performances.date)}
                    </div>
                    {perf.performances.location && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <MapPin size={14} />
                        {perf.performances.location}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-primary">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
