import { useState } from 'react';
import { useNavigate, useOutletContext } from 'react-router-dom'; // 1. Importar useOutletContext
import './login.css';

function Login() {
  const navigate = useNavigate();
  const { handleLogin } = useOutletContext(); // 2. Obtenemos la función del contexto del Outlet

  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);

    try {
      const response = await fetch('/api/v1/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ correo, password }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || 'Credenciales inválidas.');
      }

      if (result.data.token) {
        // 3. EN LUGAR DE MANEJAR EL LOCALSTORAGE AQUÍ, LLAMAMOS A LA FUNCIÓN DEL PADRE
        handleLogin(result.data.token);
        
        // La navegación se mantiene igual
        navigate('/'); 
      }

    } catch (err) {
      setError(err.message);
    }
  };

  // ... el resto del JSX no cambia ...
  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2>Iniciar Sesión</h2>
        <div className="form-group">
          <label htmlFor="correo">Correo Electrónico</label>
          <input
            type="email"
            id="correo"
            value={correo}
            onChange={(e) => setCorreo(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="password">Contraseña</label>
          <input
            type="password"
            id="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="error-message">{error}</p>}
        <button type="submit" className="login-button">Ingresar</button>
      </form>
    </div>
  );
}

export default Login;