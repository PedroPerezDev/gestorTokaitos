import { useState } from 'react';
import { X, Save } from 'lucide-react';

interface PerformanceNotesModalProps {
  performanceName: string;
  initialNotes: string;
  onClose: () => void;
  onSave: (notes: string) => void;
}

export function PerformanceNotesModal({ performanceName, initialNotes, onClose, onSave }: PerformanceNotesModalProps) {
  const [notes, setNotes] = useState(initialNotes || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(notes);
      onClose();
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Error al guardar las notas');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Notas de {performanceName}</h2>
          <button onClick={onClose} className="modal-close">
            <X size={24} />
          </button>
        </div>

        <div className="modal-body">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Escribe notas sobre esta actuación..."
            className="notes-textarea"
            rows={10}
          />
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="btn-primary"
            disabled={saving}
          >
            <Save size={20} />
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  );
}
