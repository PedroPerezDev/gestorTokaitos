import { useState, useEffect } from 'react';
import { X, DollarSign, Check, Car } from 'lucide-react';
import { api } from '../lib/api';

interface Musician {
  id: string;
  name: string;
  photo_url?: string;
}

interface MusicianPayment {
  musician_id: string;
  amount: number;
  is_paid: boolean;
  vehicle_payment?: number;
}

interface PaymentModalProps {
  performanceId: string;
  performanceName: string;
  musicians: Musician[];
  totalAmount: number;
  onClose: () => void;
  onSave: () => void;
}

export function PaymentModal({
  performanceId,
  performanceName,
  musicians,
  totalAmount,
  onClose,
  onSave,
}: PaymentModalProps) {
  const [payments, setPayments] = useState<Record<string, number>>({});
  const [vehiclePayments, setVehiclePayments] = useState<Record<string, number>>({});
  const [paidStatus, setPaidStatus] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPayments();
  }, [performanceId]);

  const loadPayments = async () => {
    try {
      const data = await api.payments.getPaymentsByPerformance(performanceId);
      const paymentsMap = data.reduce((acc: Record<string, number>, p: any) => {
        acc[p.musician_id] = p.amount;
        return acc;
      }, {});
      const vehicleMap = data.reduce((acc: Record<string, number>, p: any) => {
        acc[p.musician_id] = p.vehicle_payment || 0;
        return acc;
      }, {});
      const paidMap = data.reduce((acc: Record<string, boolean>, p: any) => {
        acc[p.musician_id] = p.is_paid;
        return acc;
      }, {});
      setPayments(paymentsMap);
      setVehiclePayments(vehicleMap);
      setPaidStatus(paidMap);
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAmountChange = (musicianId: string, value: string) => {
    const amount = value === '' ? 0 : parseFloat(value);
    setPayments(prev => ({ ...prev, [musicianId]: amount }));
  };

  const handleVehiclePaymentChange = (musicianId: string, value: string) => {
    const amount = value === '' ? 0 : parseFloat(value);
    setVehiclePayments(prev => ({ ...prev, [musicianId]: amount }));
  };

  const handleTogglePaid = (musicianId: string) => {
    setPaidStatus(prev => ({ ...prev, [musicianId]: !prev[musicianId] }));
  };

  const handleSave = async () => {
    try {
      for (const musician of musicians) {
        const amount = payments[musician.id] || 0;
        const vehiclePayment = vehiclePayments[musician.id] || 0;
        const isPaid = paidStatus[musician.id] || false;
        await api.payments.setMusicianPayment(performanceId, musician.id, amount, isPaid, vehiclePayment);
      }
      onSave();
      onClose();
    } catch (error) {
      console.error('Error saving payments:', error);
      alert('Error al guardar pagos');
    }
  };

  const totalToPay = Object.keys(payments).reduce((sum, musicianId) => {
    const performanceAmount = payments[musicianId] || 0;
    const vehicleAmount = vehiclePayments[musicianId] || 0;
    return sum + performanceAmount + vehicleAmount;
  }, 0);
  const remaining = totalAmount - totalToPay;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal payment-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Configurar Pagos</h2>
          <button onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="payment-performance-info">
            <h3>{performanceName}</h3>
            <div className="payment-summary">
              <div className="summary-item">
                <span>Presupuesto:</span>
                <strong>{totalAmount.toFixed(2)}€</strong>
              </div>
              <div className="summary-item">
                <span>Total a pagar:</span>
                <strong>{totalToPay.toFixed(2)}€</strong>
              </div>
              <div className={`summary-item remaining ${remaining < 0 ? 'negative' : ''}`}>
                <span>Fondos restantes:</span>
                <strong>{remaining.toFixed(2)}€</strong>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="loading">Cargando...</div>
          ) : (
            <div className="payment-musicians-list">
              {musicians.map((musician) => {
                const isPaid = paidStatus[musician.id] || false;
                const totalForMusician = (payments[musician.id] || 0) + (vehiclePayments[musician.id] || 0);
                return (
                  <div key={musician.id} className={`payment-musician-item ${isPaid ? 'paid' : ''}`}>
                    <div className="payment-musician-info">
                      {musician.photo_url ? (
                        <img src={musician.photo_url} alt={musician.name} className="payment-musician-photo" />
                      ) : (
                        <div className="payment-musician-photo-placeholder">
                          {musician.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div className="payment-musician-details">
                        <span className="payment-musician-name">{musician.name}</span>
                        {totalForMusician > 0 && (
                          <span className="payment-musician-total">Total: {totalForMusician.toFixed(2)}€</span>
                        )}
                      </div>
                    </div>
                    <div className="payment-controls">
                      <div className="payment-input-group">
                        <DollarSign size={16} />
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={payments[musician.id] || ''}
                          onChange={(e) => handleAmountChange(musician.id, e.target.value)}
                          placeholder="Actuación"
                        />
                        <span className="currency">€</span>
                      </div>
                      <div className="payment-input-group vehicle-payment">
                        <Car size={16} />
                        <input
                          type="number"
                          min="0"
                          step="any"
                          value={vehiclePayments[musician.id] || ''}
                          onChange={(e) => handleVehiclePaymentChange(musician.id, e.target.value)}
                          placeholder="Coche"
                        />
                        <span className="currency">€</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleTogglePaid(musician.id)}
                        className={`btn-paid-toggle ${isPaid ? 'paid' : 'unpaid'}`}
                        title={isPaid ? 'Marcar como no pagado' : 'Marcar como pagado'}
                      >
                        {isPaid ? (
                          <>
                            <Check size={16} />
                            <span>Pagado</span>
                          </>
                        ) : (
                          <>
                            <X size={16} />
                            <span>No pagado</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button onClick={onClose} className="btn-secondary">
            Cancelar
          </button>
          <button onClick={handleSave} className="btn-primary">
            <Check size={18} />
            Guardar Pagos
          </button>
        </div>
      </div>
    </div>
  );
}
