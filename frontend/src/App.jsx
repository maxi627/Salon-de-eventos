import { useState } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import './App.css';
import ChatbotWidget from './components/ChatbotWidget';
import SiteFooter from './components/sitio/SiteFooter';
import SiteHeader from './components/sitio/SiteHeader';
import { sesionValida } from './lib/sesion';

function leerSesion() {
  const token = localStorage.getItem('authToken');
  const sesion = sesionValida(token);
  if (token && !sesion) localStorage.removeItem('authToken');
  return sesion;
}

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(leerSesion);

  // Detectamos si estamos en la ruta de administración
  const isAdminPage = location.pathname.startsWith('/admin-panel');

  const handleLogin = (token) => {
    localStorage.setItem('authToken', token);
    const sesion = sesionValida(token);
    if (!sesion) localStorage.removeItem('authToken');
    setUser(sesion);
  };

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    setUser(null);
    navigate('/');
  };

  if (isAdminPage) {
    return (
      <div className="app-main-wrapper">
        <main className="no-padding">
          <Outlet context={{ handleLogin }} />
        </main>
      </div>
    );
  }

  return (
    <div className="app-main-wrapper">
      <SiteHeader user={user} onLogout={handleLogout} />
      <main className="sitio">
        <Outlet context={{ handleLogin, user }} />
      </main>
      <ChatbotWidget />
      <SiteFooter />
    </div>
  );
}

export default App;
