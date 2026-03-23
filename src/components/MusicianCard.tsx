import { Phone, Music, CreditCard as Edit, Trash2, Pause, Check, FileText, Calendar, AlertCircle } from 'lucide-react';
import type { Musician } from '../lib/supabase';

interface MusicianCardProps {
  musician: Musician;
  pendingPaymentsCount?: number;
  onEdit: (musician: Musician) => void;
  onDelete: (id: string) => void;
  onToggleActive: (musician: Musician) => void;
  onViewNotes: (musician: Musician) => void;
  onAddToPerformance: (musician: Musician) => void;
  onViewUnpaidPerformances?: (musician: Musician) => void;
}

export function MusicianCard({ musician, pendingPaymentsCount = 0, onEdit, onDelete, onToggleActive, onViewNotes, onAddToPerformance, onViewUnpaidPerformances }: MusicianCardProps) {
  const handleCall = () => {
    if (musician.phone) {
      window.location.href = `tel:${musician.phone}`;
    }
  };

  const currentYear = new Date().getFullYear();

  return (
    <div className={`musician-list-item ${!musician.is_active ? 'musician-paused' : ''}`}>
      <div className="musician-list-photo">
        {musician.photo_url ? (
          <img src={musician.photo_url} alt={musician.name} />
        ) : (
          <div className="musician-photo-placeholder">
            <Music size={32} />
          </div>
        )}
        {!musician.is_active && (
          <div className="pause-overlay">
            <Pause size={24} />
          </div>
        )}
      </div>

      <div className="musician-list-content">
        <div className="musician-list-header">
          <h3>{musician.name}</h3>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {!musician.is_active && <span className="status-badge paused">En pausa</span>}
            {pendingPaymentsCount > 0 ? (
              <button
                onClick={() => onViewUnpaidPerformances?.(musician)}
                className="status-badge unpaid-warning"
                title={`${pendingPaymentsCount} actuación${pendingPaymentsCount > 1 ? 'es' : ''} pendiente${pendingPaymentsCount > 1 ? 's' : ''} de cobro`}
                style={{ cursor: 'pointer', border: 'none', display: 'flex', alignItems: 'center', gap: '4px' }}
              >
                <AlertCircle size={14} />
                <span>{pendingPaymentsCount} sin cobrar</span>
              </button>
            ) : (
              <span className="status-badge no-pending" style={{
                backgroundColor: '#f0fdf4',
                color: '#16a34a',
                fontSize: '0.75rem',
                padding: '4px 8px',
                borderRadius: '4px'
              }}>
                No tiene nada pendiente
              </span>
            )}
          </div>
        </div>
        <div className="musician-list-info">
          {musician.instruments && musician.instruments.length > 0 ? (
            <div className="info-item">
              <Music size={16} />
              <span>{musician.instruments.map(i => i.name).join(', ')}</span>
            </div>
          ) : musician.instrument && (
            <div className="info-item">
              <Music size={16} />
              <span>{musician.instrument}</span>
            </div>
          )}
          <div className="info-item">
            <span className="badge-performances">
              {musician.times_played || 0} actuaciones en {currentYear}
            </span>
          </div>
        </div>
        <div className="musician-list-actions">
          {musician.phone && (
            <button
              onClick={handleCall}
              className="btn-icon-small"
              title="Llamar"
            >
              <Phone size={18} />
            </button>
          )}
          <button
            onClick={() => onAddToPerformance(musician)}
            className="btn-icon-small btn-primary-outline"
            title="Añadir a actuación"
          >
            <Calendar size={18} />
          </button>
          <button
            onClick={() => onViewNotes(musician)}
            className="btn-icon-small"
            title="Notas"
          >
            <FileText size={18} />
          </button>
          <button
            onClick={() => onEdit(musician)}
            className="btn-icon-small"
            title="Editar"
          >
            <Edit size={18} />
          </button>
          <button
            onClick={() => onToggleActive(musician)}
            className={`btn-icon-small ${musician.is_active ? 'btn-success' : ''}`}
            title={musician.is_active ? 'Pausar músico' : 'Activar músico'}
          >
            {musician.is_active ? <Check size={18} /> : <Pause size={18} />}
          </button>
          <button
            onClick={() => onDelete(musician.id)}
            className="btn-icon-small btn-danger"
            title="Eliminar"
          >
            <Trash2 size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
