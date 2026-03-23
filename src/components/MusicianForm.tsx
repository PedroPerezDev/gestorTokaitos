import { useState, useEffect } from 'react';
import { X, Upload, User } from 'lucide-react';
import type { Musician, Instrument } from '../lib/supabase';
import { api } from '../lib/api';

interface MusicianFormProps {
  musician?: Musician | null;
  onClose: () => void;
  onSave: () => void;
}

export function MusicianForm({ musician, onClose, onSave }: MusicianFormProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [instrument, setInstrument] = useState('');
  const [selectedInstrumentIds, setSelectedInstrumentIds] = useState<string[]>([]);
  const [photo, setPhoto] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadInstruments();
    if (musician) {
      setName(musician.name);
      setPhone(musician.phone || '');
      setInstrument(musician.instrument || '');
      setPhotoPreview(musician.photo_url || null);
      if (musician.instruments) {
        setSelectedInstrumentIds(musician.instruments.map(i => i.id));
      }
    }
  }, [musician]);

  const loadInstruments = async () => {
    try {
      const data = await api.instruments.getAll();
      setInstruments(data);
    } catch (error) {
      console.error('Error loading instruments:', error);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setPhoto(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleInstrument = (instrumentId: string) => {
    setSelectedInstrumentIds(prev =>
      prev.includes(instrumentId)
        ? prev.filter(id => id !== instrumentId)
        : [...prev, instrumentId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      let photoUrl = musician?.photo_url || null;

      if (photo) {
        photoUrl = await api.musicians.uploadPhoto(photo);
      }

      const musicianData = {
        name,
        phone: phone || null,
        instrument: instrument || null,
        photo_url: photoUrl,
        instrumentIds: selectedInstrumentIds,
      };

      if (musician) {
        await api.musicians.update(musician.id, musicianData);
      } else {
        await api.musicians.create(musicianData);
      }

      onSave();
    } catch (err: any) {
      setError(err.message || 'Error al guardar músico');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{musician ? 'Editar Músico' : 'Nuevo Músico'}</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-form">
          {error && <div className="error-message">{error}</div>}

          <div className="photo-upload">
            <label htmlFor="photo" className="photo-upload-label">
              {photoPreview ? (
                <img src={photoPreview} alt="Preview" />
              ) : (
                <div className="photo-upload-placeholder">
                  <User size={48} />
                  <span>Subir foto</span>
                </div>
              )}
              <div className="photo-upload-overlay">
                <Upload size={24} />
              </div>
            </label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              style={{ display: 'none' }}
            />
          </div>

          <div className="form-group">
            <label htmlFor="name">Nombre *</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              placeholder="Nombre completo"
            />
          </div>

          <div className="form-group">
            <label htmlFor="phone">Teléfono</label>
            <input
              id="phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+34 600 000 000"
            />
          </div>

          <div className="form-group">
            <label htmlFor="instrument">Instrumento (para compatibilidad)</label>
            <select
              id="instrument"
              value={instrument}
              onChange={(e) => setInstrument(e.target.value)}
            >
              <option value="">Seleccionar instrumento</option>
              {instruments.map((inst) => (
                <option key={inst.id} value={inst.name}>
                  {inst.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Instrumentos que toca</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
              {instruments.map((inst) => (
                <button
                  key={inst.id}
                  type="button"
                  onClick={() => toggleInstrument(inst.id)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '20px',
                    border: selectedInstrumentIds.includes(inst.id) ? '2px solid #10b981' : '2px solid #e5e7eb',
                    background: selectedInstrumentIds.includes(inst.id) ? '#d1fae5' : 'white',
                    color: selectedInstrumentIds.includes(inst.id) ? '#065f46' : '#6b7280',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: selectedInstrumentIds.includes(inst.id) ? '600' : '400',
                    transition: 'all 0.2s',
                  }}
                >
                  {inst.name}
                </button>
              ))}
            </div>
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
