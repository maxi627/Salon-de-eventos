import { Outlet } from 'react-router-dom';
import './App.css'; // Puedes usar este archivo para los estilos del layout

function App() {
  return (
    <div>
      <header>
        <nav>
          <a href="">Inicio</a>
          <a href="">Iniciar Sesión</a>
          <a href="">Registrarse</a>

        </nav>
      </header>



      {/* El componente Outlet renderizará aquí la página actual (Home, Servicios, etc.) */}
      <main>
        <Outlet />
      </main>


      <footer>
        <p>© 2025 Salón de Eventos. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}

export default App;