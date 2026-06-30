import { useState } from 'react';
import './PreferencesManager.css';

const PreferencesManager = () => {
  // Estado para las preferencias generales
  const [preferences, setPreferences] = useState({
    habilitar_contratos: false,
    enviar_correos: true, // Lo dejamos preparado para el futuro
  });

  // Estado para el texto del contrato
  const [contractTemplate, setContractTemplate] = useState(
    "CONTRATO DE LOCACIÓN DE SERVICIOS Y SALÓN DE EVENTOS\n\n" +
    "Entre el SALÓN DE EVENTOS, en adelante 'EL LOCADOR', y el señor/a {{cliente_nombre}} con DNI {{cliente_dni}}, en adelante 'EL LOCATARIO'...\n\n" +
    "El evento se realizará el día {{fecha_evento}}.\n" +
    "El valor total acordado es de ${{valor_total}}, dejando una seña de ${{valor_sena}}."
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Manejador del Toggle Switch
  const handleToggleContracts = () => {
    setPreferences(prev => ({
      ...prev,
      habilitar_contratos: !prev.habilitar_contratos
    }));
  };

  // Lógica para subir un archivo .txt y ponerlo en el editor
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      setContractTemplate(event.target.result);
    };
    reader.readAsText(file);
  };

  // Simulación de guardado
  const handleSavePreferences = () => {
    setIsSaving(true);
    setSaveMessage('');
    
    // Aquí iría el fetch() tipo PUT a tu backend /api/v1/configuracion
    setTimeout(() => {
      setIsSaving(false);
      setSaveMessage('Preferencias guardadas correctamente.');
      setTimeout(() => setSaveMessage(''), 3000); // Limpia el mensaje a los 3 seg
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

      {/* --- TARJETA DE PREFERENCIAS GENERALES --- */}
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

        {/* --- ÁREA DE EDICIÓN DEL CONTRATO (Solo visible si está habilitado) --- */}
        {preferences.habilitar_contratos && (
          <div className="contract-editor-section">
            <div className="editor-header">
              <h4>Plantilla del Contrato</h4>
              
              {/* Botón oculto de input file, estilizado con un label */}
              <label className="btn-secondary upload-btn">
                <i className="fa-solid fa-upload"></i> Subir archivo (.txt)
                <input 
                  type="file" 
                  accept=".txt" 
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
                placeholder="Escribe o pega aquí el modelo de contrato..."
              ></textarea>

              <div className="editor-sidebar">
                <h5>Variables Mágicas</h5>
                <p className="helper-text">Copia y pega estas variables en tu texto. El sistema las reemplazará automáticamente con los datos reales del cliente y la reserva.</p>
                <ul className="variables-list">
                  <li onClick={() => navigator.clipboard.writeText('{{cliente_nombre}}')} title="Copiar al portapapeles"><code>{`{{cliente_nombre}}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{cliente_dni}}')} title="Copiar al portapapeles"><code>{`{{cliente_dni}}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{fecha_evento}}')} title="Copiar al portapapeles"><code>{`{{fecha_evento}}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{valor_total}}')} title="Copiar al portapapeles"><code>{`{{valor_total}}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{valor_sena}}')} title="Copiar al portapapeles"><code>{`{{valor_sena}}`}</code></li>
                  <li onClick={() => navigator.clipboard.writeText('{{saldo_restante}}')} title="Copiar al portapapeles"><code>{`{{saldo_restante}}`}</code></li>
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