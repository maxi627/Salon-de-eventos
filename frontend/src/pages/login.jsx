import { useRef, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router-dom';
import TarjetaFormulario from '../components/sitio/TarjetaFormulario';
import Turnstile from '../components/Turnstile';
import Button from '../components/ui/Button';
import { volverSeguro } from '../lib/volver';

function Login() {
  const navigate = useNavigate();
  const { handleLogin } = useOutletContext();
  const [searchParams] = useSearchParams();
  const volver = volverSeguro(searchParams.get('volver'));

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Turnstile-Token': turnstileToken },
        body: JSON.stringify({ correo, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Credenciales inválidas.');
      }

      if (result.data.token) {
        handleLogin(result.data.token);
        navigate(volver ?? '/');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      // Cada token de Turnstile sirve una sola vez
      turnstileRef.current?.reset();
    }
  };

  const registro = volver ? `/register?volver=${encodeURIComponent(volver)}` : '/register';

  return (
    <TarjetaFormulario
      titulo="Ingresá"
      bajada={volver ? 'Ingresá para seguir con tu reserva.' : 'Con tu cuenta podés reservar y ver el estado de tus fechas.'}
    >
      <form className="sv-formulario" onSubmit={handleSubmit}>
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
          />
        </div>
        <div className="sv-campo">
          <label className="sv-campo__label" htmlFor="password">Contraseña</label>
          <input
            className="sv-campo__input"
            type="password"
            id="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        <Turnstile ref={turnstileRef} onToken={setTurnstileToken} />
        {error && <p className="sv-error" role="alert">{error}</p>}
        <Button type="submit" disabled={!turnstileToken}>Ingresar</Button>

        <div className="sv-formulario__enlaces">
          <Link to="/forgot-password">¿Olvidaste tu contraseña?</Link>
          <span>¿No tenés cuenta? <Link to={registro}>Creala</Link></span>
        </div>
      </form>
    </TarjetaFormulario>
  );
}

export default Login;
