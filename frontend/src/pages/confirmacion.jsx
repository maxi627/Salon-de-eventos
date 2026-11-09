import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { FaCheck, FaCircleCheck, FaCopy, FaFileLines, FaWhatsapp, FaXmark } from 'react-icons/fa6';
import { Navigate, useParams } from 'react-router-dom';
import Pasos from '../components/sitio/Pasos';
import '../components/sitio/reserva-pasos.css';
import SubirComprobante from '../components/sitio/SubirComprobante';
import Button from '../components/ui/Button';
import { SALON, whatsappConTexto } from '../content/salon';
import { esReservable, formatoFechaLarga, formatoPesos, hoyLocal, montoSena, precioDe } from '../lib/fechas';
import { sesionValida } from '../lib/sesion';

// Componente con el contrato original
const ContractTerms = () => (
  <>
    <p><strong>Contrato de Locación - Salón de Usos Múltiples (SUM).</strong></p>
    <p>
      El presente contrato de locación temporal se celebra entre EL LOCADOR (propietario/administrador del espacio) y EL LOCATARIO 
      (usuario que realiza la reserva a través de la página web, cuyos datos personales se 
      registran en el formulario de reserva), sujeto a las siguientes cláusulas:
    </p>
    
    <ol>
      <li><strong>Objeto:</strong> EL LOCADOR cede temporalmente a EL LOCATARIO el uso del Salón de Usos Múltiples (SUM) / ubicado en Bolivar 1425, para el desarrollo de un evento de carácter estrictamente privado en la fecha y horario acordados en la reserva.</li>
      <li><strong>Uso, Restricciones y Responsabilidad:</strong> El inmueble se alquila exclusivamente bajo la modalidad de reunión privada a puertas cerradas. Queda <strong>estrictamente prohibida la venta de entradas o taquilla, la comercialización o venta de bebidas alcohólicas dentro del predio</strong>, el suministro de alcohol a menores de edad, el consumo de sustancias ilegales y la instalación de equipos de sonido profesionales de alta potencia (subwoofers de piso o estructuras comerciales). EL LOCATARIO asume la total responsabilidad civil y penal por cualquier daño material, accidente o hecho ocurrido durante el evento, así como por las acciones de los invitados y terceros que ingresen al establecimiento.</li>
      <li><strong>Cumplimiento Legal y Ruidos Molestos:</strong> EL LOCATARIO asume toda responsabilidad por cumplir con las normativas vigentes en materia de seguridad, salubridad y la Ordenanza Municipal de San Rafael sobre ruidos molestos. El volumen de la música deberá mantenerse dentro de los decibeles permitidos para un entorno residencial, y queda estrictamente prohibido generar disturbios en la vía pública o alterar el orden del vecindario. En caso de multas, quejas formales o clausuras derivadas del incumplimiento de estas normas o del exceso de ruido, EL LOCADOR queda exento de toda responsabilidad, debiendo EL LOCATARIO responder económica y legalmente por las sanciones aplicadas.</li>
      <li><strong>Daños y Limpieza:</strong> EL LOCATARIO deberá restituir el salón en las mismas condiciones en que lo recibió, siendo responsable por cualquier daño ocasionado a las instalaciones, mobiliario o equipamiento. Los gastos de reparación o reposición correrán por cuenta del LOCATARIO.</li>
      <li><strong>Pagos y Cancelaciones:</strong> EL LOCATARIO deberá abonar la seña establecida al momento de la reserva. En caso de cancelación por parte del cliente, no habrá devolución de la seña. En caso de cancelación por parte del LOCADOR por causas de fuerza mayor o problemas edilicios imprevistos, se reintegrará el monto abonado sin derecho a reclamos adicionales.</li>
      <li><strong>Penalidades:</strong> En caso de constatarse el incumplimiento de alguna cláusula (como la comercialización de entradas/bebidas o disturbios graves), EL LOCADOR podrá suspender el evento de forma inmediata sin derecho a reclamo o reembolso por parte del LOCATARIO, además de iniciar las acciones legales correspondientes.</li>
      <li><strong>Capacidad Máxima Infranqueable:</strong> Conforme a las normativas de seguridad y la habilitación del espacio como SUM, se establece un límite de capacidad máximo y estricto de <strong>50 personas en total</strong> dentro del establecimiento. Bajo ninguna circunstancia se permitirá el ingreso de un flujo superior de asistentes. El incumplimiento de esta norma facultará al LOCADOR a dar por finalizado el evento de forma inmediata por razones de seguridad.</li>
      <li><strong>Exceso de Horario y Finalización:</strong> El evento contempla exclusivamente la franja horaria pactada en la reserva. Cualquier extensión del horario deberá solicitarse con anticipación, quedando sujeta a la disponibilidad del salón y al abono de la tarifa de "hora extra" vigente. De excederse el límite horario sin autorización previa, se aplicará de forma automática el cobro del tiempo excedido. Si el salón no tuviera disponibilidad para extender el turno, EL LOCATARIO se compromete a finalizar el evento y desocupar las instalaciones a la hora acordada, facultando a EL LOCADOR a dar por concluido el servicio para iniciar las tareas de acondicionamiento.</li>
      <li><strong>Derechos de Autor (SADAIC/AADI CAPIF):</strong> Conforme al Decreto Nacional 765/2024, el presente evento se declara de carácter estrictamente privado, familiar y con acceso restringido, desarrollado en un espacio que no tiene fines de explotación comercial pública ni cobra tarifas de acceso, por lo que queda exento del pago de aranceles por derechos de autor. Si EL LOCATARIO alterase de cualquier forma la naturaleza privada del evento, será el único responsable de gestionar los permisos y abonar los cánones correspondientes a las entidades recaudadoras, eximiendo a EL LOCADOR de cualquier sanción o reclamo.</li>
      <li><strong>Jurisdicción:</strong> Para cualquier conflicto legal derivado del presente, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Segunda Circunscripción Judicial de la Provincia de Mendoza, con asiento en la ciudad de San Rafael.</li>
      <li><strong>Aceptación Digital:</strong> La aceptación del presente contrato mediante el sistema de reservas online equivale a la firma manuscrita y constituye plena conformidad legal por parte de EL LOCATARIO.</li>
      <li><strong>Firma y Conformidad:</strong> Ambas partes declaran haber leído y comprendido el presente contrato, aceptando las cláusulas aquí establecidas.</li>
    </ol>
  </>
);

function Confirmacion() {
  const { dateString } = useParams();
  const queryClient = useQueryClient();
  const hoy = hoyLocal();
  const fechaValida = esReservable(dateString, undefined, hoy);
  const sesion = sesionValida(localStorage.getItem('authToken'));

  const [step, setStep] = useState(1);
  const [fechaInfo, setFechaInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [contractAccepted, setContractAccepted] = useState(false);
  const [ageAccepted, setAgeAccepted] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [paymentCVU, setPaymentCVU] = useState(null);
  const [copied, setCopied] = useState(false);

  const debeCargar = fechaValida && Boolean(sesion);

  useEffect(() => {
    if (!debeCargar) return;
    const getPageData = async () => {
      setIsLoading(true);
      const token = localStorage.getItem('authToken');
      try {
        const [fechaResponse, paymentResponse] = await Promise.all([
          fetch(`/api/v1/fecha/by-date/${dateString}`, { headers: { 'Authorization': `Bearer ${token}` } }),
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
        setLoadError(err.message || 'No pudimos cargar la fecha.');
        setFechaInfo(null);
      } finally {
        setIsLoading(false);
      }
    };
    getPageData();
  }, [dateString, debeCargar]);

  // Cerrar el contrato con Escape
  useEffect(() => {
    if (!isModalOpen) return undefined;
    const alPresionar = (e) => {
      if (e.key === 'Escape') setIsModalOpen(false);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [isModalOpen]);

  if (!fechaValida) {
    return (
      <div className="sv-contenedor sv-reserva">
        <div className="sv-tarjeta sv-reserva__aviso">
          <h1>Esta fecha no se puede reservar</h1>
          <p>Puede ser domingo, una fecha pasada o estar a más de 90 días.</p>
          <Button to="/reservar">Elegir otra fecha</Button>
        </div>
      </div>
    );
  }

  if (!sesion) {
    return <Navigate to={`/login?volver=${encodeURIComponent(`/reservar/${dateString}`)}`} replace />;
  }

  const fechaLarga = formatoFechaLarga(dateString);
  const precio = precioDe(fechaInfo);
  const sena = montoSena(precio);

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

  const handleFileChange = (file) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Subí únicamente una imagen (JPG, PNG o WEBP).');
      setReceiptFile(null);
      return;
    }
    setError('');
    setReceiptFile(file);
  };

  const handleRequestReservation = async () => {
    if (!contractAccepted || !ageAccepted || !receiptFile) {
      setError('Tenés que aceptar los términos y subir el comprobante.');
      return;
    }
    const token = localStorage.getItem('authToken');
    setIsSending(true);
    setError('');
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
      // El calendario y "Mis reservas" tienen que reflejar la pre-reserva.
      queryClient.invalidateQueries({ queryKey: ['fechas'] });
      queryClient.invalidateQueries({ queryKey: ['mis-reservas'] });
      setStep(3);
      window.scrollTo({ top: 0 });
    } catch (err) {
      setError(err.message || 'No pudimos enviar el comprobante. Probá de nuevo.');
    } finally {
      setIsSending(false);
    }
  };

  // Al cerrar el contrato con "Entendido y aceptado" se tilda solo
  const handleAcceptModal = () => {
    setContractAccepted(true);
    setIsModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className="sv-contenedor sv-reserva">
        <div className="sv-tarjeta sv-reserva__carga" aria-busy="true">
          <div className="sv-fantasma" style={{ height: 28, width: '60%' }} />
          <div className="sv-fantasma" style={{ height: 16, width: '40%', marginTop: 12 }} />
          <div className="sv-fantasma" style={{ height: 120, marginTop: 20 }} />
        </div>
      </div>
    );
  }

  if (!fechaInfo) {
    return (
      <div className="sv-contenedor sv-reserva">
        <div className="sv-tarjeta sv-reserva__aviso" role="alert">
          <h1>{loadError || 'Fecha no disponible'}</h1>
          <p>Elegí otra fecha del calendario o escribinos por WhatsApp.</p>
          <Button to="/reservar">Elegir otra fecha</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="sv-contenedor sv-reserva">
      <Pasos actual={step} etiquetas={['Contrato', 'Seña', 'Listo']} />

      {step === 1 && (
        <section className="sv-reserva__paso">
          <h1>Leé y aceptá el contrato</h1>
          <p className="sv-reserva__fecha">{fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)}</p>

          <div className="sv-tarjeta">
            <Button variant="secundario" onClick={() => setIsModalOpen(true)} className="sv-reserva__leer">
              <FaFileLines aria-hidden="true" /> Leer el contrato de locación
            </Button>

            <label className="sv-check">
              <input type="checkbox" checked={contractAccepted} onChange={() => setContractAccepted(!contractAccepted)} />
              <span>Leí y acepto los términos del contrato.</span>
            </label>
            <label className="sv-check">
              <input type="checkbox" checked={ageAccepted} onChange={() => setAgeAccepted(!ageAccepted)} />
              <span>Declaro bajo juramento ser mayor de 18 años y tener plena capacidad legal para contratar.</span>
            </label>
          </div>

          <div className="sv-reserva__botones">
            <Button onClick={() => setStep(2)} disabled={!contractAccepted || !ageAccepted}>Continuar al pago</Button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="sv-reserva__paso">
          <h1>Transferí la seña</h1>
          <p className="sv-reserva__fecha">
            {fechaLarga.charAt(0).toUpperCase() + fechaLarga.slice(1)}
            {precio ? ` · precio estimado ${formatoPesos(precio)}` : ''}
          </p>

          <div className="sv-tarjeta">
            {sena ? (
              <>
                <p className="sv-reserva__etiqueta">Monto de la seña (30%)</p>
                <p className="sv-reserva__monto">{formatoPesos(sena)}</p>
              </>
            ) : (
              <div className="sv-reserva__sin-precio">
                <p>Esta fecha todavía no tiene precio cargado. Te confirmamos el monto de la seña por WhatsApp.</p>
                <Button variant="secundario" href={whatsappConTexto(`Hola, quiero reservar el ${fechaLarga}. ¿Cuál es el monto de la seña?`)} target="_blank" rel="noopener noreferrer">
                  <FaWhatsapp aria-hidden="true" /> Consultar por WhatsApp
                </Button>
              </div>
            )}

            <p className="sv-reserva__etiqueta">Transferí al alias</p>
            {paymentCVU ? (
              <div className="sv-alias">
                <span className="sv-alias__valor">{paymentCVU}</span>
                <Button onClick={handleCopyCVU} className="sv-alias__copiar">
                  {copied ? <><FaCheck aria-hidden="true" /> ¡Copiado!</> : <><FaCopy aria-hidden="true" /> Copiar</>}
                </Button>
              </div>
            ) : (
              <p>Cargando datos de pago…</p>
            )}

            <p className="sv-reserva__nota">
              Transferí desde una cuenta a tu nombre. Si usás otra, poné tu <strong>DNI</strong> en la referencia del pago.
            </p>

            <SubirComprobante archivo={receiptFile} onElegir={handleFileChange} />
          </div>

          {error && <p className="sv-error" role="alert">{error}</p>}

          <div className="sv-reserva__botones">
            <Button onClick={handleRequestReservation} disabled={isSending || !receiptFile}>
              {isSending ? 'Enviando…' : 'Enviar comprobante'}
            </Button>
            <Button variant="secundario" onClick={() => setStep(1)} disabled={isSending}>Volver</Button>
          </div>
        </section>
      )}

      {step === 3 && (
        <section className="sv-reserva__paso sv-reserva__listo">
          <FaCircleCheck className="sv-reserva__icono-listo" aria-hidden="true" />
          <h1>¡Listo! Tu fecha quedó pre-reservada</h1>
          <p>
            Vamos a revisar tu comprobante y te va a llegar el contrato por correo cuando confirmemos la reserva
            del {fechaLarga}.
          </p>
          <div className="sv-reserva__botones">
            <Button to="/mis-reservas">Ver mis reservas</Button>
            <Button variant="secundario" href={SALON.whatsappUrl} target="_blank" rel="noopener noreferrer">
              <FaWhatsapp aria-hidden="true" /> WhatsApp
            </Button>
          </div>
        </section>
      )}

      {isModalOpen && (
        <div className="sv-modal" onClick={() => setIsModalOpen(false)}>
          <div
            className="sv-modal__contenido"
            role="dialog"
            aria-modal="true"
            aria-labelledby="titulo-contrato"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sv-modal__cabecera">
              <h2 id="titulo-contrato">Contrato de locación</h2>
              <button type="button" className="sv-modal__cerrar" onClick={() => setIsModalOpen(false)} aria-label="Cerrar">
                <FaXmark aria-hidden="true" />
              </button>
            </div>
            <div className="sv-modal__cuerpo">
              <ContractTerms />
            </div>
            <div className="sv-modal__pie">
              <Button onClick={handleAcceptModal}>Entendido y aceptado</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Confirmacion;
