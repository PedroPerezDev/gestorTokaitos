import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { api } from '../lib/api';
import { MusicianSelector } from './MusicianSelector';
import type { Musician, Performance } from '../lib/supabase';

interface SelectedAttendee {
  type: 'musician' | 'guest';
  id?: string;
  name: string;
  instrument?: string;
  instrumentId?: string;
  instruments?: Array<{ id: string; name: string }>;
}

interface PerformanceFormProps {
  performance?: Performance | null;
  attendees?: any[];
  onClose: () => void;
  onSave: () => void;
}

export function PerformanceForm({ performance, attendees = [], onClose, onSave }: PerformanceFormProps) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [plannedMusicians, setPlannedMusicians] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [totalAmount, setTotalAmount] = useState('');
  const [paymentCollected, setPaymentCollected] = useState(false);
  const [defaultPaymentAmount, setDefaultPaymentAmount] = useState('');
  const [selectedAttendees, setSelectedAttendees] = useState<SelectedAttendee[]>([]);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadMusicians();
    if (performance) {
      setName(performance.name);
      setDate(performance.date);
      setLocation(performance.location || '');
      setPlannedMusicians(performance.planned_musicians?.toString() || '');
      setIsPaid(performance.is_paid || false);
      setPaymentAmount(performance.payment_amount?.toString() || '');
      setTotalAmount((performance as any).total_amount?.toString() || '');
      setPaymentCollected((performance as any).payment_collected || false);
      setDefaultPaymentAmount((performance as any).default_payment_amount?.toString() || '');

      const mappedAttendees: SelectedAttendee[] = attendees.map((att: any) => {
        if (att.type === 'musician') {
          return {
            type: 'musician',
            id: att.id,
            name: att.name,
            instrument: att.instrument,
            instrumentId: att.instrumentId,
            instruments: att.instruments,
          };
        } else {
          return {
            type: 'guest',
            name: att.name,
            instrument: att.instrument,
          };
        }
      });
      setSelectedAttendees(mappedAttendees);
    }
  }, [performance, attendees]);

  const loadMusicians = async () => {
    try {
      const data = await api.musicians.getAll();
      setMusicians(data);
    } catch (error) {
      console.error('Error loading musicians:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const performanceData = {
        name,
        date,
        location: location || null,
        planned_musicians: plannedMusicians ? parseInt(plannedMusicians) : 0,
        is_paid: isPaid,
        payment_amount: paymentAmount ? parseFloat(paymentAmount) : null,
        total_amount: totalAmount ? parseFloat(totalAmount) : 0,
        payment_collected: paymentCollected,
        default_payment_amount: defaultPaymentAmount ? parseFloat(defaultPaymentAmount) : 0,
        attendees: selectedAttendees.map(att => {
          if (att.type === 'musician' && att.id) {
            return {
              type: 'musician' as const,
              id: att.id,
              instrumentId: att.instrumentId,
            };
          } else {
            return {
              type: 'guest' as const,
              name: att.name,
              instrument: att.instrument,
            };
          }
        }),
      };

      if (performance) {
        await api.performances.update(performance.id, performanceData);
      } else {
        await api.performances.create(performanceData);
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Error al guardar actuación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{performance ? 'Editar Actuación' : 'Nueva Actuación'}</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label htmlFor="name">Nombre de la actuación *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Ej: Concierto de Navidad"
            />
          </div>

          <div className="form-group">
            <label htmlFor="date">Fecha *</label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="location">Ubicación</label>
            <input
              id="location"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ej: Teatro Principal, Madrid"
            />
          </div>

          <div className="form-group">
            <label htmlFor="plannedMusicians">Músicos previstos</label>
            <input
              id="plannedMusicians"
              type="number"
              min="0"
              value={plannedMusicians}
              onChange={(e) => setPlannedMusicians(e.target.value)}
              placeholder="Número de músicos necesarios"
            />
            {plannedMusicians && selectedAttendees.length > 0 && (
              <div style={{ marginTop: '8px', fontSize: '0.9rem', color: 'var(--color-text-muted)' }}>
                <span style={{
                  color: selectedAttendees.length >= parseInt(plannedMusicians)
                    ? '#22c55e'
                    : '#f59e0b'
                }}>
                  {selectedAttendees.length} de {plannedMusicians} músicos confirmados
                </span>
                {selectedAttendees.length < parseInt(plannedMusicians) && (
                  <span style={{ color: '#ef4444', marginLeft: '8px' }}>
                    (Faltan {parseInt(plannedMusicians) - selectedAttendees.length})
                  </span>
                )}
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="totalAmount">Presupuesto (€)</label>
            <input
              id="totalAmount"
              type="number"
              step="any"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="form-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={paymentCollected}
                onChange={(e) => setPaymentCollected(e.target.checked)}
                style={{ width: 'auto', cursor: 'pointer' }}
              />
              <span>Pagado por el cliente</span>
            </label>
          </div>

          <div className="form-group">
            <label htmlFor="defaultPaymentAmount">Importe por defecto por músico (€)</label>
            <input
              id="defaultPaymentAmount"
              type="number"
              step="any"
              value={defaultPaymentAmount}
              onChange={(e) => setDefaultPaymentAmount(e.target.value)}
              placeholder="0.00"
            />
            <small style={{ color: 'var(--color-text-muted)', fontSize: '0.85rem', marginTop: '4px', display: 'block' }}>
              Esta cantidad se asignará automáticamente a cada músico añadido
            </small>
          </div>

          <div className="form-group">
            <label>Asistencia de músicos</label>
            <MusicianSelector
              musicians={musicians}
              selectedAttendees={selectedAttendees}
              onAttendeesChange={setSelectedAttendees}
            />
          </div>

          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancelar
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
