import { useState } from 'react';
import api from '../api/client';
import { useAnalytics } from '../hooks/useAdminData';
import './AnalyticsDashboard.css';
import IncomeChart from './IncomeChart';

const StatCard = ({ title, value, trend, note, type = 'default' }) => (
  <div className={`stat-card ${type}`}>
    <h4 className="stat-title">{title}</h4>
    <p className="stat-value">{value}</p>
    {trend !== null && trend !== undefined && (
      <p className={`stat-trend ${trend >= 0 ? 'trend-positive' : 'trend-negative'}`}>
        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs mes anterior
      </p>
    )}
    {note && <small className="stat-note">{note}</small>}
  </div>
);

function AnalyticsDashboard() {
  const [reportDate, setReportDate] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const { data, isLoading, error } = useAnalytics(reportDate.mes, reportDate.anio);

  const handleDownloadReport = async () => {
    setIsDownloading(true);
    try {
      const response = await api.get(`/analytics/reporte-pdf?mes=${reportDate.mes}&anio=${reportDate.anio}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_contable_${reportDate.mes}_${reportDate.anio}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al generar el reporte.');
    } finally {
      setIsDownloading(false);
    }
  };

  const stats = data?.data;
  const months = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, name: new Date(0, i).toLocaleString('es-ES', { month: 'long' }) }));
  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);

  if (isLoading) return <p>Cargando analíticas...</p>;

  return (
    <div className="analytics-dashboard">
      <div className="dashboard-header">
        <h3>Resumen de Contabilidad</h3>
        <div className="report-downloader">
          <select value={reportDate.mes} onChange={(e) => setReportDate(p => ({...p, mes: parseInt(e.target.value)}))}>
            {months.map(m => <option key={m.value} value={m.value}>{m.name.charAt(0).toUpperCase() + m.name.slice(1)}</option>)}
          </select>
          <select value={reportDate.anio} onChange={(e) => setReportDate(p => ({...p, anio: parseInt(e.target.value)}))}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <button onClick={handleDownloadReport} disabled={isDownloading}>
            {isDownloading ? 'Generando...' : 'Descargar PDF'}
          </button>
        </div>
      </div>
      {error && <p className="error-message">{error.message}</p>}
      {stats && (
        <>
          <div className="stats-grid">
            <StatCard title="Ingresos del Mes" value={`$${stats.ingresos_mes_seleccionado.toLocaleString('es-AR')}`} trend={stats.tendencia_ingresos_porcentaje} type="ingresos" />
            <StatCard title="Gastos del Mes" value={`$${stats.gastos_mes_seleccionado.toLocaleString('es-AR')}`} type="gastos" />
            <StatCard title="Beneficio Neto (Mes)" value={`$${stats.beneficio_neto_mes.toLocaleString('es-AR')}`} type="beneficio" />
            <StatCard title="Dinero por Liquidar (Total)" value={`$${stats.dinero_por_liquidar.toLocaleString('es-AR')}`} note="Saldos restantes de reservas." />
          </div>
          <IncomeChart monthlyData={stats.ingresos_por_mes} />
        </>
      )}
    </div>
  );
}

export default AnalyticsDashboard;