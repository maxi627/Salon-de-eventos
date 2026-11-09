import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import TarjetaFormulario from '../components/sitio/TarjetaFormulario';
import Button from '../components/ui/Button';

function ResetPassword() {
  const { token } = useParams(); // Token del enlace del correo
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (password.length < 8) {
      setError('La contraseña debe tener al menos 8 caracteres.');
      return;
    }
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setError('');
    setMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('/api/v1/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, new_password: password }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setMessage(result.message + ' En 3 segundos te llevamos a ingresar…');
      setTimeout(() => {
        navigate('/login');
      }, 3000);

    } catch (err) {
      setError(err.message || 'Ocurrió un error. El enlace puede haber expirado.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TarjetaFormulario titulo="Elegí tu contraseña nueva">
      <form className="sv-formulario" onSubmit={handleSubmit}>
        <div className="sv-campo">
          <label className="sv-campo__label" htmlFor="password">Contraseña nueva</label>
          <input
            className="sv-campo__input"
            type="password"
            id="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength="8"
          />
          <span className="sv-campo__ayuda">Mínimo 8 caracteres.</span>
        </div>
        <div className="sv-campo">
          <label className="sv-campo__label" htmlFor="confirmPassword">Repetí la contraseña</label>
          <input
            className="sv-campo__input"
            type="password"
            id="confirmPassword"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        {message && <p className="sv-exito" role="status">{message}</p>}
        {error && <p className="sv-error" role="alert">{error}</p>}
        <Button type="submit" disabled={isLoading || !!message}>
          {isLoading ? 'Guardando…' : 'Guardar contraseña'}
        </Button>
      </form>
    </TarjetaFormulario>
  );
}

export default ResetPassword;
