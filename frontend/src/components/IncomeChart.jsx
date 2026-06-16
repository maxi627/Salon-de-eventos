import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';

const IncomeChart = ({ monthlyData }) => {
  // Transformamos el objeto { "2024-01": { ingresos: 100 }, ... } 
  // en el array que Recharts necesita [{ name: 'Ene', ingresos: 100 }]
  const data = Object.keys(monthlyData || {}).map((key) => {
    const [year, month] = key.split('-');
    const monthName = new Date(year, month - 1).toLocaleString('es-ES', { month: 'short' });
    return {
      name: monthName.charAt(0).toUpperCase() + monthName.slice(1),
      ingresos: monthlyData[key].ingresos || 0,
    };
  });

  // Componente personalizado para el Tooltip (el cuadrito que sale al pasar el mouse)
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div style={{
          backgroundColor: '#1e293b',
          border: '1px solid #334155',
          padding: '10px 15px',
          borderRadius: '8px',
          boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
        }}>
          <p style={{ color: '#94a3b8', margin: 0, fontSize: '12px', textTransform: 'uppercase' }}>{label}</p>
          <p style={{ color: '#3b82f6', margin: 0, fontWeight: 'bold', fontSize: '16px' }}>
            ${payload[0].value.toLocaleString('es-AR')}
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div style={{ width: '100%', height: 350, marginTop: '20px' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          {/* Definimos el gradiente para las barras */}
          <defs>
            <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={1} />
              <stop offset="100%" stopColor="#1d4ed8" stopOpacity={0.8} />
            </linearGradient>
          </defs>

          {/* Cuadrícula sutil */}
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" opacity={0.5} />

          {/* Eje X: Meses */}
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 13, fontWeight: 500 }}
            dy={10}
          />

          {/* Eje Y: Montos */}
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            tickFormatter={(value) => `$${value / 1000}k`} // Lo abrevia a 10k, 20k, etc.
          />

          <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} />

          {/* La Barra con diseño moderno */}
          <Bar 
            dataKey="ingresos" 
            fill="url(#barGradient)" 
            radius={[6, 6, 0, 0]} // Bordes redondeados arriba
            barSize={35}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default IncomeChart;