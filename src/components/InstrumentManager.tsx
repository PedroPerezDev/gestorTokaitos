import { useState, useEffect } from 'react';
import { Plus, CreditCard as Edit, Trash2, X, Check } from 'lucide-react';
import { api } from '../lib/api';
import type { Instrument } from '../lib/supabase';

interface InstrumentManagerProps {
  onClose: () => void;
}

export function InstrumentManager({ onClose }: InstrumentManagerProps) {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [newInstrument, setNewInstrument] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    loadInstruments();
  }, []);

  const loadInstruments = async () => {
    setLoading(true);
    try {
      const data = await api.instruments.getAll();
      setInstruments(data);
    } catch (error) {
      console.error('Error loading instruments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newInstrument.trim()) return;

    setError('');
    try {
      await api.instruments.create(newInstrument.trim());
      setNewInstrument('');
      loadInstruments();
    } catch (err: any) {
      if (err.message.includes('duplicate')) {
        setError('Este instrumento ya existe');
      } else {
        setError(err.message || 'Error al añadir instrumento');
      }
    }
  };

  const handleEdit = (instrument: Instrument) => {
    setEditingId(instrument.id);
    setEditingName(instrument.name);
    setError('');
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editingName.trim()) return;

    setError('');
    try {
      await api.instruments.update(editingId, editingName.trim());
      setEditingId(null);
      setEditingName('');
      loadInstruments();
    } catch (err: any) {
      if (err.message.includes('duplicate')) {
        setError('Este instrumento ya existe');
      } else {
        setError(err.message || 'Error al actualizar instrumento');
      }
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingName('');
    setError('');
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este instrumento?')) {
      try {
        await api.instruments.delete(id);
        loadInstruments();
      } catch (error) {
        console.error('Error deleting instrument:', error);
        alert('Error al eliminar instrumento');
      }
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Gestionar Instrumentos</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={24} />
          </button>
        </div>

        <div className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <form onSubmit={handleAdd} className="instrument-add-form">
            <input
              type="text"
              value={newInstrument}
              onChange={(e) => setNewInstrument(e.target.value)}
              placeholder="Nombre del instrumento"
              className="instrument-input"
            />
            <button type="submit" className="btn-primary" disabled={!newInstrument.trim()}>
              <Plus size={20} />
              Añadir
            </button>
          </form>

          {loading ? (
            <div className="loading">Cargando instrumentos...</div>
          ) : instruments.length === 0 ? (
            <div className="empty-state-small">
              <p>No hay instrumentos registrados</p>
            </div>
          ) : (
            <div className="instruments-list">
              {instruments.map((instrument) => (
                <div key={instrument.id} className="instrument-item">
                  {editingId === instrument.id ? (
                    <>
                      <input
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        className="instrument-input"
                        autoFocus
                      />
                      <div className="instrument-actions">
                        <button
                          onClick={handleSaveEdit}
                          className="btn-icon"
                          title="Guardar"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="btn-icon"
                          title="Cancelar"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="instrument-name">{instrument.name}</span>
                      <div className="instrument-actions">
                        <button
                          onClick={() => handleEdit(instrument)}
                          className="btn-icon"
                          title="Editar"
                        >
                          <Edit size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(instrument.id)}
                          className="btn-icon btn-danger"
                          title="Eliminar"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
