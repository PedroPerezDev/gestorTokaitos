import { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, Calendar, Award, FileText, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { api } from '../lib/api';
import type { Performance, Musician } from '../lib/supabase';

interface MusicianStats {
  musician: Musician;
  participations: number;
}

export function Statistics() {
  const [performances, setPerformances] = useState<Performance[]>([]);
  const [musicians, setMusicians] = useState<Musician[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUnpaidModal, setShowUnpaidModal] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [performancesData, musiciansData] = await Promise.all([
        api.performances.getAll(),
        api.musicians.getAll(),
      ]);
      setPerformances(performancesData);
      setMusicians(musiciansData);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const availableYears = Array.from(
    new Set(performances.map(p => new Date(p.date).getFullYear()))
  ).sort((a, b) => b - a);

  if (availableYears.length > 0 && !availableYears.includes(selectedYear)) {
    setSelectedYear(availableYears[0]);
  }

  const performancesInYear = performances.filter(
    p => new Date(p.date).getFullYear() === selectedYear
  );

  const totalPerformances = performances.length;
  const paidPerformances = performances.filter(p => p.payment_collected).length;
  const unpaidPerformances = totalPerformances - paidPerformances;
  const unpaidPerformancesList = performances.filter(p => !p.payment_collected);

  const totalRevenue = performances
    .filter(p => p.payment_collected && p.total_amount)
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const pendingRevenue = performances
    .filter(p => !p.payment_collected && p.total_amount)
    .reduce((sum, p) => sum + (p.total_amount || 0), 0);

  const topMusicians = musicians
    .filter(m => m.times_played && m.times_played > 0)
    .sort((a, b) => (b.times_played || 0) - (a.times_played || 0))
    .slice(0, 10);

  const currentYear = new Date().getFullYear();
  const performancesThisYear = performances.filter(
    p => new Date(p.date).getFullYear() === currentYear
  ).length;

  const paidPercentage = totalPerformances > 0 ? (paidPerformances / totalPerformances) * 100 : 0;
  const unpaidPercentage = totalPerformances > 0 ? (unpaidPerformances / totalPerformances) * 100 : 0;

  const monthlyData = Array.from({ length: 12 }, (_, i) => {
    const month = i + 1;
    const count = performancesInYear.filter(p => {
      const date = new Date(p.date);
      return date.getMonth() + 1 === month;
    }).length;
    return { month, count };
  });

  const createPieChart = (paid: number, unpaid: number) => {
    if (paid === 0 && unpaid === 0) return null;

    const total = paid + unpaid;
    const paidPercent = (paid / total) * 100;

    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const paidLength = (paidPercent / 100) * circumference;
    const unpaidLength = circumference - paidLength;

    return (
      <svg className="pie-svg" viewBox="0 0 100 100" style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="20"
        />
        <circle
          cx="50"
          cy="50"
          r={radius}
          fill="none"
          stroke="#10b981"
          strokeWidth="20"
          strokeDasharray={`${paidLength} ${unpaidLength}`}
          strokeDashoffset="0"
          strokeLinecap="butt"
        />
      </svg>
    );
  };

  if (loading) {
    return (
      <div className="statistics-view">
        <div className="loading">Cargando estadísticas...</div>
      </div>
    );
  }

  return (
    <div className="statistics-view">
      <div className="view-header">
        <h1>Estadísticas</h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#dbeafe' }}>
            <Calendar size={32} style={{ color: '#2563eb' }} />
          </div>
          <div className="stat-content">
            <h3>Total de Actuaciones</h3>
            <p className="stat-number">{totalPerformances}</p>
            <p className="stat-description">
              {performancesThisYear} en {currentYear}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#d1fae5' }}>
            <DollarSign size={32} style={{ color: '#10b981' }} />
          </div>
          <div className="stat-content">
            <h3>Actuaciones Cobradas</h3>
            <p className="stat-number">{paidPerformances}</p>
            <p className="stat-description">
              {totalRevenue > 0 && `${totalRevenue.toFixed(2)}€ cobrados`}
            </p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fef3c7' }}>
            <TrendingUp size={32} style={{ color: '#f59e0b' }} />
          </div>
          <div className="stat-content">
            <h3>Pendientes de Cobro</h3>
            <p className="stat-number">{unpaidPerformances}</p>
            <p className="stat-description">
              {pendingRevenue > 0 && `${pendingRevenue.toFixed(2)}€ pendientes`}
            </p>
            {unpaidPerformances > 0 && (
              <button
                onClick={() => setShowUnpaidModal(true)}
                className="btn-secondary btn-sm"
                style={{ marginTop: '12px' }}
              >
                <FileText size={16} />
                Ver detalle
              </button>
            )}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#e0e7ff' }}>
            <Users size={32} style={{ color: '#6366f1' }} />
          </div>
          <div className="stat-content">
            <h3>Total de Músicos</h3>
            <p className="stat-number">{musicians.length}</p>
            <p className="stat-description">
              {musicians.filter(m => m.is_active).length} activos
            </p>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-grid">
          <div className="chart-card">
            <h3 className="chart-title">Estado de Cobros</h3>
            {totalPerformances > 0 ? (
              <div className="pie-chart">
                {createPieChart(paidPerformances, unpaidPerformances)}
                <div className="pie-legend">
                  <div className="pie-legend-item">
                    <div className="pie-legend-color" style={{ backgroundColor: '#10b981' }}></div>
                    <span className="pie-legend-text">
                      Cobradas
                      <span className="pie-legend-value">{paidPerformances} ({paidPercentage.toFixed(0)}%)</span>
                    </span>
                  </div>
                  <div className="pie-legend-item">
                    <div className="pie-legend-color" style={{ backgroundColor: '#f59e0b' }}></div>
                    <span className="pie-legend-text">
                      Pendientes
                      <span className="pie-legend-value">{unpaidPerformances} ({unpaidPercentage.toFixed(0)}%)</span>
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="empty-state">
                <p>No hay datos de actuaciones</p>
              </div>
            )}
          </div>

          <div className="chart-card">
            <h3 className="chart-title">Ingresos</h3>
            <div className="bar-chart">
              <div className="bar-chart-item">
                <span className="bar-chart-label">Cobrado</span>
                <div className="bar-chart-track">
                  <div
                    className="bar-chart-fill"
                    style={{
                      width: `${totalRevenue > 0 && (totalRevenue + pendingRevenue) > 0 ? (totalRevenue / (totalRevenue + pendingRevenue)) * 100 : 0}%`,
                      backgroundColor: '#10b981',
                      minWidth: totalRevenue > 0 ? '40px' : '0',
                    }}
                  >
                    {totalRevenue > 0 && `${totalRevenue.toFixed(0)}€`}
                  </div>
                </div>
                <span className="bar-chart-value">{totalRevenue.toFixed(2)}€</span>
              </div>
              <div className="bar-chart-item">
                <span className="bar-chart-label">Pendiente</span>
                <div className="bar-chart-track">
                  <div
                    className="bar-chart-fill"
                    style={{
                      width: `${pendingRevenue > 0 && (totalRevenue + pendingRevenue) > 0 ? (pendingRevenue / (totalRevenue + pendingRevenue)) * 100 : 0}%`,
                      backgroundColor: '#f59e0b',
                      minWidth: pendingRevenue > 0 ? '40px' : '0',
                    }}
                  >
                    {pendingRevenue > 0 && `${pendingRevenue.toFixed(0)}€`}
                  </div>
                </div>
                <span className="bar-chart-value">{pendingRevenue.toFixed(2)}€</span>
              </div>
              <div className="bar-chart-item">
                <span className="bar-chart-label">Total</span>
                <div className="bar-chart-track">
                  <div
                    className="bar-chart-fill"
                    style={{
                      width: '100%',
                      backgroundColor: '#6366f1',
                    }}
                  >
                    {(totalRevenue + pendingRevenue).toFixed(0)}€
                  </div>
                </div>
                <span className="bar-chart-value">{(totalRevenue + pendingRevenue).toFixed(2)}€</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="chart-container">
        <div className="chart-card chart-card-full">
          <div className="chart-header-with-controls">
            <h3 className="chart-title">Actuaciones por Mes</h3>
            <div className="year-selector">
              <button
                onClick={() => {
                  const currentIndex = availableYears.indexOf(selectedYear);
                  if (currentIndex < availableYears.length - 1) {
                    setSelectedYear(availableYears[currentIndex + 1]);
                  }
                }}
                className="btn-icon"
                disabled={availableYears.indexOf(selectedYear) === availableYears.length - 1}
              >
                <ChevronLeft size={20} />
              </button>
              <span className="year-display">{selectedYear}</span>
              <button
                onClick={() => {
                  const currentIndex = availableYears.indexOf(selectedYear);
                  if (currentIndex > 0) {
                    setSelectedYear(availableYears[currentIndex - 1]);
                  }
                }}
                className="btn-icon"
                disabled={availableYears.indexOf(selectedYear) === 0}
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
          {performancesInYear.length > 0 ? (
            <div className="dot-chart">
              <div className="dot-chart-grid">
                {monthlyData.map((data, index) => {
                  const maxCount = Math.max(...monthlyData.map(d => d.count), 1);
                  const monthName = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'][index];
                  return (
                    <div key={data.month} className="dot-chart-column">
                      <div className="dot-chart-bar" style={{ height: '200px', position: 'relative' }}>
                        {data.count > 0 && (
                          <div
                            className="dot-chart-dot"
                            style={{
                              bottom: `${(data.count / maxCount) * 180}px`,
                              left: '50%',
                              transform: 'translateX(-50%)',
                              position: 'absolute',
                            }}
                            title={`${data.count} actuaciones`}
                          >
                            <div className="dot-count">{data.count}</div>
                          </div>
                        )}
                      </div>
                      <span className="dot-chart-label">{monthName}</span>
                    </div>
                  );
                })}
              </div>
              <div className="dot-chart-summary">
                <span>Total en {selectedYear}: <strong>{performancesInYear.length} actuaciones</strong></span>
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <p>No hay actuaciones en {selectedYear}</p>
            </div>
          )}
        </div>
      </div>

      <div className="stats-section">
        <div className="section-header">
          <Award size={24} />
          <h2>Top 10 Músicos por Participaciones en {currentYear}</h2>
        </div>

        {topMusicians.length === 0 ? (
          <div className="empty-state">
            <p>No hay datos de participaciones todavía</p>
          </div>
        ) : (
          <div className="musicians-ranking">
            {topMusicians.map((musician, index) => (
              <div key={musician.id} className="ranking-item">
                <div className="ranking-position">
                  {index === 0 && <span className="medal gold">🥇</span>}
                  {index === 1 && <span className="medal silver">🥈</span>}
                  {index === 2 && <span className="medal bronze">🥉</span>}
                  {index > 2 && <span className="position-number">#{index + 1}</span>}
                </div>

                <div className="ranking-musician">
                  {musician.photo_url ? (
                    <img src={musician.photo_url} alt={musician.name} className="ranking-photo" />
                  ) : (
                    <div className="ranking-photo-placeholder">
                      <Users size={20} />
                    </div>
                  )}
                  <div className="ranking-info">
                    <h3>{musician.name}</h3>
                    {musician.instruments && musician.instruments.length > 0 ? (
                      <p>{musician.instruments.map(i => i.name).join(', ')}</p>
                    ) : musician.instrument && (
                      <p>{musician.instrument}</p>
                    )}
                  </div>
                </div>

                <div className="ranking-stats">
                  <span className="participations-badge">
                    {musician.times_played} {musician.times_played === 1 ? 'actuación' : 'actuaciones'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showUnpaidModal && (
        <div className="modal-overlay" onClick={() => setShowUnpaidModal(false)}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Actuaciones Pendientes de Cobro</h2>
              <button
                onClick={() => setShowUnpaidModal(false)}
                className="btn-icon"
                aria-label="Cerrar"
              >
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {unpaidPerformancesList.length === 0 ? (
                <div className="empty-state">
                  <p>No hay actuaciones pendientes de cobro</p>
                </div>
              ) : (
                <div className="unpaid-performances-list">
                  {unpaidPerformancesList
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map((performance) => (
                      <div key={performance.id} className="unpaid-performance-item">
                        <div className="unpaid-performance-info">
                          <div className="unpaid-performance-header">
                            <h3>{performance.name}</h3>
                            <span className="badge-date">
                              {new Date(performance.date).toLocaleDateString('es-ES', {
                                day: 'numeric',
                                month: 'long',
                                year: 'numeric',
                              })}
                            </span>
                          </div>
                          {performance.location && (
                            <p className="unpaid-performance-location">{performance.location}</p>
                          )}
                        </div>
                        <div className="unpaid-performance-amount">
                          {performance.total_amount ? (
                            <span className="amount-badge">
                              {performance.total_amount.toFixed(2)}€
                            </span>
                          ) : (
                            <span className="amount-badge no-amount">Sin importe</span>
                          )}
                        </div>
                      </div>
                    ))}

                  <div className="unpaid-total">
                    <span className="unpaid-total-label">Total pendiente:</span>
                    <span className="unpaid-total-amount">{pendingRevenue.toFixed(2)}€</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
