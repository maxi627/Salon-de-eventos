import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './confirmacion.css';

// Componente separado para el texto del contrato para mantener el código limpio.
const ContractTerms = () => (
  <>
    <h3>Términos y Condiciones</h3>
    <p>
      <strong>Contrato de Alquiler de Salón de Eventos.</strong>
    </p>
    <p>
      El presente contrato se celebra entre EL LOCADOR (propietario del salón) y EL LOCATARIO 
      (usuario que realiza la reserva a través de la página web, cuyos datos personales se 
      registran en el formulario de reserva), sujeto a las siguientes cláusulas:
    </p>
    
    <ol>
      <li>
        <strong>Objeto:</strong> EL LOCADOR alquila a EL LOCATARIO el salón de eventos 
        ubicado en Bolivar 1425, para uso exclusivo en la fecha y horario acordados en la reserva.
      </li>
      <li>
        <strong>Uso y Responsabilidad:</strong> EL LOCADOR no se responsabiliza por el tipo 
        de actividad o evento que se realice, siempre que sea lícito. Queda prohibida la venta 
        de entradas, la venta o suministro de alcohol a menores de edad, el consumo de 
        sustancias ilegales y cualquier actividad contraria a la ley. EL LOCATARIO es único 
        responsable por cualquier daño material, accidente o hecho ocurrido durante el evento, 
        así como de las acciones de los invitados y terceros que ingresen al salón.
      </li>
      <li>
        <strong>Cumplimiento Legal:</strong> EL LOCATARIO asume toda responsabilidad por cumplir 
        con las disposiciones legales vigentes en materia de seguridad, salubridad y control de 
        menores. En caso de incumplimiento, EL LOCADOR queda totalmente exento de toda 
        responsabilidad civil, penal o administrativa.
      </li>
      <li>
        <strong>Daños y Limpieza:</strong> EL LOCATARIO deberá restituir el salón en las mismas 
        condiciones en que lo recibió, siendo responsable por cualquier daño ocasionado a las 
        instalaciones, mobiliario o equipamiento. Los gastos de reparación o reposición correrán 
        por cuenta del LOCATARIO.
      </li>
      <li>
        <strong>Pagos y Cancelaciones:</strong> El LOCATARIO deberá abonar la seña establecida 
        al momento de la reserva. En caso de cancelación, no 
        habrá devolución de la seña. En caso de cancelación por parte del LOCADOR por causas de 
        fuerza mayor, se reintegrará el monto abonado sin derecho a reclamos adicionales.
      </li>
      <li>
        <strong>Penalidades:</strong> En caso de incumplimiento de alguna cláusula, EL LOCADOR 
        podrá suspender el evento sin derecho a reclamo o reembolso, además de iniciar las 
        acciones legales correspondientes.
      </li>
      <li>
        <strong>Aceptación Digital:</strong> La aceptación del presente contrato mediante el 
        sistema de reservas online equivale a la firma manuscrita y constituye plena conformidad 
        legal por parte de EL LOCATARIO.
      </li>
      <li>
        <strong>Firma y Conformidad:</strong> Ambas partes declaran haber leído y comprendido 
        el presente contrato, aceptando las cláusulas aquí establecidas.
      </li>
    </ol>
  </>
);

function Confirmacion() {
  const { dateString } = useParams();
  const navigate = useNavigate();

  const [fechaInfo, setFechaInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  
  const [contractAccepted, setContractAccepted] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);

  // Estado para guardar el alias obtenido del backend
  const [paymentAlias, setPaymentAlias] = useState(null);

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
    const getPageData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        // Hacemos las dos peticiones al backend de forma concurrente
        const [fechaResponse, paymentResponse] = await Promise.all([
          fetch(`/api/v1/fecha/by-date/${dateString}`),
          fetch('/api/v1/payment-info', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        // Procesamos la respuesta de la fecha
        const fechaResult = await fechaResponse.json();
        if (!fechaResponse.ok) throw new Error(fechaResult.message);
        if (fechaResult.data.estado !== 'disponible') {
          throw new Error('Esta fecha ya no está disponible.');
        }
        setFechaInfo(fechaResult.data);

        // Procesamos la respuesta de la información de pago
        const paymentResult = await paymentResponse.json();
        if (!paymentResponse.ok) throw new Error(paymentResult.message);
        setPaymentAlias(paymentResult.data.alias);

      } catch (err) {
        setError(err.message);
        setFechaInfo(null);
      } finally {
        setIsLoading(false);
      }
    };
    
    getPageData();
  }, [dateString, navigate]);

  const handleRequestReservation = async () => {
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

      setMessage('¡Solicitud enviada con éxito! Un administrador la revisará a la brevedad. Serás redirigido...');
      setTimeout(() => navigate('/'), 4000);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="confirm-container"><p>Cargando información de la reserva...</p></div>;
  }
  
  return (
    <div className="confirm-container">
      <div className="confirm-box">
        {fechaInfo ? (
          <>
            <h2>Solicitud de Reserva</h2>
            <p className="confirm-text">Fecha a solicitar:</p>
            <p className="confirm-date">{displayDate}</p>

            <div className="payment-info">
              <p>Para confirmar, por favor realiza una transferencia al siguiente alias y adjunta el comprobante.</p>
              {paymentAlias ? (
                <p className="payment-alias">{paymentAlias}</p>
              ) : (
                <p>Cargando datos de pago...</p>
              )}
            </div>

            <div className="contract-box">
              <ContractTerms />
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