import { useState, useEffect } from 'react';
import { Plus, Filter, ArrowUpDown, Settings } from 'lucide-react';
import { MusicianCard } from './MusicianCard';
import { MusicianForm } from './MusicianForm';
import { InstrumentManager } from './InstrumentManager';
import { NotesModal } from './NotesModal';
import { AddToPerformanceModal } from './AddToPerformanceModal';
import { UnpaidPerformancesModal } from './UnpaidPerformancesModal';
import { api } from '../lib/api';
import type { Musician } from '../lib/supabase';

export function MusicianList() {
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [showInstrumentManager, setShowInstrumentManager] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showAddToPerformance, setShowAddToPerformance] = useState(false);
  const [showUnpaidPerformances, setShowUnpaidPerformances] = useState(false);
  const [editingMusician, setEditingMusician] = useState<Musician | null>(null);
  const [selectedMusician, setSelectedMusician] = useState<Musician | null>(null);
  const [filterInstrument, setFilterInstrument] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc' | ''>('');
  const [instruments, setInstruments] = useState<string[]>([]);
  const [pendingPayments, setPendingPayments] = useState<Record<string, number>>({});

  const loadMusicians = async () => {
    setLoading(true);
    try {
      const data = await api.musicians.getAll(
        filterInstrument || undefined,
        sortOrder || undefined
      );
      setMusicians(data);

      const allInstruments = new Set<string>();
      data.forEach(m => {
        if (m.instruments && m.instruments.length > 0) {
          m.instruments.forEach(inst => allInstruments.add(inst.name));
        } else if (m.instrument) {
          allInstruments.add(m.instrument);
        }
      });
      setInstruments(Array.from(allInstruments).sort());

      const paymentsMap: Record<string, number> = {};
      await Promise.all(
        data.map(async (musician) => {
          try {
            const count = await api.payments.getPendingPaymentCount(musician.id);
            if (count > 0) {
              paymentsMap[musician.id] = count;
            }
          } catch (error) {
            console.error(`Error loading payments for ${musician.name}:`, error);
          }
        })
      );
      setPendingPayments(paymentsMap);
    } catch (error) {
      console.error('Error loading musicians:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMusicians();
  }, [filterInstrument, sortOrder]);

  const handleEdit = (musician: Musician) => {
    setEditingMusician(musician);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este músico?')) {
      try {
        await api.musicians.delete(id);
        loadMusicians();
      } catch (error) {
        console.error('Error deleting musician:', error);
        alert('Error al eliminar músico');
      }
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingMusician(null);
    loadMusicians();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingMusician(null);
  };

  const toggleSort = () => {
    if (sortOrder === '') setSortOrder('desc');
    else if (sortOrder === 'desc') setSortOrder('asc');
    else setSortOrder('');
  };

  const handleToggleActive = async (musician: Musician) => {
    try {
      await api.musicians.update(musician.id, { is_active: !musician.is_active });
      loadMusicians();
    } catch (error) {
      console.error('Error toggling active status:', error);
      alert('Error al cambiar el estado del músico');
    }
  };

  const handleViewNotes = (musician: Musician) => {
    setSelectedMusician(musician);
    setShowNotesModal(true);
  };

  const handleSaveNotes = async (notes: string) => {
    if (!selectedMusician) return;
    try {
      await api.musicians.update(selectedMusician.id, { notes });
      loadMusicians();
    } catch (error) {
      console.error('Error saving notes:', error);
      throw error;
    }
  };

  const handleAddToPerformance = (musician: Musician) => {
    setSelectedMusician(musician);
    setShowAddToPerformance(true);
  };

  const handlePerformanceAdded = () => {
    loadMusicians();
  };

  const handleViewUnpaidPerformances = (musician: Musician) => {
    setSelectedMusician(musician);
    setShowUnpaidPerformances(true);
  };

  return (
    <div className="musicians-view">
      <div className="view-header">
        <h1>Músicos</h1>
        <div className="view-header-actions">
          <button
            onClick={() => setShowInstrumentManager(true)}
            className="btn-secondary"
          >
            <Settings size={20} />
            Gestionar Instrumentos
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary"
          >
            <Plus size={20} />
            Nuevo Músico
          </button>
        </div>
      </div>

      <div className="filters">
        <div className="filter-group">
          <Filter size={20} />
          <select
            value={filterInstrument}
            onChange={(e) => setFilterInstrument(e.target.value)}
            className="filter-select"
          >
            <option value="">Todos los instrumentos</option>
            {instruments.map((inst) => (
              <option key={inst} value={inst}>
                {inst}
              </option>
            ))}
          </select>
        </div>

        <button
          onClick={toggleSort}
          className={`btn-filter ${sortOrder ? 'active' : ''}`}
        >
          <ArrowUpDown size={20} />
          Actuaciones
          {sortOrder === 'asc' && ' ↑'}
          {sortOrder === 'desc' && ' ↓'}
        </button>
      </div>

      {loading ? (
        <div className="loading">Cargando músicos...</div>
      ) : musicians.length === 0 ? (
        <div className="empty-state">
          <p>No hay músicos registrados</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Añadir primer músico
          </button>
        </div>
      ) : (
        <div className="musicians-list">
          {musicians.map((musician) => (
            <MusicianCard
              key={musician.id}
              musician={musician}
              pendingPaymentsCount={pendingPayments[musician.id]}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onToggleActive={handleToggleActive}
              onViewNotes={handleViewNotes}
              onAddToPerformance={handleAddToPerformance}
              onViewUnpaidPerformances={handleViewUnpaidPerformances}
            />
          ))}
        </div>
      )}

      {showForm && (
        <MusicianForm
          musician={editingMusician}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}

      {showInstrumentManager && (
        <InstrumentManager
          onClose={() => setShowInstrumentManager(false)}
        />
      )}

      {showNotesModal && selectedMusician && (
        <NotesModal
          musician={selectedMusician}
          onClose={() => {
            setShowNotesModal(false);
            setSelectedMusician(null);
          }}
          onSave={handleSaveNotes}
        />
      )}

      {showAddToPerformance && selectedMusician && (
        <AddToPerformanceModal
          musician={selectedMusician}
          onClose={() => {
            setShowAddToPerformance(false);
            setSelectedMusician(null);
          }}
          onSuccess={handlePerformanceAdded}
        />
      )}

      {showUnpaidPerformances && selectedMusician && (
        <UnpaidPerformancesModal
          musicianId={selectedMusician.id}
          musicianName={selectedMusician.name}
          onClose={() => {
            setShowUnpaidPerformances(false);
            setSelectedMusician(null);
          }}
        />
      )}
    </div>
  );
}
