import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Swal from 'sweetalert2';
import './confirmacion.css';

// Componente con el contrato original
const ContractTerms = () => (
  <>
    <p><strong>Contrato de Alquiler de Salón de Eventos.</strong></p>
    <p>
      El presente contrato se celebra entre EL LOCADOR (propietario del salón) y EL LOCATARIO 
      (usuario que realiza la reserva a través de la página web, cuyos datos personales se 
      registran en el formulario de reserva), sujeto a las siguientes cláusulas:
    </p>
    
    <ol>
      <li><strong>Objeto:</strong> EL LOCADOR alquila a EL LOCATARIO el salón de eventos ubicado en Bolivar 1425, para uso exclusivo en la fecha y horario acordados en la reserva.</li>
      <li><strong>Uso y Responsabilidad:</strong> EL LOCADOR no se responsabiliza por el tipo de actividad o evento que se realice, siempre que sea lícito. Queda prohibida la venta de entradas, la venta o suministro de alcohol a menores de edad, el consumo de sustancias ilegales y cualquier actividad contraria a la ley. EL LOCATARIO es único responsable por cualquier daño material, accidente o hecho ocurrido durante el evento, así como de las acciones de los invitados y terceros que ingresen al salón.</li>
      <li><strong>Cumplimiento Legal y Ruidos Molestos:</strong> EL LOCATARIO asume toda responsabilidad por cumplir con las normativas vigentes en materia de seguridad, salubridad y la Ordenanza Municipal sobre ruidos molestos. El volumen de la música deberá mantenerse dentro de los decibeles permitidos, y queda estrictamente prohibido generar disturbios en la vía pública o alterar el orden del vecindario. En caso de multas, quejas formales o clausuras derivadas del comportamiento de los asistentes, EL LOCADOR queda exento de toda responsabilidad civil, penal o administrativa, debiendo EL LOCATARIO responder económica y legalmente.</li>
      <li><strong>Daños y Limpieza:</strong> EL LOCATARIO deberá restituir el salón en las mismas condiciones en que lo recibió, siendo responsable por cualquier daño ocasionado a las instalaciones, mobiliario o equipamiento. Los gastos de reparación o reposición correrán por cuenta del LOCATARIO.</li>
      <li><strong>Pagos y Cancelaciones:</strong> EL LOCATARIO deberá abonar la seña establecida al momento de la reserva. En caso de cancelación, no habrá devolución de la seña. En caso de cancelación por parte del LOCADOR por causas de fuerza mayor, se reintegrará el monto abonado sin derecho a reclamos adicionales.</li>
      <li><strong>Penalidades:</strong> En caso de incumplimiento de alguna cláusula, EL LOCADOR podrá suspender el evento sin derecho a reclamo o reembolso, además de iniciar las acciones legales correspondientes.</li>
      <li><strong>Capacidad Base y Ajustes:</strong> El presente contrato se emite inicialmente bajo una estimación de <strong>40 personas</strong>. En caso de requerir una capacidad superior, EL LOCATARIO deberá coordinar con EL LOCADOR el ajuste de capacidad y precio final. El contrato definitivo con el valor legal final será enviado por correo electrónico una vez que EL LOCADOR confirme la reserva.</li>
      <li><strong>Exceso de Horario y Finalización:</strong> El evento contempla exclusivamente la franja horaria pactada en la reserva. Entendemos que los eventos pueden prolongarse, por lo que cualquier extensión del horario deberá solicitarse con anticipación, quedando sujeta a la disponibilidad del salón y al abono de la tarifa de "hora extra" vigente. De excederse el límite horario sin autorización previa, se aplicará de forma automática el cobro del tiempo excedido. Si el salón no tuviera disponibilidad para extender el turno, EL LOCATARIO se compromete a finalizar el evento a la hora acordada, facultando a EL LOCADOR a dar por concluido el servicio.</li>
      <li><strong>Derechos de Autor (SADAIC/AADI CAPIF):</strong> Conforme al Decreto Nacional 765/2024, el evento es de carácter estrictamente privado, por lo que queda exento de aranceles por derechos de autor. Si EL LOCATARIO alterase la naturaleza del evento, será el único responsable de gestionar permisos y abonar los cánones correspondientes.</li>
      <li><strong>Jurisdicción:</strong> Para cualquier conflicto legal, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Segunda Circunscripción Judicial de la Provincia de Mendoza, con asiento en San Rafael.</li>
      <li><strong>Aceptación Digital:</strong> La aceptación del presente contrato mediante el sistema de reservas online equivale a la firma manuscrita y constituye plena conformidad legal por parte de EL LOCATARIO.</li>
      <li><strong>Firma y Conformidad:</strong> Ambas partes declaran haber leído y comprendido el presente contrato, aceptando las cláusulas aquí establecidas.</li>
    </ol>
  </>
);

function Confirmacion() {
  const { dateString } = useParams();
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [fechaInfo, setFechaInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [contractAccepted, setContractAccepted] = useState(false);
  const [ageAccepted, setAgeAccepted] = useState(false);
  
  // NUEVO ESTADO: Controla si el modal del contrato está abierto
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [receiptFile, setReceiptFile] = useState(null);
  const [paymentCVU, setPaymentCVU] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleCopyCVU = () => {
    if (paymentCVU) {
      navigator.clipboard.writeText(paymentCVU)
        .then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        })
        .catch(err => console.error("Error al copiar CVU: ", err));
    }
  };

  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return '';
    const dateParts = isoDate.split('-');
    const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    return date.toLocaleDateString('es-ES', {
      day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC'
    });
  };

  const displayDate = formatDisplayDate(dateString);

  useEffect(() => {
    const getPageData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      if (!token) { navigate('/login'); return; }

      try {
        const [fechaResponse, paymentResponse] = await Promise.all([
          fetch(`/api/v1/fecha/by-date/${dateString}`),
          fetch('/api/v1/payment-info', { headers: { 'Authorization': `Bearer ${token}` } })
        ]);

        const fechaResult = await fechaResponse.json();
        if (!fechaResponse.ok) throw new Error(fechaResult.message);
        
        if (fechaResult.data.estado !== 'disponible') {
          throw new Error('Esta fecha ya no está disponible.');
        }
        setFechaInfo(fechaResult.data);

        const paymentResult = await paymentResponse.json();
        if (!paymentResponse.ok) throw new Error(paymentResult.message);
        
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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor, sube únicamente una imagen (JPG, PNG, WEBP, etc).');
        setReceiptFile(null);
        e.target.value = '';
        return;
      }
      setError('');
      setReceiptFile(file);
    }
  };

  const handleRequestReservation = async () => {
    if (!contractAccepted || !ageAccepted || !receiptFile) {
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

      Swal.fire({
        title: '¡Solicitud Enviada!',
        text: 'Tu fecha ya está pre-reservada. Vamos a revisar tu comprobante y te notificaremos en breve.',
        icon: 'success',
        confirmButtonColor: '#3085d6',
        confirmButtonText: 'Genial',
        allowOutsideClick: false
      }).then(() => { navigate('/'); });

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Función que tilda el contrato automáticamente al cerrarlo
  const handleAcceptModal = () => {
    setContractAccepted(true);
    setIsModalOpen(false);
  };

  if (isLoading && !fechaInfo) return <div className="confirm-container"><p>Cargando información de la reserva...</p></div>;
  
  return (
    <div className="confirm-container">
      <div className="confirm-box">
        {fechaInfo ? (
          <>
            {/* ================= PASO 1: CONTRATO Y LEGALES ================= */}
            {step === 1 && (
              <div className="wizard-step">
                <h2>Paso 1 de 2: Condiciones de Reserva</h2>
                <p className="confirm-text">Fecha a solicitar:</p>
                <p className="confirm-date" style={{ marginBottom: '1.5rem' }}>{displayDate}</p>

                {/* BOTÓN PARA ABRIR EL MODAL (Reemplaza a la caja de scroll) */}
                <button 
                  type="button" 
                  className="btn-leer-contrato" 
                  onClick={() => setIsModalOpen(true)}
                >
                  <i className="fa-regular fa-file-lines" style={{ marginRight: '8px' }}></i>
                  Leer Contrato de Locación
                </button>
                
                <div className="form-check" style={{ marginTop: '25px', marginBottom: '10px' }}>
                  <input 
                    type="checkbox" id="accept-contract"
                    checked={contractAccepted}
                    onChange={() => setContractAccepted(!contractAccepted)}
                  />
                  <label htmlFor="accept-contract">He leído y acepto los términos base del contrato.</label>
                </div>

                <div className="form-check" style={{ marginBottom: '20px' }}>
                  <input 
                    type="checkbox" id="accept-age"
                    checked={ageAccepted}
                    onChange={() => setAgeAccepted(!ageAccepted)}
                  />
                  <label htmlFor="accept-age">
                    Declaro bajo juramento ser mayor de 18 años y poseer plena capacidad legal para contratar.
                  </label>
                </div>

                <button 
                  type="button"
                  onClick={() => setStep(2)} 
                  className="confirm-button"
                  disabled={!contractAccepted || !ageAccepted}
                >
                  Continuar al Pago ➡️
                </button>
              </div>
            )}

            {/* ================= PASO 2: PAGO Y COMPROBANTE ================= */}
            {step === 2 && (
              <div className="wizard-step">
                <h2>Paso 2 de 2: Pago de Seña</h2>
                <p className="confirm-text">Mantenemos tu fecha reservada: <strong>{displayDate}</strong></p>

                <div className="payment-info" style={{ marginTop: '1.5rem' }}>
                  <p>Realiza la transferencia al siguiente <strong>CVU</strong> y adjunta el comprobante:</p>
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
                  <p className="payment-seña">SEÑA: 30% del valor estimado para iniciar el proceso.</p>
                </div>

                <div style={{ backgroundColor: '#eff6ff', borderLeft: '4px solid #3b82f6', padding: '12px', margin: '15px 0', fontSize: '0.9rem', color: '#1e40af', borderRadius: '4px' }}>
                    <strong>Importante:</strong> Para procesar tu reserva, el pago debe coincidir con el titular del contrato. Si transferís desde otra cuenta, debés aclarar el <strong>DNI del titular</strong> en la referencia del pago.
                </div>

                <div className="form-group" style={{ marginTop: '1.5rem' }}>
                  <label htmlFor="receipt">Subir Comprobante de Pago (Solo imágenes)</label>
                  <input 
                    type="file" id="receipt"
                    onChange={handleFileChange}
                    accept="image/jpeg, image/png, image/webp"
                  />
                </div>

                <div className="button-group-wizard">
                  <button type="button" onClick={() => setStep(1)} className="back-button" disabled={isLoading}>
                    ⬅️ Volver
                  </button>
                  <button onClick={handleRequestReservation} className="confirm-button" disabled={isLoading || !receiptFile}>
                    {isLoading ? 'Enviando...' : 'Enviar Solicitud'}
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <h2>{error || 'Fecha no disponible'}</h2>
        )}

        {error && <p className="error-message">{error}</p>}
      </div>

      {/* ================= MODAL FLOTANTE DEL CONTRATO ================= */}
      {isModalOpen && (
        <div className="contract-modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="contract-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="contract-modal-header">
              <h3>Contrato de Locación</h3>
              <button className="close-modal-btn" onClick={() => setIsModalOpen(false)}>
                <i className="fa-solid fa-xmark"></i>
              </button>
            </div>
            <div className="contract-modal-body">
              <ContractTerms />
            </div>
            <div className="contract-modal-footer">
              <button type="button" className="btn-aceptar-modal" onClick={handleAcceptModal}>
                Entendido y Aceptado
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Confirmacion;