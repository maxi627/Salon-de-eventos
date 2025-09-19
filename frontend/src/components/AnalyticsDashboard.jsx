import { useEffect, useState } from 'react';
import './AnalyticsDashboard.css';

// El componente StatCard no necesita cambios
const StatCard = ({ title, value, trend, note }) => {
  const isPositive = trend >= 0;
  const trendClass = isPositive ? 'trend-positive' : 'trend-negative';
  const trendIcon = isPositive ? '▲' : '▼';

  return (
    <div className="stat-card">
      <h4 className="stat-title">{title}</h4>
      <p className="stat-value">{value}</p>
      {trend !== null && trend !== undefined && (
        <p className={`stat-trend ${trendClass}`}>
          {trendIcon} {Math.abs(trend)}% vs mes anterior
        </p>
      )}
      {note && <small className="stat-note">{note}</small>}
    </div>
  );
};

function AnalyticsDashboard() {
  const [stats, setStats] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchAnalytics = async () => {
      const token = localStorage.getItem('authToken');
      try {
        const response = await fetch('/api/v1/analytics', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setStats(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (isLoading) return <p>Cargando analíticas...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="analytics-dashboard">
      <h3>Resumen de Contabilidad</h3>
      {stats && (
        <div className="stats-grid">
          <StatCard
            title="Ingresos del Mes Actual"
            value={`$${stats.ingresos_mes_actual.toLocaleString('es-AR')}`}
            trend={stats.tendencia_ingresos_porcentaje}
          />
          <StatCard
            title="Reservas Confirmadas (Mes)"
            value={stats.reservas_mes_actual}
            trend={null}
          />
          {/* --- TARJETA NUEVA AÑADIDA --- */}
          <StatCard
            title="Dinero por Liquidar (Total)"
            value={`$${stats.dinero_por_liquidar.toLocaleString('es-AR')}`}
            trend={null}
            note="Suma de saldos restantes de todas las reservas confirmadas."
          />
        </div>
      )}

    </div>
  );
}

export default AnalyticsDashboard;