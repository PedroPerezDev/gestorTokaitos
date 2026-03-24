import { useState, useEffect } from 'react';
import { Plus, Calendar, Users, CreditCard as Edit, Trash2, DollarSign, Check, X, Wallet, FileText, Download, ChevronDown } from 'lucide-react';
import { PerformanceForm } from './PerformanceForm';
import { PaymentModal } from './PaymentModal';
import { api } from '../lib/api';
import type { Performance, PerformanceWithAttendees } from '../lib/supabase';
import { generateFullPerformancePDF, generateMusiciansOnlyPDF } from '../lib/pdfGenerator';

type FilterType = 'all' | 'collected' | 'not-collected' | 'paid-musicians' | 'unpaid-musicians';

export function PerformanceList() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingPerformance, setEditingPerformance] = useState<PerformanceWithAttendees | null>(null);
  const [paymentPerformance, setPaymentPerformance] = useState<Performance | null>(null);
  const [filter, setFilter] = useState<FilterType>('all');
  const [filterDropdownOpen, setFilterDropdownOpen] = useState(false);

  const loadPerformances = async () => {
    setLoading(true);
    try {
      const data = await api.performances.getAll();
      setPerformances(data);
    } catch (error) {
      console.error('Error loading performances:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPerformances();
  }, []);

  const handleEdit = async (performance: Performance) => {
    try {
      const fullPerformance = await api.performances.getById(performance.id);
      setEditingPerformance(fullPerformance);
      setShowForm(true);
    } catch (error) {
      console.error('Error loading performance details:', error);
      alert('Error al cargar detalles de la actuación');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta actuación?')) {
      try {
        await api.performances.delete(id);
        loadPerformances();
      } catch (error) {
        console.error('Error deleting performance:', error);
        alert('Error al eliminar actuación');
      }
    }
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingPerformance(null);
    loadPerformances();
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingPerformance(null);
  };

  const handleToggleCollected = async (performance: Performance) => {
    try {
      const fullPerformance = await api.performances.getById(performance.id);

      const attendees = fullPerformance.attendees.map((att: any) => {
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
      });

      await api.performances.update(performance.id, {
        name: performance.name,
        date: performance.date,
        location: performance.location,
        planned_musicians: performance.planned_musicians,
        is_paid: performance.is_paid,
        payment_amount: performance.payment_amount,
        total_amount: performance.total_amount,
        payment_collected: !performance.payment_collected,
        default_payment_amount: performance.default_payment_amount,
        attendees,
      });
      loadPerformances();
    } catch (error) {
      console.error('Error updating payment status:', error);
      alert('Error al actualizar estado de cobro');
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

  const getMusicians = (performance: any) => {
    if (!performance.attendance) return [];
    return performance.attendance
      .filter((att: any) => att.musician_id && att.musicians)
      .map((att: any) => att.musicians);
  };

  const getMusicianCount = (performance: any) => {
    const musicians = getMusicians(performance);
    const guests = performance.attendance?.filter((att: any) => att.guest_name).length || 0;
    return musicians.length + guests;
  };

  const getTotalToPay = (performance: any) => {
    if (!performance.musician_payments) return 0;
    return performance.musician_payments.reduce((sum: number, p: any) => {
      const performanceAmount = parseFloat(p.amount) || 0;
      const vehicleAmount = parseFloat(p.vehicle_payment) || 0;
      return sum + performanceAmount + vehicleAmount;
    }, 0);
  };

  const getTotalPaid = (performance: any) => {
    if (!performance.musician_payments) return 0;
    return performance.musician_payments
      .filter((p: any) => p.is_paid)
      .reduce((sum: number, p: any) => {
        const performanceAmount = parseFloat(p.amount) || 0;
        const vehicleAmount = parseFloat(p.vehicle_payment) || 0;
        return sum + performanceAmount + vehicleAmount;
      }, 0);
  };

  const getRemainingFunds = (performance: any) => {
    const totalCollected = performance.total_amount || 0;
    const totalToPay = getTotalToPay(performance);
    return totalCollected - totalToPay;
  };

  const getPaidMusiciansCount = (performance: any) => {
    if (!performance.musician_payments) return 0;
    return performance.musician_payments.filter((p: any) => p.is_paid).length;
  };

  const areAllMusiciansPaid = (performance: any) => {
    const musicianCount = getMusicianCount(performance);
    if (musicianCount === 0) return false;
    const paidCount = getPaidMusiciansCount(performance);
    return paidCount === musicianCount;
  };

  const getCompletionStatus = (performance: any) => {
    const isCollected = performance.payment_collected;
    const musicianCount = getMusicianCount(performance);
    const allPaid = musicianCount > 0 ? areAllMusiciansPaid(performance) : true;

    if (musicianCount === 0) return 'incomplete';
    if (isCollected && allPaid) return 'complete';
    if (!isCollected && !allPaid) return 'incomplete';
    return 'partial';
  };

  const getFilteredPerformances = () => {
    return performances.filter((performance: any) => {
      switch (filter) {
        case 'collected':
          return performance.payment_collected === true;
        case 'not-collected':
          return performance.payment_collected === false;
        case 'paid-musicians':
          return areAllMusiciansPaid(performance);
        case 'unpaid-musicians':
          return !areAllMusiciansPaid(performance) && getMusicianCount(performance) > 0;
        case 'all':
        default:
          return true;
      }
    });
  };

  const handleDownloadFull = async (performance: Performance) => {
    try {
      const fullPerformance = await api.performances.getById(performance.id);
      await generateFullPerformancePDF(fullPerformance);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  const handleDownloadMusicians = async (performance: Performance) => {
    try {
      const fullPerformance = await api.performances.getById(performance.id);
      await generateMusiciansOnlyPDF(fullPerformance);
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF');
    }
  };

  return (
    <div className="performances-view">
      <div className="view-header">
        <h1>Actuaciones</h1>
        <button
          onClick={() => setShowForm(true)}
          className="btn-primary"
        >
          <Plus size={20} />
          Nueva Actuación
        </button>
      </div>

      <div className="filter-bar-desktop" style={{ marginBottom: '24px' }}>
        <button
          onClick={() => setFilter('all')}
          className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
        >
          Todas
        </button>
        <button
          onClick={() => setFilter('collected')}
          className={`filter-btn ${filter === 'collected' ? 'active' : ''}`}
        >
          Cobradas
        </button>
        <button
          onClick={() => setFilter('not-collected')}
          className={`filter-btn ${filter === 'not-collected' ? 'active' : ''}`}
        >
          No cobradas
        </button>
        <button
          onClick={() => setFilter('paid-musicians')}
          className={`filter-btn ${filter === 'paid-musicians' ? 'active' : ''}`}
        >
          Músicos pagados
        </button>
        <button
          onClick={() => setFilter('unpaid-musicians')}
          className={`filter-btn ${filter === 'unpaid-musicians' ? 'active' : ''}`}
        >
          Músicos sin pagar
        </button>
      </div>

      <div className="filter-bar-mobile" style={{ marginBottom: '24px' }}>
        <div className="filter-dropdown">
          <button
            onClick={() => setFilterDropdownOpen(!filterDropdownOpen)}
            className="filter-dropdown-toggle"
          >
            <span>{
              filter === 'all' ? 'Todas' :
              filter === 'collected' ? 'Cobradas' :
              filter === 'not-collected' ? 'No cobradas' :
              filter === 'paid-musicians' ? 'Músicos pagados' :
              'Músicos sin pagar'
            }</span>
            <ChevronDown size={16} />
          </button>
          {filterDropdownOpen && (
            <div className="filter-dropdown-menu">
              <button
                onClick={() => {
                  setFilter('all');
                  setFilterDropdownOpen(false);
                }}
                className={filter === 'all' ? 'active' : ''}
              >
                Todas
              </button>
              <button
                onClick={() => {
                  setFilter('collected');
                  setFilterDropdownOpen(false);
                }}
                className={filter === 'collected' ? 'active' : ''}
              >
                Cobradas
              </button>
              <button
                onClick={() => {
                  setFilter('not-collected');
                  setFilterDropdownOpen(false);
                }}
                className={filter === 'not-collected' ? 'active' : ''}
              >
                No cobradas
              </button>
              <button
                onClick={() => {
                  setFilter('paid-musicians');
                  setFilterDropdownOpen(false);
                }}
                className={filter === 'paid-musicians' ? 'active' : ''}
              >
                Músicos pagados
              </button>
              <button
                onClick={() => {
                  setFilter('unpaid-musicians');
                  setFilterDropdownOpen(false);
                }}
                className={filter === 'unpaid-musicians' ? 'active' : ''}
              >
                Músicos sin pagar
              </button>
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="loading">Cargando actuaciones...</div>
      ) : performances.length === 0 ? (
        <div className="empty-state">
          <p>No hay actuaciones registradas</p>
          <button onClick={() => setShowForm(true)} className="btn-primary">
            Añadir primera actuación
          </button>
        </div>
      ) : (
        <div className="performances-grid">
          {getFilteredPerformances().map((performance: any) => {
            const musicians = getMusicians(performance);
            const musicianCount = getMusicianCount(performance);
            const totalToPay = getTotalToPay(performance);
            const totalPaid = getTotalPaid(performance);
            const remaining = getRemainingFunds(performance);
            const paidMusiciansCount = getPaidMusiciansCount(performance);
            const allMusiciansPaid = areAllMusiciansPaid(performance);
            const completionStatus = getCompletionStatus(performance);

            return (
              <div key={performance.id} className={`performance-card-new status-${completionStatus}`}>
                <div className="performance-card-header">
                  <div className="performance-title-row">
                    <h3>{performance.name}</h3>
                    <button
                      onClick={() => handleToggleCollected(performance)}
                      className={`payment-collected-badge ${performance.payment_collected ? 'collected' : 'pending'}`}
                      title={performance.payment_collected ? 'Cobrada del cliente' : 'Pendiente de cobro del cliente'}
                    >
                      {performance.payment_collected ? (
                        <>
                          <Check size={14} />
                          <span>Cobrada</span>
                        </>
                      ) : (
                        <>
                          <X size={14} />
                          <span>Pendiente</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="performance-date-row">
                    <Calendar size={14} />
                    <span>{formatDate(performance.date)}</span>
                  </div>
                  {performance.location && (
                    <div className="performance-location" style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginTop: '4px' }}>
                      📍 {performance.location}
                    </div>
                  )}
                </div>

                <div className="performance-card-body">
                  <div className="performance-musicians-count">
                    <Users size={16} />
                    <span>{musicianCount} músico{musicianCount !== 1 ? 's' : ''}</span>
                    {musicianCount > 0 && (
                      <span style={{
                        marginLeft: '8px',
                        fontSize: '0.85rem',
                        color: allMusiciansPaid ? '#22c55e' : '#f59e0b',
                        fontWeight: 600,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <DollarSign size={12} />
                        Pagados {paidMusiciansCount}/{musicianCount}
                        {!allMusiciansPaid && musicianCount > 0 && (
                          <span style={{ color: '#ef4444', marginLeft: '4px' }}>
                            - Faltan {musicianCount - paidMusiciansCount}
                          </span>
                        )}
                      </span>
                    )}
                  </div>

                  <div className="performance-payment-info">
                    <div className="payment-row">
                      <span className="payment-label">Presupuesto:</span>
                      <span className="payment-amount">{(performance.total_amount || 0).toFixed(2)}€</span>
                    </div>
                    <div className="payment-row">
                      <span className="payment-label">Total a pagar a músicos:</span>
                      <span className="payment-amount">{totalToPay.toFixed(2)}€</span>
                    </div>
                    <div className="payment-row">
                      <span className="payment-label">Total pagado ya:</span>
                      <span className="payment-amount">{totalPaid.toFixed(2)}€</span>
                    </div>
                    <div className={`payment-row remaining ${remaining < 0 ? 'negative' : ''}`}>
                      <span className="payment-label">Fondos restantes:</span>
                      <span className="payment-amount">{remaining.toFixed(2)}€</span>
                    </div>
                  </div>
                </div>

                <div className="performance-card-actions">
                  <button
                    onClick={() => setPaymentPerformance(performance)}
                    className="btn-action btn-payment"
                    title="Gestionar pagos"
                    disabled={musicians.length === 0}
                  >
                    <Wallet size={16} />
                    Pagos
                  </button>
                  <button
                    onClick={() => handleDownloadFull(performance)}
                    className="btn-action btn-pdf"
                    title="Descargar PDF completo"
                  >
                    <FileText size={16} />
                  </button>
                  <button
                    onClick={() => handleDownloadMusicians(performance)}
                    className="btn-action btn-pdf"
                    title="Descargar PDF de músicos"
                  >
                    <Download size={16} />
                  </button>
                  <button
                    onClick={() => handleEdit(performance)}
                    className="btn-action"
                    title="Editar"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(performance.id)}
                    className="btn-action btn-danger"
                    title="Eliminar"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <PerformanceForm
          performance={editingPerformance}
          attendees={editingPerformance?.attendees}
          onClose={handleCloseForm}
          onSave={handleSave}
        />
      )}

      {paymentPerformance && (
        <PaymentModal
          performanceId={paymentPerformance.id}
          performanceName={paymentPerformance.name}
          musicians={getMusicians(paymentPerformance)}
          totalAmount={paymentPerformance.total_amount || 0}
          onClose={() => setPaymentPerformance(null)}
          onSave={loadPerformances}
        />
      )}
    </div>
  );
}
