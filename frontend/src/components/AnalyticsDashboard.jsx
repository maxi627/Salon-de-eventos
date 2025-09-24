import { useEffect, useState } from 'react';
import './AnalyticsDashboard.css';
import IncomeChart from './IncomeChart';

const StatCard = ({ title, value, trend, note, type = 'default' }) => {
  const isPositive = trend >= 0;
  const trendClass = isPositive ? 'trend-positive' : 'trend-negative';
  const trendIcon = isPositive ? '▲' : '▼';

  return (
    <div className={`stat-card ${type}`}>
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
  const [reportDate, setReportDate] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
  });
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchAnalytics = async () => {
      setIsLoading(true);
      setError(''); // Limpiar errores previos
      const token = localStorage.getItem('authToken');
      try {
        const response = await fetch(`/api/v1/analytics?mes=${reportDate.mes}&anio=${reportDate.anio}`, {
          headers: { 'Authorization': `Bearer ${token}` },
          signal,
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        setStats(result.data);
      } catch (err) {
        if (err.name !== 'AbortError') {
            setError(err.message);
        }
      } finally {
        // Solo cambiar isLoading si la petición no fue abortada
        if (!signal.aborted) {
            setIsLoading(false);
        }
      }
    };

    fetchAnalytics();

    return () => {
      controller.abort();
    };
  }, [reportDate]);

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setReportDate(prev => ({ ...prev, [name]: parseInt(value) }));
  };
  
  const handleDownloadReport = async () => {
      setIsDownloading(true);
      setError('');
      const token = localStorage.getItem('authToken');
      try {
          const response = await fetch(`/api/v1/analytics/reporte-pdf?mes=${reportDate.mes}&anio=${reportDate.anio}`, {
              headers: { 'Authorization': `Bearer ${token}` }
          });
          if (!response.ok) {
              throw new Error('Error al generar el reporte.');
          }
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `reporte_contable_${reportDate.mes}_${reportDate.anio}.pdf`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
      } catch (err) {
          setError(err.message);
      } finally {
          setIsDownloading(false);
      }
  };

  if (isLoading) return <p>Cargando analíticas...</p>;

  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('es-ES', { month: 'long' }) }));
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  return (
    <div className="analytics-dashboard">
        <div className="dashboard-header">
            <h3>Resumen de Contabilidad</h3>
            <div className="report-downloader">
                <select name="mes" value={reportDate.mes} onChange={handleDateChange}>
                    {months.map(m => <option key={m.value} value={m.value}>{m.name.charAt(0).toUpperCase() + m.name.slice(1)}</option>)}
                </select>
                <select name="anio" value={reportDate.anio} onChange={handleDateChange}>
                    {years.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <button onClick={handleDownloadReport} disabled={isDownloading}>
                    {isDownloading ? 'Generando...' : 'Descargar PDF'}
                </button>
            </div>
        </div>
      {error && <p className="error-message">{error}</p>}
      {stats && (
        <>
          <div className="stats-grid">
            <StatCard
              title="Ingresos del Mes"
              value={`$${stats.ingresos_mes_seleccionado.toLocaleString('es-AR')}`}
              trend={stats.tendencia_ingresos_porcentaje}
              type="ingresos"
            />
            <StatCard
              title="Gastos del Mes"
              value={`$${stats.gastos_mes_seleccionado.toLocaleString('es-AR')}`}
              type="gastos"
            />
             <StatCard
              title="Beneficio Neto (Mes)"
              value={`$${stats.beneficio_neto_mes.toLocaleString('es-AR')}`}
              type="beneficio"
            />
            <StatCard
              title="Dinero por Liquidar (Total)"
              value={`$${stats.dinero_por_liquidar.toLocaleString('es-AR')}`}
              note="Saldos restantes de reservas confirmadas."
            />
          </div>
          <IncomeChart monthlyData={stats.ingresos_por_mes} />
        </>
      )}
    </div>
  );
}

export default AnalyticsDashboard;