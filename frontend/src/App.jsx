import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';
import './App.css';

function App() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Esto se mantiene igual, es para cuando recargas la página
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setUser(decodedToken);
      } catch (error) {
        localStorage.removeItem('authToken');
      }
    }
  }, []);

  // 1. CREAMOS LA FUNCIÓN QUE MANEJA EL LOGIN
  const handleLogin = (token) => {
    localStorage.setItem('authToken', token);
    try {
      const decodedToken = jwtDecode(token);
      setUser(decodedToken);
    } catch (error) {
      setUser(null);
      localStorage.removeItem('authToken');
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    navigate('/');
  };

  return (
    <div>
      <header>
        <nav>
          <Link to="/">Inicio</Link>
          {user ? (
            <>
              {user.role === 'administrador' && (
                <Link to="/admin-panel">Panel Admin</Link>
              )}
              <a href="#" onClick={handleLogout}>Cerrar Sesión</a>
            </>
          ) : (
            <>
              <Link to="/login">Iniciar Sesión</Link>
              <Link to="/register">Registrarse</Link>
            </>
          )}
        </nav>
      </header>

      <main>
        {/* 2. PASAMOS LAS FUNCIONES A LOS HIJOS MEDIANTE EL CONTEXTO DEL OUTLET */}
        <Outlet context={{ handleLogin }} />
      </main>

      <footer>
        <p>© 2025 Salón de Eventos. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default App;