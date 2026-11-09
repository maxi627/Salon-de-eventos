import { useRef, useState } from 'react';
import { FaEye, FaEyeSlash } from 'react-icons/fa6';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import TarjetaFormulario from '../components/sitio/TarjetaFormulario';
import Turnstile from '../components/Turnstile';
import Button from '../components/ui/Button';
import { volverSeguro } from '../lib/volver';

function Campo({ id, etiqueta, ...props }) {
  return (
    <div className="sv-campo">
      <label className="sv-campo__label" htmlFor={id}>{etiqueta}</label>
      <input className="sv-campo__input" id={id} {...props} />
    </div>
  );
}

function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const volver = volverSeguro(searchParams.get('volver'));

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [mostrarClave, setMostrarClave] = useState(false);
  const [telefono, setTelefono] = useState('');

  // Consentimiento de datos (obligatorio)
  const [consentimientoDatos, setConsentimientoDatos] = useState(false);

  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState('');
  const turnstileRef = useRef(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    // Validación estricta en el frontend
    if (!consentimientoDatos) {
      setError('Tenés que aceptar la Política de Privacidad para registrarte.');
      return;
    }

    const url = '/api/v1/usuario';

    // Agregamos el campo al payload que enviamos al backend
    const userData = {
      nombre,
      apellido,
      dni: parseInt(dni, 10),
      correo,
      telefono,
      password,
      consentimiento_datos: consentimientoDatos
    };

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Turnstile-Token': turnstileToken },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.data?.correo?.[0] || result.message || 'Error al registrar el usuario';
        throw new Error(errorMessage);
      }
      
      setSuccess(true);

      setTimeout(() => {
        navigate(volver ? `/login?volver=${encodeURIComponent(volver)}` : '/login');
      }, 2000);

    } catch (err) {
      setError(err.message);
    } finally {
      // Cada token de Turnstile sirve una sola vez
      turnstileRef.current?.reset();
    }
  };

  const login = volver ? `/login?volver=${encodeURIComponent(volver)}` : '/login';

  return (
    <TarjetaFormulario titulo="Creá tu cuenta" bajada="La necesitás para reservar. Las reservas son para mayores de 18 años.">
      <form className="sv-formulario" onSubmit={handleSubmit}>
        {success && (
          <p className="sv-exito" role="status">¡Listo, ya tenés cuenta! Te llevamos a ingresar…</p>
        )}

        <Campo id="nombre" etiqueta="Nombre" type="text" autoComplete="given-name" value={nombre} onChange={(e) => setNombre(e.target.value)} required />
        <Campo id="apellido" etiqueta="Apellido" type="text" autoComplete="family-name" value={apellido} onChange={(e) => setApellido(e.target.value)} required />
        <Campo
          id="dni"
          etiqueta="DNI"
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={dni}
          onChange={(e) => setDni(e.target.value.replace(/\D/g, ''))}
          required
        />
        <Campo id="correo" etiqueta="Correo electrónico" type="email" autoComplete="email" value={correo} onChange={(e) => setCorreo(e.target.value)} required />
        <Campo id="telefono" etiqueta="Teléfono (opcional)" type="tel" autoComplete="tel" value={telefono} onChange={(e) => setTelefono(e.target.value)} />

        <div className="sv-campo">
          <label className="sv-campo__label" htmlFor="password">Contraseña</label>
          <div className="sv-campo__clave">
            <input
              className="sv-campo__input"
              type={mostrarClave ? 'text' : 'password'}
              id="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength="8"
              required
            />
            <button
              type="button"
              className="sv-campo__mostrar"
              aria-pressed={mostrarClave}
              aria-label={mostrarClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              onClick={() => setMostrarClave((v) => !v)}
            >
              {mostrarClave ? <FaEyeSlash aria-hidden="true" /> : <FaEye aria-hidden="true" />}
            </button>
          </div>
          <span className="sv-campo__ayuda">Mínimo 8 caracteres.</span>
        </div>

        <label className="sv-check">
          <input
            type="checkbox"
            checked={consentimientoDatos}
            onChange={(e) => setConsentimientoDatos(e.target.checked)}
          />
          <span>
            Acepto la <a href="/privacidad" target="_blank" rel="noopener noreferrer">Política de Privacidad</a>.
          </span>
        </label>

        <Turnstile ref={turnstileRef} onToken={setTurnstileToken} />
        {error && <p className="sv-error" role="alert">{error}</p>}

        <Button type="submit" disabled={success || !turnstileToken}>
          {success ? 'Cuenta creada' : 'Crear cuenta'}
        </Button>

        <div className="sv-formulario__enlaces">
          <span>¿Ya tenés cuenta? <Link to={login}>Ingresá</Link></span>
        </div>
      </form>
    </TarjetaFormulario>
  );
}

export default Register;
