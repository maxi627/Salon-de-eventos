import { useEffect, useState } from 'react';
import './AnalyticsDashboard.css';

// Un pequeño componente para mostrar cada métrica individual
const StatCard = ({ title, value, trend }) => {
  const isPositive = trend >= 0;
  const trendClass = isPositive ? 'trend-positive' : 'trend-negative';
  const trendIcon = isPositive ? '▲' : '▼';

  return (
    <div className="stat-card">
      <h4 className="stat-title">{title}</h4>
      <p className="stat-value">{value}</p>
      {trend !== null && (
        <p className={`stat-trend ${trendClass}`}>
          {trendIcon} {Math.abs(trend)}% vs mes anterior
        </p>
      )}
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
            title="Reservas Confirmadas (Mes Actual)"
            value={stats.reservas_mes_actual}
            trend={null} // No tenemos datos para esta tendencia aún
          />
          {/* Aquí podrías añadir más tarjetas con otras métricas */}
        </div>
      )}
      <div className="chart-placeholder">
        <p>Próximamente: Gráficos de ingresos y tendencias.</p>
        <small>Se requiere una librería de gráficos como Chart.js o Recharts para visualizar los datos de `ingresos_por_mes`.</small>
      </div>
    </div>
  );
}

export default AnalyticsDashboard;