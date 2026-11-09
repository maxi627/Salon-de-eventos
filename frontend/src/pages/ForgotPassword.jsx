import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import TarjetaFormulario from '../components/sitio/TarjetaFormulario';
import Turnstile from '../components/Turnstile';
import Button from '../components/ui/Button';

function ForgotPassword() {
  const [correo, setCorreo] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Turnstile-Token': turnstileToken },
        body: JSON.stringify({ correo }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || 'Ocurrió un error al procesar la solicitud.');
      }

      setMessage(result.message);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
      // Cada token de Turnstile sirve una sola vez
      turnstileRef.current?.reset();
    }
  };

  return (
    <TarjetaFormulario
      titulo="Recuperá tu contraseña"
      bajada="Escribí tu correo y te mandamos un enlace para crear una contraseña nueva."
    >
      <form className="sv-formulario" onSubmit={handleSubmit}>
        {!message && (
          <div className="sv-campo">
            <label className="sv-campo__label" htmlFor="correo">Correo electrónico</label>
            <input
              className="sv-campo__input"
              type="email"
              id="correo"
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
              placeholder="tu@correo.com"
            />
          </div>
        )}

        {!message && <Turnstile ref={turnstileRef} onToken={setTurnstileToken} />}
        {message && <p className="sv-exito" role="status">{message}</p>}
        {error && <p className="sv-error" role="alert">{error}</p>}

        {!message && (
          <Button type="submit" disabled={isLoading || !turnstileToken}>
            {isLoading ? 'Enviando…' : 'Enviar el enlace'}
          </Button>
        )}

        <div className="sv-formulario__enlaces">
          <Link to="/login">Volver a ingresar</Link>
        </div>
      </form>
    </TarjetaFormulario>
  );
}

export default ForgotPassword;
