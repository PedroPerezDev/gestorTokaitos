import { useState, useEffect } from 'react';
import { X, Calendar, Plus } from 'lucide-react';
import { api } from '../lib/api';
import type { Performance, Musician } from '../lib/supabase';

interface AddToPerformanceModalProps {
  musician: Musician;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddToPerformanceModal({ musician, onClose, onSuccess }: AddToPerformanceModalProps) {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    loadPerformances();
  }, []);

  const loadPerformances = async () => {
    try {
      const data = await api.performances.getAll();
      setPerformances(data);
    } catch (error) {
      console.error('Error loading performances:', error);
      setError('Error al cargar actuaciones');
    } finally {
      setLoading(false);
    }
  };

  const handleAddToPerformance = async (performance: Performance) => {
    setAdding(performance.id);
    setError('');

    try {
      const fullPerformance = await api.performances.getById(performance.id);

      const musicianExists = fullPerformance.attendees.some(
        (att: any) => att.type === 'musician' && att.id === musician.id
      );

      if (musicianExists) {
        setError('Este músico ya está en esta actuación');
        setAdding(null);
        return;
      }

      const updatedAttendees = [
        ...fullPerformance.attendees.map((att: any) => {
          if (att.type === 'musician') {
            return { type: 'musician' as const, id: att.id };
          } else {
            return {
              type: 'guest' as const,
              name: att.name,
              instrument: att.instrument,
            };
          }
        }),
        { type: 'musician' as const, id: musician.id },
      ];

      await api.performances.update(performance.id, {
        name: fullPerformance.name,
        date: fullPerformance.date,
        location: fullPerformance.location,
        planned_musicians: fullPerformance.planned_musicians,
        is_paid: fullPerformance.is_paid,
        payment_amount: fullPerformance.payment_amount,
        total_amount: (fullPerformance as any).total_amount,
        payment_collected: (fullPerformance as any).payment_collected,
        default_payment_amount: (fullPerformance as any).default_payment_amount,
        attendees: updatedAttendees,
      });

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error adding musician to performance:', err);
      setError(err.message || 'Error al añadir músico a actuación');
    } finally {
      setAdding(null);
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

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Añadir a Actuación</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <p className="modal-subtitle">
            Selecciona una actuación para añadir a <strong>{musician.name}</strong>
          </p>

          {error && <div className="error-message">{error}</div>}

          {loading ? (
            <div className="loading">Cargando actuaciones...</div>
          ) : performances.length === 0 ? (
            <div className="empty-state-small">
              <p>No hay actuaciones disponibles</p>
            </div>
          ) : (
            <div className="performance-select-list">
              {performances.map((performance) => (
                <button
                  key={performance.id}
                  className="performance-select-item"
                  onClick={() => handleAddToPerformance(performance)}
                  disabled={adding !== null}
                >
                  <div className="performance-select-info">
                    <span className="performance-select-name">{performance.name}</span>
                    <div className="performance-select-date">
                      <Calendar size={14} />
                      <span>{formatDate(performance.date)}</span>
                    </div>
                  </div>
                  {adding === performance.id ? (
                    <span className="adding-text">Añadiendo...</span>
                  ) : (
                    <Plus size={20} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
