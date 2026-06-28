import { useState } from 'react';
import './arrepentimiento.css'; // Crearemos este archivo ahora

function Arrepentimiento() {
  const [identificacion, setIdentificacion] = useState('');
  const [fechaEvento, setFechaEvento] = useState('');
  const [motivo, setMotivo] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMensaje(null);

    // Payload para enviar a tu API en Flask
    const payload = {
      identificacion, // Puede ser DNI o Correo
      fecha_evento: fechaEvento,
      motivo
    };

    try {
      // Reemplazar con tu endpoint real cuando lo armemos en Flask
      const response = await fetch('/api/v1/reservas/arrepentimiento', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'No se pudo procesar la solicitud.');
      }

      // Éxito: La reserva se canceló y se liberó el calendario
      setMensaje("Tu solicitud ha sido registrada y la reserva cancelada. Si corresponde la devolución de la seña según los plazos legales, nos contactaremos a la brevedad.");
      setIdentificacion('');
      setFechaEvento('');
      setMotivo('');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="arrepentimiento-container">
      <div className="arrepentimiento-card">
        <h2>Solicitud de Revocación</h2>
        <p className="arrepentimiento-subtitle">
          Según la Res. 424/2020, podés solicitar la cancelación de tu reserva. 
          Completá los datos a continuación para identificar tu evento.
        </p>

        {mensaje && <div className="success-alert">{mensaje}</div>}
        {error && <div className="error-alert">{error}</div>}

        <form onSubmit={handleSubmit} className="arrepentimiento-form">
          <div className="form-group">
            <label htmlFor="identificacion">DNI o Correo Electrónico</label>
            <input
              type="text"
              id="identificacion"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
              required
              placeholder="Ej: 35123456 o correo@ejemplo.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="fechaEvento">Fecha del Evento Reservado</label>
            <input
              type="date"
              id="fechaEvento"
              value={fechaEvento}
              onChange={(e) => setFechaEvento(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="motivo">Motivo (Opcional)</label>
            <textarea
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows="3"
              placeholder="Contanos brevemente por qué cancelás..."
            ></textarea>
            <small>La ley no exige un motivo, pero nos ayuda a mejorar.</small>
          </div>

          <button type="submit" className="submit-button" disabled={loading || mensaje}>
            {loading ? 'Procesando...' : 'Solicitar Cancelación'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Arrepentimiento;