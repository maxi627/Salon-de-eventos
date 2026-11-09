import { useEffect, useState } from 'react';
import { FaBars, FaXmark } from 'react-icons/fa6';
import { Link, useLocation } from 'react-router-dom';
import Button from '../ui/Button';
import './sitio-layout.css';

const SECCIONES = [
  { href: '/#que-incluye', texto: 'Qué incluye' },
  { href: '/#fotos', texto: 'Fotos' },
  { href: '/#como-reservar', texto: 'Cómo reservar' },
  { href: '/#ubicacion', texto: 'Ubicación' },
];

export default function SiteHeader({ user, onLogout }) {
  const [abierto, setAbierto] = useState(false);
  const location = useLocation();

  // Cerrar el menú al navegar
  useEffect(() => {
    setAbierto(false);
  }, [location.pathname, location.hash]);

  // Cerrar con Escape
  useEffect(() => {
    if (!abierto) return undefined;
    const alPresionar = (e) => {
      if (e.key === 'Escape') setAbierto(false);
    };
    window.addEventListener('keydown', alPresionar);
    return () => window.removeEventListener('keydown', alPresionar);
  }, [abierto]);

  const salir = (e) => {
    e.preventDefault();
    setAbierto(false);
    onLogout();
  };

  const enlacesCuenta = user ? (
    <>
      <Link to="/mis-reservas">Mis reservas</Link>
      {user.role === 'administrador' && <Link to="/admin-panel">Panel</Link>}
      <a href="/" onClick={salir}>Salir</a>
    </>
  ) : (
    <Link to="/login">Ingresar</Link>
  );

  return (
    <header className="sv-encabezado">
      <div className="sv-encabezado__barra">
        <Link to="/" className="sv-logo" aria-label="Salón de Eventos, inicio">
          Salón <span>de</span> Eventos
        </Link>

        <nav className="sv-encabezado__enlaces" aria-label="Principal">
          {SECCIONES.map((s) => <a key={s.href} href={s.href}>{s.texto}</a>)}
          {enlacesCuenta}
          <Button to="/reservar" className="sv-encabezado__reservar">Reservar</Button>
        </nav>

        <button
          type="button"
          className="sv-encabezado__menu"
          aria-expanded={abierto}
          aria-controls="sv-menu-movil"
          aria-label={abierto ? 'Cerrar menú' : 'Abrir menú'}
          onClick={() => setAbierto((v) => !v)}
        >
          {abierto ? <FaXmark aria-hidden="true" /> : <FaBars aria-hidden="true" />}
        </button>
      </div>

      <nav id="sv-menu-movil" className="sv-menu-movil" hidden={!abierto} aria-label="Menú">
        {SECCIONES.map((s) => <a key={s.href} href={s.href} onClick={() => setAbierto(false)}>{s.texto}</a>)}
        {enlacesCuenta}
        <Button to="/reservar">Reservar</Button>
      </nav>
    </header>
  );
}
