import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import './confirmacion.css';

// Componente con los términos legales actualizados para Bolívar y Bombal
const ContractTerms = () => (
  <>
    <h3>Términos y Condiciones</h3>
    <p>
      <strong>Contrato de Alquiler de Salón de Eventos.</strong>
    </p>
    <p>
      El presente contrato se celebra entre EL LOCADOR (propietario del salón) y EL LOCATARIO 
      (usuario que realiza la reserva), sujeto a las siguientes cláusulas:
    </p>
    
    <ol>
      <li>
        <strong>Objeto:</strong> Alquiler del salón ubicado en Bolivar 1425, San Rafael, Mendoza.
      </li>
      <li>
        <strong>Responsabilidad:</strong> EL LOCATARIO es único responsable por daños materiales o accidentes durante el evento.
      </li>
      <li>
        <strong>Cumplimiento:</strong> Se prohíbe la venta de alcohol a menores y actividades ilícitas.
      </li>
      <li>
        <strong>Pagos y Cancelaciones:</strong> La seña no es reembolsable en caso de cancelación por parte del cliente.
      </li>
      <li>
        <strong>Capacidad:</strong> Estimación inicial de 40 personas. Ajustes finales coordinados con el admin.
      </li>
      <li>
        <strong>Firma Digital:</strong> La aceptación online equivale a una firma manuscrita y constituye plena conformidad legal.
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

  // Estados para CVU y feedback de copiado
  const [paymentCVU, setPaymentCVU] = useState(null);
  const [copied, setCopied] = useState(false);

  // --- FUNCIÓN PARA COPIAR AL PORTAPAPELES ---
  const handleCopyCVU = () => {
    if (paymentCVU) {
      navigator.clipboard.writeText(paymentCVU)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000); // Feedback visual de 2 segundos
        })
        .catch(err => console.error("Error al copiar: ", err));
    }
  };

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
        const [fechaResponse, paymentResponse] = await Promise.all([
          fetch(`/api/v1/fecha/by-date/${dateString}`),
          fetch('/api/v1/payment-info', {
            headers: { 'Authorization': `Bearer ${token}` }
          })
        ]);

        const fechaResult = await fechaResponse.json();
        if (!fechaResponse.ok) throw new Error(fechaResult.message);
        
        if (fechaResult.data.estado !== 'disponible') {
          throw new Error('Esta fecha ya no está disponible.');
        }
        setFechaInfo(fechaResult.data);

        const paymentResult = await paymentResponse.json();
        if (!paymentResponse.ok) throw new Error(paymentResult.message);
        
        // Asignamos el CVU (o alias como fallback)
        setPaymentCVU(paymentResult.data.cvu || paymentResult.data.alias);

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
    if (!contractAccepted || !receiptFile) {
      setError('Debes aceptar los términos y subir el comprobante.');
      return;
    }

    const token = localStorage.getItem('authToken');
    setIsLoading(true);

    const formData = new FormData();
    formData.append('fecha_id', fechaInfo.id);
    formData.append('comprobante', receiptFile);
    formData.append('capacidad_declarada', 40);

    try {
      const response = await fetch('/api/v1/reserva/solicitar', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setMessage('¡Solicitud enviada! Revisaremos tu pago y confirmaremos la reserva pronto.');
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
            <p className="confirm-text">Fecha seleccionada:</p>
            <p className="confirm-date">{displayDate}</p>

            <div className="payment-info">
              <p>Realizá la transferencia al siguiente <strong>CVU</strong> y adjuntá el comprobante:</p>
              
              {paymentCVU ? (
                <div className="cvu-copy-box">
                  <span className="cvu-number">{paymentCVU}</span>
                  <button 
                    type="button" 
                    className={`copy-button ${copied ? 'copied' : ''}`}
                    onClick={handleCopyCVU}
                  >
                    {copied ? '¡Copiado!' : 'Copiar CVU'}
                  </button>
                </div>
              ) : (
                <p>Cargando datos de pago...</p>
              )}
              
              <p className="payment-seña">SEÑA: 30% del valor total para confirmar.</p>
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
              <label htmlFor="accept">He leído y acepto los términos del contrato.</label>
            </div>

            <div className="form-group">
              <label htmlFor="receipt">Subir Comprobante de Pago</label>
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
              {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
            </button>
          </>
        ) : (
          <h2>{error || 'Fecha no disponible'}</h2>
        )}

        {message && <p className="message-area success">{message}</p>}
        {error && <p className="error-message">{error}</p>}
      </div>
    </div>
  );
}

export default Confirmacion;