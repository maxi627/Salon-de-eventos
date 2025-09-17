import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './confirmacion.css';

function Confirmacion() {
  const { dateString } = useParams();
  const navigate = useNavigate();

  const [fechaInfo, setFechaInfo] = useState(null);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // --- INICIO DE LA MODIFICACIÓN ---

  // Función para formatear la fecha a un estilo más legible
  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return '';
    // Creamos el objeto Date asegurándonos de que maneje bien la zona horaria UTC
    const dateParts = isoDate.split('-');
    const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    
    // Usamos toLocaleDateString para un formato amigable en español
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  // Creamos una nueva variable con la fecha ya formateada para usarla en el JSX
  const displayDate = formatDisplayDate(dateString);

  // --- FIN DE LA MODIFICACIÓN ---

  useEffect(() => {
    const getFechaDetails = async () => {
      try {
        const response = await fetch(`/api/v1/fecha/by-date/${dateString}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        
        if (result.data.estado !== 'disponible') {
          throw new Error('Esta fecha ya no está disponible.');
        }
        setFechaInfo(result.data);
      } catch (error) {
        setMessage(error.message);
      } finally {
        setIsLoading(false);
      }
    };
    getFechaDetails();
  }, [dateString]);

  const handleConfirmReserve = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      setMessage('Necesitas iniciar sesión para reservar.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      const decodedToken = jwtDecode(token);
      const userId = decodedToken.sub;

      const response = await fetch('/api/v1/reserva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: userId,
          fecha_id: fechaInfo.id
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setMessage('¡Reserva creada con éxito! Serás redirigido al inicio.');
      setTimeout(() => navigate('/'), 3000);

    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="confirm-container"><p>Cargando detalles de la fecha...</p></div>;
  }

  return (
    <div className="confirm-container">
      <div className="confirm-box">
        {fechaInfo ? (
          <>
            <h2>Confirmar Reserva</h2>
            <p className="confirm-text">
              Estás a punto de reservar la fecha:
            </p>
            {/* Aquí usamos la nueva variable con la fecha formateada */}
            <p className="confirm-date">{displayDate}</p>
            <p className="confirm-note">
              Una vez confirmada, la fecha quedará bloqueada para ti.
            </p>
            <button 
              onClick={handleConfirmReserve} 
              className="confirm-button"
              disabled={isLoading}
            >
              {isLoading ? 'Procesando...' : 'Confirmar Mi Reserva'}
            </button>
          </>
        ) : (
          <h2>Fecha no disponible</h2>
        )}
        {message && <p className="message-area">{message}</p>}
      </div>
    </div>
  );
}

export default Confirmacion;