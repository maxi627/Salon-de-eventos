import {
    BarElement,
    CategoryScale,
    Chart as ChartJS,
    Legend,
    LinearScale,
    Title,
    Tooltip,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import './IncomeChart.css';

// Registramos los componentes de Chart.js que vamos a usar
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

function IncomeChart({ monthlyData }) {
  // Verificamos si hay datos para mostrar
  if (!monthlyData || Object.keys(monthlyData).length === 0) {
    return <div className="chart-container"><p>No hay datos de ingresos mensuales para mostrar.</p></div>;
  }

  // Ordenamos los meses y preparamos los datos para el gráfico
  const sortedMonths = Object.keys(monthlyData).sort();
  const chartData = {
    labels: sortedMonths.map(month => {
      // Formateamos la etiqueta para que sea más legible (ej: "Enero 2024")
      const [year, monthNum] = month.split('-');
      return new Date(year, monthNum - 1).toLocaleString('es-ES', { month: 'long', year: 'numeric' });
    }),
    datasets: [
      {
        label: 'Ingresos por Mes ($)',
        data: sortedMonths.map(month => monthlyData[month].ingresos),
        backgroundColor: 'rgba(52, 152, 219, 0.7)',
        borderColor: 'rgba(41, 128, 185, 1)',
        borderWidth: 1,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Resumen de Ingresos Registrados por Mes',
        font: {
          size: 18,
        }
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          // Formatear el eje Y como moneda
          callback: function(value) {
            return '$' + value.toLocaleString('es-AR');
          }
        }
      }
    }
  };

  return (
    <div className="chart-container">
      <Bar data={chartData} options={chartOptions} />
    </div>
  );
}

export default IncomeChart;