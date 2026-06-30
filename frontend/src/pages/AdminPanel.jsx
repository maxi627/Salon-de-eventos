import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

// Importamos todos los subcomponentes refactorizados
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import GastosManager from '../components/GastosManager';
import PreferencesManager from '../components/PreferencesManager';
import PriceEditor from '../components/PriceEditor';
import ReintegrosAdmin from '../components/ReintegrosAdmin';
import ReservasManager from '../components/ReservasManager'; // Nuevo archivo
import UserList from '../components/UserList';
import './AdminPanel.css';

function AdminPanel() {
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'accounting';
  });
  
  // Estado para controlar si el menú móvil está abierto
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('adminActiveTab'); 
    navigate('/login');
  };

  // Función para cambiar de pestaña y cerrar el menú móvil al mismo tiempo
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setIsMobileMenuOpen(false);
  };

  const getHeaderTitle = () => {
    switch (activeTab) {
      case 'accounting': return 'Resumen de Contabilidad';
      case 'prices': return 'Configuración de Precios';
      case 'expenses': return 'Control de Gastos';
      case 'reservations': return 'Calendario de Reservas';
      case 'reintegros': return 'Gestión de Reintegros';
      case 'users': return 'Gestión de Usuarios';
      default: return 'Panel de Administración';
    }
  };

  return (
    <div className="admin-wrapper">
      
      {/* Barra superior exclusiva para móviles */}
      <div className="mobile-admin-header">
        <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(true)}>
          <i className="fa-solid fa-bars"></i>
        </button>
        <span className="mobile-logo-text">SALÓN ADMIN</span>
      </div>

      {/* Capa oscura de fondo al abrir el menú en móviles */}
      {isMobileMenuOpen && (
        <div className="sidebar-overlay" onClick={() => setIsMobileMenuOpen(false)}></div>
      )}

      {/* Menú lateral (Sidebar) */}
      <aside className={`admin-sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-logo">
          <h3>SALÓN ADMIN</h3>
          <button className="mobile-close-btn" onClick={() => setIsMobileMenuOpen(false)}>
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>
        
        <nav className="sidebar-nav">
          <button className="nav-btn" onClick={() => { navigate('/'); setIsMobileMenuOpen(false); }}>
            <i className="fa-solid fa-house"></i> Inicio
          </button>
          
          <div className="nav-divider">Gestión</div>
          
          <button className={`nav-btn ${activeTab === 'accounting' ? 'active' : ''}`} onClick={() => handleTabChange('accounting')}>
            <i className="fa-solid fa-chart-line"></i> Contabilidad
          </button>
          
          <button className={`nav-btn ${activeTab === 'prices' ? 'active' : ''}`} onClick={() => handleTabChange('prices')}>
            <i className="fa-solid fa-tag"></i> Precios
          </button>
          
          <button className={`nav-btn ${activeTab === 'expenses' ? 'active' : ''}`} onClick={() => handleTabChange('expenses')}>
            <i className="fa-solid fa-arrow-trend-down"></i> Gastos
          </button>
          
          <button className={`nav-btn ${activeTab === 'reservations' ? 'active' : ''}`} onClick={() => handleTabChange('reservations')}>
            <i className="fa-solid fa-calendar-days"></i> Reservas
          </button>
          
          <button className={`nav-btn ${activeTab === 'reintegros' ? 'active' : ''}`} onClick={() => handleTabChange('reintegros')}>
            <i className="fa-solid fa-money-bill-transfer"></i> Reintegros
          </button>

          <button className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`} onClick={() => handleTabChange('users')}>
            <i className="fa-solid fa-users"></i> Usuarios
          </button>
          
          <button className={`nav-btn ${activeTab === 'preferences' ? 'active' : ''}`} onClick={() => handleTabChange('preferences')}>
            <i className="fa-solid fa-gear"></i> Preferencias
          </button>
          
          <div className="sidebar-footer">
            <button className="nav-btn logout-btn" onClick={handleLogout}>
              <i className="fa-solid fa-right-from-bracket"></i> Cerrar Sesión
            </button>
          </div>
        </nav>
      </aside>

      {/* Contenido principal */}
      <main className="admin-main-content">
        <header className="admin-top-header">
          <h1>{getHeaderTitle()}</h1>
        </header>

        <section className="admin-content-area">
          {activeTab === 'accounting' && <AnalyticsDashboard />}
          {activeTab === 'prices' && <PriceEditor />}
          {activeTab === 'expenses' && <GastosManager />}
          {activeTab === 'reservations' && <ReservasManager />}
          {activeTab === 'reintegros' && <ReintegrosAdmin />}
          {activeTab === 'users' && <UserList />}
          {activeTab === 'preferences' && <PreferencesManager />}
        </section>
      </main>
    </div>
  );
}

export default AdminPanel;