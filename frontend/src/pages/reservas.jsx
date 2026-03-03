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
    const fetchFechas = async () => {
      try {
        const response = await fetch('/api/v1/fecha');
        if (!response.ok) throw new Error('Error al cargar datos');
        const result = await response.json();
        const fechasMapeadas = result.data.reduce((acc, f) => {
          acc[f.dia] = f;
          return acc;
        }, {});
        setFechas(fechasMapeadas);
      } catch (error) {
        setMessage('Error al sincronizar el calendario.');
      } finally {
        setIsLoading(false);
      }
    };
    fetchFechas();
  }, []);

  const handleDateClick = (dateString) => {
    if (!localStorage.getItem('authToken')) {
      setMessage('Por favor, inicia sesión para continuar con tu reserva.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }
    navigate(`/reservar/${dateString}`);
  };

  // --- 1. LÓGICA DE NAVEGACIÓN LIMITADA A 3 MESES ---
  const changeMonth = (offset) => {
    const today = new Date();
    const limitFuture = new Date(today.getFullYear(), today.getMonth() + 3, 1);
    const newDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1);
    
    if (newDate < new Date(today.getFullYear(), today.getMonth(), 1) && offset < 0) return;
    if (newDate > limitFuture && offset > 0) return;

    setCurrentDate(newDate);
  };

  const renderCalendar = () => {
    const today = new Date();
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    const maxFutureDate = new Date(today.getFullYear(), today.getMonth() + 3, today.getDate());
    const todayStr = today.toLocaleString("sv-SE", { timeZone: "America/Argentina/Buenos_Aires" }).split(" ")[0];

    const days = [];
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
    }

    for (let i = 1; i <= daysInMonth; i++) {
      const monthStr = String(month + 1).padStart(2, '0');
      const dayStr = String(i).padStart(2, '0');
      const dateString = `${year}-${monthStr}-${dayStr}`;
      const dateObj = new Date(year, month, i);
      
      const fechaInfo = fechas[dateString];
      const isPast = dateString < todayStr;
      const isTooFar = dateObj > maxFutureDate;
      const isSunday = dateObj.getDay() === 0; // Bloqueo para la iglesia
      
      let statusClass = 'disponible';
      // El botón se deshabilita si es pasado, muy futuro o si es domingo
      let isDisabled = isPast || isTooFar || isSunday; 

      if (isPast) {
        statusClass = 'past';
      } else if (isSunday) {
        statusClass = 'reservada'; // Se muestra en rojo indicando que no está disponible
      } else if (isTooFar) {
        statusClass = 'too-far';
      } else if (fechaInfo) {
        statusClass = fechaInfo.estado;
        if (fechaInfo.estado !== 'disponible') isDisabled = true;
      }

      days.push(
        <div key={i} className="calendar-day-wrapper">
          <button
            className={`calendar-day-card ${statusClass}`}
            onClick={() => handleDateClick(dateString)}
            disabled={isDisabled}
          >
            <span className="day-number">{i}</span>
            
            {/* Solo mostrar precio si está disponible y NO es domingo ni pasado */}
            {fechaInfo && 
             fechaInfo.valor_estimado > 0 && 
             !isDisabled && 
             fechaInfo.estado === 'disponible' && !isSunday && (
              <span className="day-price">
                ${Number(fechaInfo.valor_estimado).toLocaleString('es-AR')}
              </span>
            )}
          </button>
        </div>
      );
    }
    return days;
  };

  return (
    <div className="reservas-page-container">
      <header className="reservas-hero">
        <h1>Reserva tu Evento</h1>
        <p>Selecciona una fecha disponible para comenzar (Próximos 3 meses)</p>
      </header>

      <section className="calendar-main-section">
        <div className="calendar-container-card">
          <div className="calendar-header-nav">
            <button className="nav-arrow" onClick={() => changeMonth(-1)}>‹</button>
            <div className="current-month-display">
              <h3>{currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}</h3>
            </div>
            <button className="nav-arrow" onClick={() => changeMonth(1)}>›</button>
          </div>

          <div className="calendar-week-labels">
            {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'].map(d => <div key={d}>{d}</div>)}
          </div>

          <div className="calendar-grid">
            {isLoading ? <div className="loader-overlay">Cargando...</div> : renderCalendar()}
          </div>

          <div className="calendar-footer-legend">
            <div className="legend-group">
              <span className="dot disponible"></span> <span>Disponible</span>
            </div>
            <div className="legend-group">
              <span className="dot pendiente"></span> <span>Pendiente</span>
            </div>
            <div className="legend-group">
              <span className="dot reservada"></span> <span>Reservado / No Disponible</span>
            </div>
          </div>
        </div>

        <div className="calendar-info-bottom">
          <div className="info-card-integrated">
            <h4>Información de Tarifas</h4>
            <p>Los precios mostrados son estimaciones base para 40 invitados aprox. El valor final se ajustará según cantidad de invitados y servicios extra seleccionados.</p>
            <div className="disclaimer-mini">
              <span className="icon">⚠️</span>
              <span>Solo se permiten reservas con hasta 90 días de anticipación. Los domingos no se encuentran disponibles para eventos privados.</span>
            </div>
          </div>
        </div>
      </section>

      {message && (
        <div className="notification-toast" onClick={() => setMessage('')}>
          {message}
        </div>
      )}
    </div>
  );
}

export default Reservas;