import { useState } from 'react';
import api from '../api/client';
import { useAnalytics } from '../hooks/useAdminData';
import './AnalyticsDashboard.css';
import IncomeChart from './IncomeChart';
// Importamos Recharts para el gráfico de Dona (si no lo tienes: npm install recharts)
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// --- SUB-COMPONENTE: TARJETA DE ESTADÍSTICA (Actualizado con íconos) ---
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

// --- SUB-COMPONENTE: GRÁFICO DE DESGLOSE DE GASTOS ---
const ExpensePieChart = ({ total }) => {
  // Datos simulados (En el futuro los traerás de tu endpoint stats.desglose_gastos)
  const data = [
    { name: 'Servicios (Luz/Agua)', value: 8000, color: '#10B981' }, 
    { name: 'Limpieza', value: 5000, color: '#3B82F6' },
    { name: 'Mantenimiento', value: 4000, color: '#F59E0B' },
    { name: 'Publicidad/Otros', value: 3000, color: '#EF4444' },
  ];

  return (
    <div className="side-panel-card">
      <h4 className="panel-title">Distribución de Gastos</h4>
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
        {/* Total centrado superpuesto (opcional, requiere CSS absoluto) */}
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
    </div>
  );
};

// --- SUB-COMPONENTE: ÚLTIMOS MOVIMIENTOS ---
const RecentActivityFeed = () => {
  // Datos simulados (En el futuro vendrán de stats.ultimos_movimientos)
  const activities = [
    { id: 1, type: 'ingreso', text: 'Seña Recibida: Cumpleaños Lucía', amount: 15000, date: 'Hoy, 10:30' },
    { id: 2, type: 'gasto', text: 'Pago Proveedor: Insumos de limpieza', amount: -5000, date: 'Ayer, 16:45' },
    { id: 3, type: 'info', text: 'Reserva Confirmada: Boda Juan y María', amount: null, date: 'Hace 2 días' },
    { id: 4, type: 'ingreso', text: 'Saldo Liquidado: Fiesta de Egresados', amount: 85000, date: 'Hace 3 días' },
  ];

  return (
    <div className="side-panel-card activity-feed-card">
      <h4 className="panel-title">Últimos Movimientos</h4>
      <ul className="activity-list">
        {activities.map(activity => (
          <li key={activity.id} className="activity-item">
            <div className={`activity-icon-container ${activity.type}`}>
              {activity.type === 'ingreso' ? '💰' : activity.type === 'gasto' ? '🧾' : '📅'}
            </div>
            <div className="activity-details">
              <p className="activity-text">{activity.text}</p>
              <small className="activity-date">{activity.date}</small>
            </div>
            {activity.amount !== null && (
              <div className={`activity-amount ${activity.type}`}>
                {activity.amount > 0 ? '+' : ''}{activity.amount.toLocaleString('es-AR')}
              </div>
            )}
          </li>
        ))}
      </ul>
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
      {/* ... (Tu header intacto) ... */}
      
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

          {/* 🌟 AQUÍ EMPIEZA LA NUEVA ESTRUCTURA DEL GRID */}
          <div className="dashboard-content-grid">
            
            {/* Columna Izquierda: El gráfico de barras (ahora ocupa un % del ancho) */}
            <div className="main-chart-section">
              <h4 className="panel-title" style={{marginBottom: '1rem', color: '#64748b', fontSize: '0.9rem', textAlign: 'center'}}>
                Resumen de Ingresos Registrados por Mes
              </h4>
              <div className="chart-wrapper">
                <IncomeChart monthlyData={stats.ingresos_por_mes} />
              </div>
            </div>

            {/* Columna Derecha: Tarjetas apiladas */}
            <div className="side-panels-section">
              <ExpensePieChart total={stats.gastos_mes_seleccionado} />
              <RecentActivityFeed />
            </div>

          </div>
        </>
      )}
    </div>
  );
}

export default AnalyticsDashboard;
