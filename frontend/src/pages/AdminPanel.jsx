import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ArchivedReservations from '../components/ArchivedReservations';
import EditReservationModal from '../components/EditReservationModal';
import GastosManager from '../components/GastosManager';
import PriceEditor from '../components/PriceEditor';
import UserList from '../components/UserList';
import { useReservas } from '../hooks/useAdminData';
import './AdminPanel.css';

// --- SUB-COMPONENTE: GESTIÓN DE RESERVAS CON BOTÓN REFRESCAR ---
const ReservasManager = () => {
  const { data: reservas = {}, isLoading, error, refetch, isFetching } = useReservas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [expandedMonths, setExpandedMonths] = useState({});
  const [showArchived, setShowArchived] = useState(false);

  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return 'N/A';
    const dateParts = isoDate.split('-');
    const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    }).format(date);
  };

  const toggleMonth = (month) => {
    setExpandedMonths(prev => ({ ...prev, [month]: !prev[month] }));
  };

  if (isLoading) return <p className="admin-loading">Cargando reservas...</p>;
  if (error) return <p className="error-message">{error.message}</p>;

  return (
    <div className="admin-section-fade">
      <div className="reservas-header">
        <div className="title-with-refresh">
          <h2 className="section-title">Gestión de Reservas</h2>
        </div>
        <div className="reservas-actions">
          <button className="btn-toggle-archived" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Ocultar Archivadas' : 'Ver Archivadas'}
          </button>
          <button className="btn-create" onClick={() => { setSelectedReservation(null); setIsCreating(true); setIsModalOpen(true); }}>
            + Nueva Reserva
          </button>
        </div>
      </div>

      {showArchived && <ArchivedReservations />}

      {Object.keys(reservas).length > 0 ? (
        Object.keys(reservas).map(month => (
          <div key={month} className="month-section">
            <h3 className="month-header" onClick={() => toggleMonth(month)}>
              {month.charAt(0).toUpperCase() + month.slice(1)}
              <span className={`collapse-icon ${expandedMonths[month] ? '' : 'collapsed'}`}>▼</span>
            </h3>
            {expandedMonths[month] && (
              <div className="table-container">
                <table className="reservas-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Usuario</th>
                      <th>Estado</th>
                      <th>Alquiler</th>
                      <th>Saldo</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservas[month].map(reserva => (
                      <tr key={reserva.id}>
                        <td>{formatDisplayDate(reserva.fecha?.dia)}</td>
                        <td>{`${reserva.usuario?.nombre || ''} ${reserva.usuario?.apellido || ''}`}</td>
                        <td><span className={`status ${reserva.estado}`}>{reserva.estado}</span></td>
                        <td>${(reserva.valor_alquiler || 0).toLocaleString('es-AR')}</td>
                        <td>${(reserva.saldo_restante || 0).toLocaleString('es-AR')}</td>
                        <td>
                          <button className="btn-edit" onClick={() => { setSelectedReservation(reserva); setIsCreating(false); setIsModalOpen(true); }}>
                            Gestionar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))
      ) : <p>No hay reservas activas.</p>}

      {isModalOpen && (
        <EditReservationModal 
          isCreating={isCreating}
          reservation={selectedReservation}
          onClose={() => setIsModalOpen(false)}
          onUpdate={refetch}
        />
      )}
    </div>
  );
};

// --- COMPONENTE PRINCIPAL: ADMIN PANEL CON PERSISTENCIA ---
function AdminPanel() {
  // Leemos del localStorage al iniciar, si no existe usamos 'accounting'
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem('adminActiveTab') || 'accounting';
  });
  
  const navigate = useNavigate();

  // Guardamos en localStorage cada vez que activeTab cambie
  useEffect(() => {
    localStorage.setItem('adminActiveTab', activeTab);
  }, [activeTab]);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userRole');
    localStorage.removeItem('adminActiveTab'); // Limpiar al salir
    navigate('/login');
  };

  return (
    <div className="admin-wrapper">
      <aside 
      className="admin-sidebar"
      style={{ backgroundColor: '#bc9e74', color: '#f1f5f9' }}
      >
        <div className="sidebar-logo">
          <h3>SALÓN ADMIN</h3>
        </div>
        
        <nav className="sidebar-nav">
          <button className="nav-btn" onClick={() => navigate('/')}>
            🏠 Inicio
          </button>
          
          <div className="nav-divider">Gestión</div>
          
          <button 
            className={`nav-btn ${activeTab === 'accounting' ? 'active' : ''}`}
            onClick={() => setActiveTab('accounting')}
          >
            📊 Contabilidad
          </button>
          
          <button 
            className={`nav-btn ${activeTab === 'prices' ? 'active' : ''}`}
            onClick={() => setActiveTab('prices')}
          >
            💰 Precios
          </button>
          
          <button 
            className={`nav-btn ${activeTab === 'expenses' ? 'active' : ''}`}
            onClick={() => setActiveTab('expenses')}
          >
            📉 Gastos
          </button>
          
          <button 
            className={`nav-btn ${activeTab === 'reservations' ? 'active' : ''}`}
            onClick={() => setActiveTab('reservations')}
          >
            📅 Reservas
          </button>
          
          <button 
            className={`nav-btn ${activeTab === 'users' ? 'active' : ''}`}
            onClick={() => setActiveTab('users')}
          >
            👤 Usuarios
          </button>

          <div className="sidebar-footer">
            <button className="nav-btn logout-btn" onClick={handleLogout}>
              🚪 Cerrar Sesión
            </button>
          </div>
        </nav>
      </aside>

      <main className="admin-main-content">
        <header className="admin-top-header">
          <h1>{
            activeTab === 'accounting' ? 'Resumen de Contabilidad' :
            activeTab === 'prices' ? 'Configuración de Precios' :
            activeTab === 'expenses' ? 'Control de Gastos' :
            activeTab === 'reservations' ? 'Calendario de Reservas' : 'Gestión de Usuarios'
          }</h1>
        </header>

        <section className="admin-content-area">
          {activeTab === 'accounting' && <AnalyticsDashboard />}
          {activeTab === 'prices' && <PriceEditor />}
          {activeTab === 'expenses' && <GastosManager />}
          {activeTab === 'reservations' && <ReservasManager />}
          {activeTab === 'users' && <UserList />}
        </section>
      </main>
    </div>
  );
}

export default AdminPanel;