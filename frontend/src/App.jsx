import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Outlet, ScrollRestoration, useLocation, useNavigate } from 'react-router-dom';
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
  const queryClient = useQueryClient();
  const [user, setUser] = useState(leerSesion);

  // Las reservas son de cada usuario: al entrar o salir se descarta lo que haya en caché.
  const olvidarDatosDeUsuario = () => queryClient.removeQueries({ queryKey: ['mis-reservas'] });

  // Detectamos si estamos en la ruta de administración
  const isAdminPage = location.pathname.startsWith('/admin-panel');

  const handleLogin = (token) => {
    olvidarDatosDeUsuario();
    localStorage.setItem('authToken', token);
    const sesion = sesionValida(token);
    if (!sesion) localStorage.removeItem('authToken');
    setUser(sesion);
  };

  const handleLogout = () => {
    olvidarDatosDeUsuario();
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
      {/* Al cambiar de página arranca arriba; con #ancla, baja a esa sección */}
      <ScrollRestoration />
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
