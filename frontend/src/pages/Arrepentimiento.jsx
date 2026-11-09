import { useRef, useState } from 'react';
import TarjetaFormulario from '../components/sitio/TarjetaFormulario';
import Turnstile from '../components/Turnstile';
import Button from '../components/ui/Button';

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
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const postJson = async (url, payload, extraHeaders = {}) => {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...extraHeaders },
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
      }, { 'X-Turnstile-Token': turnstileToken });

      setMensaje(data.message);
      setPaso('codigo');

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      // Cada token de Turnstile sirve una sola vez
      turnstileRef.current?.reset();
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
      setMensaje("Registramos tu solicitud y la reserva quedó cancelada. Si corresponde la devolución de la seña según los plazos legales, te vamos a contactar a la brevedad.");
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
    <TarjetaFormulario
      titulo="Botón de arrepentimiento"
      bajada="Según la Res. 424/2020, podés pedir la cancelación de tu reserva dentro de los 10 días corridos desde que la hiciste, si faltan al menos 7 días para el evento. Completá los datos para identificar tu evento."
    >
      {mensaje && <p className="sv-exito" role="status">{mensaje}</p>}
      {error && <p className="sv-error" role="alert">{error}</p>}

      {paso === 'datos' && (
        <form onSubmit={handleSubmit} className="sv-formulario">
          <div className="sv-campo">
            <label className="sv-campo__label" htmlFor="identificacion">DNI o correo electrónico</label>
            <input
              className="sv-campo__input"
              type="text"
              id="identificacion"
              value={identificacion}
              onChange={(e) => setIdentificacion(e.target.value)}
              required
              placeholder="Ej.: 35123456 o tu@correo.com"
            />
          </div>

          <div className="sv-campo">
            <label className="sv-campo__label" htmlFor="fechaEvento">Fecha del evento reservado</label>
            <input
              className="sv-campo__input"
              type="date"
              id="fechaEvento"
              value={fechaEvento}
              onChange={(e) => setFechaEvento(e.target.value)}
              required
            />
          </div>

          <div className="sv-campo">
            <label className="sv-campo__label" htmlFor="motivo">Motivo (opcional)</label>
            <textarea
              className="sv-campo__input"
              id="motivo"
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              rows="3"
              maxLength={500}
              placeholder="Contanos brevemente por qué cancelás…"
            />
            <span className="sv-campo__ayuda">La ley no exige un motivo, pero nos ayuda a mejorar.</span>
          </div>

          <Turnstile ref={turnstileRef} onToken={setTurnstileToken} />

          <Button type="submit" disabled={loading || !turnstileToken}>
            {loading ? 'Procesando…' : 'Pedir la cancelación'}
          </Button>
        </form>
      )}

      {paso === 'codigo' && (
        <form onSubmit={handleConfirmar} className="sv-formulario">
          <div className="sv-campo">
            <label className="sv-campo__label" htmlFor="codigo">Código que te llegó por correo</label>
            <input
              className="sv-campo__input"
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
            <span className="sv-campo__ayuda">El código vence en 15 minutos.</span>
          </div>

          <Button type="submit" disabled={loading || codigo.length !== 6}>
            {loading ? 'Procesando…' : 'Confirmar la cancelación'}
          </Button>
          <Button variant="secundario" onClick={handleVolver} disabled={loading}>
            Volver / reenviar el código
          </Button>
        </form>
      )}
    </TarjetaFormulario>
  );
}

export default Arrepentimiento;
