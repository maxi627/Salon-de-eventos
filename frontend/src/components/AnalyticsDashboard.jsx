import { useState } from 'react';
import api from '../api/client';
import { useAnalytics } from '../hooks/useAdminData';
import './AnalyticsDashboard.css';
import IncomeChart from './IncomeChart';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

// --- SUB-COMPONENTE: TARJETA DE ESTADÍSTICA ---
const StatCard = ({ title, value, trend, note, type = 'default', icon }) => (
  <div className={`stat-card ${type}`}>
    <div className="stat-header">
      <h4 className="stat-title">{title}</h4>
      <span className="stat-icon">{icon}</span>
    </div>
    <p className="stat-value">{value}</p>
    {trend !== null && trend !== undefined && (
      <p className={`stat-trend ${trend >= 0 ? 'trend-positive' : 'trend-negative'}`}>
        {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs mes anterior
      </p>
    )}
    {note && <small className="stat-note">{note}</small>}
  </div>
);

// --- SUB-COMPONENTE: GRÁFICO DE DESGLOSE DE GASTOS (Con datos reales) ---
const ExpensePieChart = ({ desgloseData }) => {
  const data = desgloseData || [];

  return (
    <div className="side-panel-card">
      <h4 className="panel-title">Distribución de Gastos</h4>
      {data.length > 0 ? (
        <>
          <div className="pie-chart-wrapper">
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => `$${value.toLocaleString('es-AR')}`} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="custom-legend">
            {data.map((item, i) => (
              <div key={i} className="legend-item">
                <span className="legend-color" style={{ backgroundColor: item.color }}></span>
                <span className="legend-label">{item.name}</span>
                <span className="legend-value">${item.value.toLocaleString('es-AR')}</span>
              </div>
            ))}
          </div>
        </>
      ) : (
        <p style={{ textAlign: 'center', color: '#94a3b8', marginTop: '2rem' }}>No hay gastos registrados este mes.</p>
      )}
    </div>
  );
};

// --- SUB-COMPONENTE: ÚLTIMOS MOVIMIENTOS (Con datos reales) ---
const RecentActivityFeed = ({ actividadesData }) => {
  const activities = actividadesData || [];

  return (
    <div className="side-panel-card activity-feed-card">
      <h4 className="panel-title">Últimos Movimientos</h4>
      {activities.length > 0 ? (
        <ul className="activity-list">
          {activities.map((activity, index) => (
            <li key={activity.id || index} className="activity-item">
              <div className={`activity-icon-container ${activity.type}`}>
                {activity.type === 'ingreso' ? '💰' : activity.type === 'gasto' ? '🧾' : '📅'}
              </div>
              <div className="activity-details">
                <p className="activity-text">{activity.text}</p>
                <small className="activity-date">{activity.date}</small>
              </div>
              {activity.amount !== null && activity.amount !== undefined && (
                <div className={`activity-amount ${activity.type}`}>
                  {activity.amount > 0 ? '+' : ''}{activity.amount.toLocaleString('es-AR')}
                </div>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: '1rem 0' }}>No hay movimientos recientes.</p>
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
function AnalyticsDashboard() {
  const [reportDate, setReportDate] = useState({
    mes: new Date().getMonth() + 1,
    anio: new Date().getFullYear(),
  });
  const [isDownloading, setIsDownloading] = useState(false);
  
  const { data, isLoading, error, refetch, isFetching } = useAnalytics(reportDate.mes, reportDate.anio);

  // Tu lógica original intacta
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

  if (isLoading) return <p className="admin-loading">Cargando analíticas...</p>;

  return (
    <div className="analytics-dashboard admin-section-fade">
      
      {/* HEADER Y TOOLBAR */}
      <div className="dashboard-header">
        <h3 className="dashboard-title">Resumen Contable</h3>
        <div className="dashboard-toolbar">
          <div className="date-controls">
            <select value={reportDate.mes} onChange={(e) => setReportDate(p => ({...p, mes: parseInt(e.target.value)}))}>
              {months.map(m => <option key={m.value} value={m.value}>{m.name.charAt(0).toUpperCase() + m.name.slice(1)}</option>)}
            </select>
            <select value={reportDate.anio} onChange={(e) => setReportDate(p => ({...p, anio: parseInt(e.target.value)}))}>
              {years.map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div className="action-group">
            <button 
              className={`btn-refresh-icon ${isFetching ? 'spinning' : ''}`} 
              onClick={() => refetch()}
              title="Actualizar datos"
            >
              🔄
            </button>
            <button 
              className="btn-download-pdf" 
              onClick={handleDownloadReport} 
              disabled={isDownloading}
            >
              {isDownloading ? 'Generando...' : '📄 PDF'}
            </button>
          </div>
        </div>
      </div>
      
      {error && <p className="error-message">{error.message}</p>}

      {stats && (
        <>
          <div className="stats-grid">
            <StatCard 
                title="Ingresos del Mes" 
                value={`$${stats.ingresos_mes_seleccionado.toLocaleString('es-AR')}`} 
                trend={stats.tendencia_ingresos_porcentaje} 
                type="ingresos" 
                icon="💰"
            />
            <StatCard 
                title="Gastos del Mes" 
                value={`$${stats.gastos_mes_seleccionado.toLocaleString('es-AR')}`} 
                type="gastos" 
                icon="📉"
            />
            <StatCard 
                title="Beneficio Neto" 
                value={`$${stats.beneficio_neto_mes.toLocaleString('es-AR')}`} 
                type="beneficio" 
                icon="⚖️"
            />
            <StatCard 
                title="Por Liquidar" 
                value={`$${stats.dinero_por_liquidar.toLocaleString('es-AR')}`} 
                note="Saldos pendientes totales" 
                icon="⏳"
            />
          </div>

          {/* GRID INFERIOR */}
          <div className="dashboard-content-grid">
            
            {/* Columna Izquierda */}
            <div className="main-chart-section">
              <h4 className="panel-title" style={{marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem', textAlign: 'center'}}>
                Resumen de Ingresos Registrados por Mes
              </h4>
              <div className="chart-wrapper">
                <IncomeChart monthlyData={stats.ingresos_por_mes} />
              </div>
            </div>

            {/* Columna Derecha */}
            <div className="side-panels-section">
              {/* Inyección de datos reales desde stats */}
              <ExpensePieChart desgloseData={stats.desglose_gastos} />
              <RecentActivityFeed actividadesData={stats.ultimos_movimientos} />
            </div>

          </div>
        </>
      )}
    </div>
  );
}

export default AnalyticsDashboard;