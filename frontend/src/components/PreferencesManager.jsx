import DOMPurify from 'dompurify';
import { useState } from 'react';
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import './PreferencesManager.css';

const PreferencesManager = () => {
  const [preferences, setPreferences] = useState({
    habilitar_contratos: true,
    enviar_correos: true,
  });

  // Ahora la plantilla es texto visual limpio, sin etiquetas head/body/style
  const [contractTemplate, setContractTemplate] = useState(`
    <h2>Contrato de Locación - Salón de Usos Múltiples (SUM)</h2>
    <p><br></p>
    <p><strong>Fecha del Evento:</strong> {{ event_date }}</p>
    <p><strong>Horario Pactado:</strong> {{ horario_pactado }}</p>
    <p><strong>Cliente (LOCATARIO):</strong> {{ user_name }} (DNI: {{ user_dni }})</p>
    <p><strong>Capacidad Máxima Autorizada:</strong> 50 Personas (Límite Estricto)</p>
    <p><br></p>
    <h3>Términos y Condiciones</h3>
    <p>El presente contrato de locación temporal se celebra entre EL LOCADOR y EL LOCATARIO...</p>
    <ol>
      <li><strong>Objeto:</strong> EL LOCADOR cede temporalmente a EL LOCATARIO el uso del Salón...</li>
      <li><strong>Uso y Restricciones:</strong> Queda estrictamente prohibida la venta de entradas...</li>
    </ol>
    <p><br></p>
    <p><em>Contrato emitido y aceptado digitalmente el {{ acceptance_date }} desde la IP {{ acceptance_ip }}.</em></p>
  `);

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  const handleToggleContracts = () => {
    setPreferences(prev => ({
      ...prev,
      habilitar_contratos: !prev.habilitar_contratos
    }));
  };

    const handleSavePreferences = () => {
    setIsSaving(true);
    setSaveMessage('');
    
    // 1. Limpiamos el HTML crudo que generó React Quill
    const cleanHTML = DOMPurify.sanitize(contractTemplate);

    // 2. Preparamos el objeto final que enviaremos a la base de datos
    const payloadParaBackend = {
      habilitar_contratos: preferences.habilitar_contratos,
      enviar_correos: preferences.enviar_correos,
      contrato_html: cleanHTML // Enviamos la versión 100% segura
    };

    // (Aquí puedes hacer un console.log para ver cómo DOMPurify eliminó cualquier script malicioso)
    console.log("Datos seguros listos para enviar:", payloadParaBackend);

    // 3. Aquí iría tu fetch('/api/v1/configuracion', { method: 'PUT', body: JSON.stringify(payloadParaBackend) ... })
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('Preferencias guardadas de forma segura.');
      setTimeout(() => setSaveMessage(''), 3000); 
    }, 1000);
};
  // Configuración de los botones que queremos mostrar en el editor
  const modules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['clean'] // Botón para quitar formatos
    ],
  };

  return (
    <div className="admin-section-fade preferences-container">
      
      <div className="preferences-header">
        <h2 className="section-title">Preferencias del Sistema</h2>
        <button className="btn-create" onClick={handleSavePreferences} disabled={isSaving}>
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
              <input type="checkbox" checked={preferences.habilitar_contratos} onChange={handleToggleContracts} />
              <span className="slider round"></span>
            </label>
          </div>
        </div>

        {preferences.habilitar_contratos && (
          <div className="contract-editor-section">
            <div className="editor-header">
              <h4>Plantilla del Contrato</h4>
            </div>

            <div className="editor-layout">
              {/* --- EDITOR VISUAL TIPO WORD --- */}
              <div className="quill-container">
                <ReactQuill 
                  theme="snow" 
                  value={contractTemplate} 
                  onChange={setContractTemplate} 
                  modules={modules}
                  placeholder="Redacta el contrato aquí..."
                />
              </div>

              <div className="editor-sidebar">
                <h5>Variables Disponibles</h5>
                <p className="helper-text">Haz clic para copiar y pega estas variables en el texto. El sistema las reemplazará al generar el PDF.</p>
                <ul className="variables-list">
                  <li onClick={() => navigator.clipboard.writeText('{{ user_name }}')} title="Copiar al portapapeles"><code>{`{{ user_name }}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{ user_dni }}')} title="Copiar al portapapeles"><code>{`{{ user_dni }}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{ event_date }}')} title="Copiar al portapapeles"><code>{`{{ event_date }}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{ horario_pactado }}')} title="Copiar al portapapeles"><code>{`{{ horario_pactado }}`}</code></li>
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