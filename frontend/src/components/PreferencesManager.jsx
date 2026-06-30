import { useState } from 'react';
import './PreferencesManager.css';

const PreferencesManager = () => {
  const [preferences, setPreferences] = useState({
    habilitar_contratos: false,
    enviar_correos: true, 
  });

  // Estado con tu plantilla HTML exacta por defecto
  const [contractTemplate, setContractTemplate] = useState(
    `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>Contrato de Locación - Salón de Usos Múltiples (SUM)</title>
    <style>
        body { font-family: sans-serif; line-height: 1.6; color: #333; margin: 30px; }
        h1, h2 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 5px; }
        h1 { font-size: 24px; }
        h2 { font-size: 20px; margin-top: 30px; }
        strong { font-weight: bold; }
        ol { padding-left: 25px; }
        li { margin-bottom: 12px; }
        .header-info { margin-bottom: 20px; padding: 15px; background-color: #f4f7f6; border-radius: 5px; border: 1px solid #e1e1e1;}
        .footer { margin-top: 40px; padding-top: 15px; border-top: 1px solid #ccc; font-size: 0.9em; color: #777; }
    </style>
</head>
<body>
    <h1>Contrato de Locación - Salón de Usos Múltiples (SUM)</h1>
    
    <div class="header-info">
        <p><strong>Fecha del Evento:</strong> {{ event_date }}</p>
        <p><strong>Horario Pactado:</strong> 
            {% if hora_inicio and hora_fin %}
                de {{ hora_inicio }} a {{ hora_fin }} hs.
            {% else %}
                de 11:00 a 20:00 hs (Horario Base).
            {% endif %}
        </p>
        <p><strong>Cliente (LOCATARIO):</strong> {{ user_name }} (DNI: {{ user_dni }})</p>
        <p><strong>Capacidad Máxima Autorizada:</strong> 50 Personas (Límite Estricto)</p>
    </div>
    
    <h2>Términos y Condiciones</h2>
    <p>
      El presente contrato de locación temporal se celebra entre EL LOCADOR (propietario/administrador del espacio) y EL LOCATARIO 
      (usuario que realiza la reserva a través de la página web, cuyos datos personales se registran en el formulario de reserva), sujeto a las siguientes cláusulas:
    </p>
    
    <ol>
        <li>
            <strong>Objeto:</strong> EL LOCADOR cede temporalmente a EL LOCATARIO el uso del Salón de Usos Múltiples (SUM) / ubicado en Bolivar 1425, para el desarrollo de un evento de carácter estrictamente privado en la fecha y horario acordados en la reserva.
        </li>
        <li>
            <strong>Uso, Restricciones y Responsabilidad:</strong> El inmueble se alquila exclusivamente bajo la modalidad de reunión privada a puertas cerradas. Queda **estrictamente prohibida la venta de entradas o taquilla, la comercialización o venta de bebidas alcohólicas dentro del predio**, el suministro de alcohol a menores de edad, el consumo de sustancias ilegales y la instalación de equipos de sonido profesionales de alta potencia (subwoofers de piso o estructuras comerciales). EL LOCATARIO asume la total responsabilidad civil y penal por cualquier daño material, accidente o hecho ocurrido durante el evento, así como por las acciones de los invitados y terceros que ingresen al establecimiento.
        </li>
        <li>
            <strong>Cumplimiento Legal y Ruidos Molestos:</strong> EL LOCATARIO asume toda responsabilidad por cumplir con las normativas vigentes en materia de seguridad, salubridad y la Ordenanza Municipal de San Rafael sobre ruidos molestos. El volumen de la música deberá mantenerse dentro de los decibeles permitidos para un entorno residencial, y queda estrictamente prohibido generar disturbios en la vía pública o alterar el orden del vecindario. En caso de multas, quejas formales o clausuras derivadas del incumplimiento de estas normas o del exceso de ruido, EL LOCADOR queda exento de toda responsabilidad, debiendo EL LOCATARIO responder económica y legalmente por las sanciones aplicadas.
        </li>
        <li>
            <strong>Daños y Limpieza:</strong> EL LOCATARIO deberá restituir el salón en las mismas condiciones en que lo recibió, siendo responsable por cualquier daño ocasionado a las instalaciones, mobiliario o equipamiento. Los gastos de reparación o reposición correrán por cuenta exclusiva del LOCATARIO.
        </li>
        <li>
            <strong>Pagos y Cancelaciones:</strong> EL LOCATARIO deberá abonar la seña establecida al momento de la reserva. En caso de cancelación por parte del cliente, no habrá devolución de la seña. En caso de cancelación por parte del LOCADOR por causas de fuerza mayor o problemas edilicios imprevistos, se reintegrará el monto abonado sin derecho a reclamos adicionales.
        </li>
        <li>
            <strong>Penalidades:</strong> En caso de constatarse el incumplimiento de alguna cláusula (como la comercialización de entradas/bebidas o disturbios graves), EL LOCADOR podrá suspender el evento de forma inmediata sin derecho a reclamo o reembolso por parte del LOCATARIO, además de iniciar las acciones legales correspondientes.
        </li>
        <li>
            <strong>Capacidad Máxima Infranqueable:</strong> Conforme a las normativas de seguridad y la habilitación del espacio como SUM, se establece un límite de capacidad máximo y estricto de **50 personas en total** dentro del establecimiento. Bajo ninguna circunstancia se permitirá el ingreso de un flujo superior de asistentes. El incumplimiento de esta norma facultará al LOCADOR a dar por finalizado el evento de forma inmediata por razones de seguridad.
        </li>
        <li>
            <strong>Exceso de Horario y Finalización:</strong> El evento contempla exclusivamente la franja horaria pactada en la reserva. Cualquier extensión del horario deberá solicitarse con anticipación, quedando sujeta a la disponibilidad del salón y al abono de la tarifa de "hora extra" vigente. De excederse el límite horario sin autorización previa, se aplicará de forma automática el cobro del tiempo excedido. Si el salón no tuviera disponibilidad para extender el turno, EL LOCATARIO se compromete a finalizar el evento y desocupar las instalaciones a la hora acordada, facultando a EL LOCADOR a dar por concluido el servicio para iniciar las tareas de acondicionamiento.
        </li>
        <li>
            <strong>Derechos de Autor (SADAIC/AADI CAPIF):</strong> Conforme al Decreto Nacional 765/2024, el presente evento se declara de carácter estrictamente privado, familiar y con acceso restringido, desarrollado en un espacio que no tiene fines de explotación comercial pública ni cobra tarifas de acceso, por lo que queda exento del pago de aranceles por derechos de autor. Si EL LOCATARIO alterase de cualquier forma la naturaleza privada del evento, será el único responsable de gestionar los permisos y abonar los cánones correspondientes a las entidades recaudadoras, eximiendo a EL LOCADOR de cualquier sanción o reclamo.
        </li>
        <li>
            <strong>Jurisdicción:</strong> Para cualquier conflicto legal derivado del presente, las partes se someten a la jurisdicción de los Tribunales Ordinarios de la Segunda Circunscripción Judicial de la Provincia de Mendoza, con asiento en la ciudad de San Rafael.
        </li>
        <li>
            <strong>Aceptación Digital:</strong> La aceptación del presente contrato mediante el sistema de reservas online equivale a la firma manuscrita y constituye plena conformidad legal por parte de EL LOCATARIO.
        </li>
        <li>
            <strong>Firma y Conformidad:</strong> Ambas partes declaran haber leído y comprendido el presente contrato, aceptando las cláusulas aquí establecidas.
        </li>
    </ol>

    <div class="footer">
        <p>Contrato emitido y aceptado digitalmente el {{ acceptance_date }} desde la IP {{ acceptance_ip }}.</p>
    </div>
</body>
</html>`
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleToggleContracts = () => {
    setPreferences(prev => ({
      ...prev,
      habilitar_contratos: !prev.habilitar_contratos
    }));
  };

  // Se amplió para aceptar también archivos .html
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setContractTemplate(event.target.result);
    };
    reader.readAsText(file);
  };

  const handleSavePreferences = () => {
    setIsSaving(true);
    setSaveMessage('');
    
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('Preferencias guardadas correctamente.');
      setTimeout(() => setSaveMessage(''), 3000); 
    }, 1000);
  };

  return (
    <div className="admin-section-fade preferences-container">
      
      <div className="preferences-header">
        <h2 className="section-title">Preferencias del Sistema</h2>
        <button 
          className="btn-create" 
          onClick={handleSavePreferences} 
          disabled={isSaving}
        >
          {isSaving ? 'Guardando...' : <><i className="fa-solid fa-floppy-disk"></i> Guardar Cambios</>}
        </button>
      </div>

      {saveMessage && <div className="success-banner">{saveMessage}</div>}

      <div className="preferences-card">
        <div className="pref-row">
          <div className="pref-info">
            <h3><i className="fa-solid fa-file-signature"></i> Módulo de Contratos</h3>
            <p>Genera automáticamente contratos en PDF para cada reserva confirmada.</p>
          </div>
          <div className="pref-action">
            <label className="switch">
              <input 
                type="checkbox" 
                checked={preferences.habilitar_contratos} 
                onChange={handleToggleContracts} 
              />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        {preferences.habilitar_contratos && (
          <div className="contract-editor-section">
            <div className="editor-header">
              <h4>Plantilla del Contrato (HTML)</h4>
              
              <label className="btn-secondary upload-btn">
                <i className="fa-solid fa-upload"></i> Subir archivo (.html / .txt)
                <input 
                  type="file" 
                  accept=".txt,.html,.htm" 
                  onChange={handleFileUpload} 
                  style={{ display: 'none' }} 
                />
              </label>
            </div>

            <div className="editor-layout">
              <textarea 
                className="contract-textarea" 
                value={contractTemplate}
                onChange={(e) => setContractTemplate(e.target.value)}
                placeholder="Pega aquí el código HTML de tu contrato..."
              ></textarea>

              <div className="editor-sidebar">
                <h5>Variables Disponibles</h5>
                <p className="helper-text">Copia estas variables en el HTML. El backend las reemplazará automáticamente al generar el PDF.</p>
                <ul className="variables-list">
                  <li onClick={() => navigator.clipboard.writeText('{{ user_name }}')} title="Copiar al portapapeles"><code>{`{{ user_name }}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{ user_dni }}')} title="Copiar al portapapeles"><code>{`{{ user_dni }}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{ event_date }}')} title="Copiar al portapapeles"><code>{`{{ event_date }}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{ hora_inicio }}')} title="Copiar al portapapeles"><code>{`{{ hora_inicio }}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{ hora_fin }}')} title="Copiar al portapapeles"><code>{`{{ hora_fin }}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{ acceptance_date }}')} title="Copiar al portapapeles"><code>{`{{ acceptance_date }}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{ acceptance_ip }}')} title="Copiar al portapapeles"><code>{`{{ acceptance_ip }}`}</code></li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default PreferencesManager;