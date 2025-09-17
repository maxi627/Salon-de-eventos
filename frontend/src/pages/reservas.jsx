import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './reservas.css'; // Asegúrate que el nombre del CSS coincida

function Reservas() {
  const navigate = useNavigate();
  const [fechas, setFechas] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Carga las fechas que tienen un estado definido (ej. 'reservada')
    const fetchFechas = async () => {
      try {
        const response = await fetch('/api/v1/fecha');
        if (!response.ok) throw new Error('Error al cargar el estado de las fechas.');
        const data = await response.json();
        const fechasMapeadas = data.data.reduce((acc, fecha) => {
          acc[fecha.dia] = fecha;
          return acc;
        }, {});
        setFechas(fechasMapeadas);
      } catch (error) {
        setMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchFechas();
  }, []);

  // Navega a la página de confirmación con la fecha seleccionada
  const handleDateClick = (dayDate) => {
    const dateString = dayDate.toISOString().split('T')[0];
    navigate(`/reservar/${dateString}`);
  };

  // Permite cambiar de mes, bloqueando la navegación al pasado
  const changeMonth = (offset) => {
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    const today = new Date();
    const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    if (newDate < firstOfCurrentMonth && offset < 0) {
      return;
    }
    setCurrentDate(newDate);
  };

  // Construye el calendario visual
  const renderCalendar = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const days = [];

    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const dayDate = new Date(year, month, i);
      const dateString = dayDate.toISOString().split('T')[0];
      const fechaInfo = fechas[dateString];
      const isPast = dayDate < today;
      let isDisabled = false;
      let className = 'calendar-day';

      if (isPast) {
        className += ' past';
        isDisabled = true;
      } else if (fechaInfo) { // La fecha está en la BD (es una excepción)
        className += ` ${fechaInfo.estado}`;
        if (fechaInfo.estado !== 'disponible') isDisabled = true;
      } else { // La fecha no está en la BD, por lo tanto está disponible
        className += ' disponible';
      }

      days.push(
        <button
          key={i}
          className={className}
          onClick={() => handleDateClick(dayDate)}
          disabled={isDisabled}
        >
          {i}
        </button>
      );
    }
    return days;
  };

  const monthName = currentDate.toLocaleString('es-ES', { month: 'long' });

  return (
    <div className="reservas-container">
      <h2>Reserva Tu Evento</h2>
      <div className="calendar-widget">
        <div className="calendar-header">
          <button onClick={() => changeMonth(-1)}>‹</button>
          <h3>{monthName.charAt(0).toUpperCase() + monthName.slice(1)} {currentDate.getFullYear()}</h3>
          <button onClick={() => changeMonth(1)}>›</button>
        </div>
        <div className="calendar-days-header">
          {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map(d => <div key={d}>{d}</div>)}
        </div>
        <div className="calendar-grid">
          {isLoading ? <p>Cargando calendario...</p> : renderCalendar()}
        </div>
      </div>
      {/* Añadimos el cuadro de la leyenda aquí */}
      <div className="calendar-legend">
        <div className="legend-item">
          <span className="legend-color-box disponible"></span>
          <span>Disponible</span>
        </div>
        <div className="legend-item">
          <span className="legend-color-box pendiente"></span>
          <span>Pendiente de Aprobación</span>
        </div>
        <div className="legend-item">
          <span className="legend-color-box reservada"></span>
          <span>Reservado</span>
        </div>
        <div className="legend-item">
          <span className="legend-color-box past"></span>
          <span>No Disponible / Pasado</span>
        </div>
      </div>
      {message && <p className="message-area">{message}</p>}
    </div>
  );
}

export default Reservas;