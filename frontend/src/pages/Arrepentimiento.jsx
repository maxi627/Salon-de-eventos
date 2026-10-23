import { useState } from 'react';
import './arrepentimiento.css'; // Crearemos este archivo ahora

function Arrepentimiento() {
  const [identificacion, setIdentificacion] = useState('');
  const [fechaEvento, setFechaEvento] = useState('');
  const [motivo, setMotivo] = useState('');
  const [codigo, setCodigo] = useState('');

  // 'datos' -> se piden DNI/correo y fecha | 'codigo' -> se confirma con el código enviado por correo | 'listo'
  const [paso, setPaso] = useState('datos');

  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState(null);
  const [error, setError] = useState(null);

  const postJson = async (url, payload) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'No se pudo procesar la solicitud.');
    }
    return data;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMensaje(null);

    try {
      // Paso 1: el backend envía un código al correo registrado (respuesta siempre genérica)
      const data = await postJson('/api/v1/reservas/arrepentimiento', {
        identificacion, // Puede ser DNI o Correo
        fecha_evento: fechaEvento,
        motivo
      });

      setMensaje(data.message);
      setPaso('codigo');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMensaje(null);

    try {
      // Paso 2: se valida el código y recién ahí se cancela la reserva
      await postJson('/api/v1/reservas/arrepentimiento/confirmar', {
        identificacion,
        fecha_evento: fechaEvento,
        codigo
      });

      // Éxito: La reserva se canceló y se liberó el calendario
      setMensaje("Tu solicitud ha sido registrada y la reserva cancelada. Si corresponde la devolución de la seña según los plazos legales, nos contactaremos a la brevedad.");
      setPaso('listo');
      setIdentificacion('');
      setFechaEvento('');
      setMotivo('');
      setCodigo('');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVolver = () => {
    setPaso('datos');
    setCodigo('');
    setMensaje(null);
    setError(null);
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

        {paso === 'datos' && (
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
                maxLength={500}
                placeholder="Contanos brevemente por qué cancelás..."
              ></textarea>
              <small>La ley no exige un motivo, pero nos ayuda a mejorar.</small>
            </div>

            <button type="submit" className="submit-button" disabled={loading}>
              {loading ? 'Procesando...' : 'Solicitar Cancelación'}
            </button>
          </form>
        )}

        {paso === 'codigo' && (
          <form onSubmit={handleConfirmar} className="arrepentimiento-form">
            <div className="form-group">
              <label htmlFor="codigo">Código recibido por correo</label>
              <input
                type="text"
                id="codigo"
                value={codigo}
                onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ''))}
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
              />
              <small>El código vence en 15 minutos.</small>
            </div>

            <button type="submit" className="submit-button" disabled={loading || codigo.length !== 6}>
              {loading ? 'Procesando...' : 'Confirmar Cancelación'}
            </button>
            <button type="button" className="submit-button" onClick={handleVolver} disabled={loading}>
              Volver / Reenviar código
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Arrepentimiento;
