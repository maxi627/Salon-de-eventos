import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './confirmacion.css';

function Confirmacion() {
  const { dateString } = useParams();
  const navigate = useNavigate();

  const [fechaInfo, setFechaInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  // Estados para el nuevo flujo de solicitud
  const [contractAccepted, setContractAccepted] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);

  // Función para formatear la fecha a un estilo más legible
  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return '';
    const dateParts = isoDate.split('-');
    const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    return date.toLocaleDateString('es-ES', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC'
    });
  };

  const displayDate = formatDisplayDate(dateString);

  useEffect(() => {
    const getFechaDetails = async () => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/v1/fecha/by-date/${dateString}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result.message);
        
        if (result.data.estado !== 'disponible') {
          throw new Error('Esta fecha ya no está disponible.');
        }
        setFechaInfo(result.data);
      } catch (err) {
        setError(err.message);
        setFechaInfo(null); // Aseguramos que no se muestre el formulario si hay error
      } finally {
        setIsLoading(false);
      }
    };
    getFechaDetails();
  }, [dateString]);

  const handleRequestReservation = async () => {
    // Validaciones iniciales
    if (!contractAccepted) {
      setError('Debes aceptar los términos y condiciones.');
      return;
    }
    if (!receiptFile) {
      setError('Debes subir un comprobante de pago.');
      return;
    }
    const token = localStorage.getItem('authToken');
    if (!token) {
      navigate('/login');
      return;
    }

    setIsLoading(true);
    setError('');
    setMessage('');

    try {
      // En una aplicación real, aquí subirías el archivo a un servicio de almacenamiento (como AWS S3, Firebase Storage, etc.)
      // y obtendrías una URL. Para este ejemplo, simularemos una URL basada en el nombre del archivo.
      const simulatedUrl = `comprobantes/${fechaInfo.id}_${receiptFile.name}`;

      const decodedToken = jwtDecode(token);
      const userId = decodedToken.sub;

      // Se envía la solicitud de reserva al backend
      const response = await fetch('/api/v1/reserva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: parseInt(userId, 10),
          fecha_id: fechaInfo.id,
          comprobante_url: simulatedUrl, // Se envía la URL simulada
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setMessage('¡Solicitud enviada con éxito! Un administrador la revisará a la brevedad. Serás redirigido...');
      setTimeout(() => navigate('/'), 4000); // Redirige al inicio

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="confirm-container"><p>Cargando...</p></div>;
  }
  
  return (
    <div className="confirm-container">
      <div className="confirm-box">
        {fechaInfo ? (
          <>
            <h2>Solicitud de Reserva</h2>
            <p className="confirm-text">Fecha a solicitar:</p>
            <p className="confirm-date">{displayDate}</p>

            {/* SECCIÓN DEL CONTRATO */}
            <div className="contract-box">
              <h3>Términos y Condiciones</h3>
              <p>
                <b>(Este es un texto de ejemplo. Consulta a un profesional legal.)</b><br/>
                1. El solicitante se compromete a abonar el 50% del valor total para que esta solicitud sea considerada.
                2. El salón debe ser devuelto en las mismas condiciones en que fue entregado.
                3. Cualquier daño al mobiliario o instalaciones será responsabilidad del solicitante.
                4. La reserva no estará confirmada hasta recibir la aprobación de un administrador.
              </p>
            </div>
            <div className="form-check">
              <input 
                type="checkbox" 
                id="accept"
                checked={contractAccepted}
                onChange={() => setContractAccepted(!contractAccepted)}
              />
              <label htmlFor="accept">He leído y acepto los términos y condiciones.</label>
            </div>

            {/* SECCIÓN DE SUBIDA DE ARCHIVO */}
            <div className="form-group">
              <label htmlFor="receipt">Subir Comprobante de Pago (50%)</label>
              <input 
                type="file" 
                id="receipt"
                onChange={(e) => setReceiptFile(e.target.files[0])}
                accept="image/png, image/jpeg, application/pdf"
              />
            </div>

            {/* BOTÓN DE ENVÍO */}
            <button 
              onClick={handleRequestReservation} 
              className="confirm-button"
              disabled={isLoading || !contractAccepted || !receiptFile}
            >
              {isLoading ? 'Enviando...' : 'Enviar Solicitud de Reserva'}
            </button>
          </>
        ) : (
          // Mensaje si la fecha no está disponible o hubo un error al cargar
          <h2>{error || 'Fecha no disponible'}</h2>
        )}

        {/* ÁREA DE MENSAJES PARA EL USUARIO */}
        {message && <p className="message-area">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default Confirmacion;