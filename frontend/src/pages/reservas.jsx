import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './reservas.css';

function Reservas() {
  const navigate = useNavigate();
  const [fechas, setFechas] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const signal = controller.signal;

    const fetchFechas = async () => {
      try {
        const response = await fetch('/api/v1/fecha', { signal });
        if (!response.ok) throw new Error('Error al cargar el estado de las fechas.');
        const data = await response.json();
        const fechasMapeadas = data.data.reduce((acc, fecha) => {
          acc[fecha.dia] = fecha;
          return acc;
        }, {});
        setFechas(fechasMapeadas);
      } catch (error) {
        if (error.name !== 'AbortError') {
          setMessage(error.message);
        }
      } finally {
        if (!signal.aborted) {
            setIsLoading(false);
        }
      }
    };
    fetchFechas();

    return () => {
      controller.abort();
    };
  }, []);

  const handleDateClick = (dayDate) => {
    const token = localStorage.getItem('authToken');

    if (!token) {
      setMessage('Debes iniciar sesión para poder seleccionar una fecha.');
      setTimeout(() => setMessage(''), 3000);
      return;
    }

    const dateString = dayDate.toISOString().split('T')[0];
    navigate(`/reservar/${dateString}`);
  };

  const changeMonth = (offset) => {
    const today = new Date();
    const firstOfCurrentMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    // --- LÓGICA PARA LIMITAR LA NAVEGACIÓN ---
    const maxDate = new Date(today.getFullYear(), today.getMonth() + 5, 1);
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);

    // Evita ir a meses pasados
    if (newDate < firstOfCurrentMonth && offset < 0) {
      return;
    }
    
    // Evita ir más de 3 meses en el futuro
    if (newDate > maxDate && offset > 0) {
        return;
    }

    setCurrentDate(newDate);
  };

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
      } else if (fechaInfo) {
        className += ` ${fechaInfo.estado}`;
        if (fechaInfo.estado !== 'disponible') isDisabled = true;
      } else {
        className += ' disponible';
      }

      days.push(
        <button
          key={i}
          className={className}
          onClick={() => handleDateClick(dayDate)}
          disabled={isDisabled}
        >
          <span className="day-number">{i}</span>
          {fechaInfo && fechaInfo.estado === 'disponible' && fechaInfo.valor_estimado > 0 && (
            <span className="calendar-price">${fechaInfo.valor_estimado.toLocaleString('es-AR')}</span>
          )}
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
      <div className="price-disclaimer">
        <p>
          <strong>Atención:</strong> El precio que figura en el calendario es un valor de referencia y está sujeto a modificaciones dependiendo de las características del evento (cantidad de invitados, horario, etc.).
        </p>
      </div>
      {message && <p className="message-area">{message}</p>}
    </div>
  );
}

export default Reservas;