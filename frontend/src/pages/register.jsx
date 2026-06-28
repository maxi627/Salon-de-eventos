import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './register.css';

function Register() {
  const navigate = useNavigate();

  const [nombre, setNombre] = useState('');
  const [apellido, setApellido] = useState('');
  const [dni, setDni] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [telefono, setTelefono] = useState('');
  
  // Nuevo estado para el consentimiento de datos
  const [consentimientoDatos, setConsentimientoDatos] = useState(false);
  
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    setSuccess(false);

    // Validación estricta en el frontend
    if (!consentimientoDatos) {
      setError("Debes aceptar la Política de Privacidad y Tratamiento de Datos para registrarte.");
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
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      const result = await response.json();

      if (!response.ok) {
        const errorMessage = result.data?.correo?.[0] || result.message || 'Error al registrar el usuario';
        throw new Error(errorMessage);
      }
      
      console.log('Usuario registrado:', result.data);
      setSuccess(true);

      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="register-container">
      <form className="register-form" onSubmit={handleSubmit}>
        <h2>Crear una Cuenta</h2>

        {success && (
          <p className="success-message">
            ¡Registro exitoso! Redirigiendo al inicio de sesión...
          </p>
        )}
        
        <div className="form-group">
          <label htmlFor="nombre">Nombre</label>
          <input
            type="text" id="nombre" value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            placeholder='Ingresa tu nombre'
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="apellido">Apellido</label>
          <input
            type="text" id="apellido" value={apellido}
            onChange={(e) => setApellido(e.target.value)}
            required
            placeholder='Ingresa tu apellido'
          />
        </div>

        <div className="form-group">
          <label htmlFor="dni">DNI</label>
          <input
            type="number" id="dni" value={dni}
            onChange={(e) => setDni(e.target.value)}
            required
            placeholder='Ingresa tu DNI'
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="correo">Correo Electrónico</label>
          <input
            type="email" id="correo" value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
            placeholder="Ingresa tu email"
          />
        </div>

        <div className="form-group">
          <label htmlFor="telefono">Teléfono (Opcional)</label>
          <input
            type="tel" id="telefono" value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
            placeholder="Ingresa tu número de teléfono"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password" id="password" value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength="8"
            required
            placeholder='Ingresa tu contraseña'
          />
        </div>

        {/* --- CASILLA DE CONSENTIMIENTO --- */}
        <div className="consent-group">
          <label className="consent-label">
            <input 
              type="checkbox" 
              checked={consentimientoDatos}
              onChange={(e) => setConsentimientoDatos(e.target.checked)}
              className="consent-input"
            />
            <span>
              Acepto la <a href="/privacidad" target="_blank" rel="noopener noreferrer" className="consent-link">Política de Privacidad</a>.
            </span>
          </label>
        </div>
        
        {error && <p className="error-message">{error}</p>}

        <button type="submit" className="register-button" disabled={success}>
          {success ? 'Registrado' : 'Registrarse'}
        </button>
      </form>
    </div>
  );
}

export default Register;