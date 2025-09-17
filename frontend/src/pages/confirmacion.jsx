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
  
  // Nuevos estados para el flujo
  const [contractAccepted, setContractAccepted] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);

  const formatDisplayDate = (isoDate) => {
    // ... (esta función no cambia)
  };
  const displayDate = formatDisplayDate(dateString);

  useEffect(() => {
    // ... (esta función no cambia)
  }, [dateString]);

  const handleRequestReservation = async () => {
    if (!contractAccepted || !receiptFile) {
      setError('Debes aceptar el contrato y subir un comprobante.');
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
      // En una aplicación real, aquí subirías el archivo a un servicio de almacenamiento
      // y obtendrías una URL. Para este ejemplo, simularemos una URL.
      const simulatedUrl = `comprobantes/${fechaInfo.id}_${receiptFile.name}`;

      const decodedToken = jwtDecode(token);
      const userId = decodedToken.sub;

      const response = await fetch('/api/v1/reserva', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          usuario_id: parseInt(userId, 10),
          fecha_id: fechaInfo.id,
          comprobante_url: simulatedUrl,
        })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setMessage('¡Solicitud enviada! Un administrador revisará tu comprobante. Serás redirigido...');
      setTimeout(() => navigate('/'), 4000);

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

            <div className="form-group">
              <label htmlFor="receipt">Subir Comprobante de Pago (50%)</label>
              <input 
                type="file" 
                id="receipt"
                onChange={(e) => setReceiptFile(e.target.files[0])}
                accept="image/png, image/jpeg, application/pdf"
              />
            </div>

            <button 
              onClick={handleRequestReservation} 
              className="confirm-button"
              disabled={isLoading || !contractAccepted || !receiptFile}
            >
              {isLoading ? 'Enviando...' : 'Enviar Solicitud de Reserva'}
            </button>
          </>
        ) : (
          <h2>{error || 'Fecha no disponible'}</h2>
        )}
        {message && <p className="message-area">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default Confirmacion;