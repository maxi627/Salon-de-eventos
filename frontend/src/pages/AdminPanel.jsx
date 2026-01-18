import { useState } from 'react';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import ArchivedReservations from '../components/ArchivedReservations';
import EditReservationModal from '../components/EditReservationModal';
import GastosManager from '../components/GastosManager';
import PriceEditor from '../components/PriceEditor';
import UserList from '../components/UserList';
import { useReservas } from '../hooks/useAdminData';
import './AdminPanel.css';

function AdminPanel() {
  const { data: reservas = {}, isLoading, error, refetch } = useReservas();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  
  // CAMBIO CLAVE: Cambiamos a expandedMonths. 
  // Al iniciar como {}, expandedMonths[month] será undefined (falso), por lo que todo inicia cerrado.
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

  const formatDisplayDateTime = (isoDateTime) => {
    if (!isoDateTime) return 'N/A';
    const date = new Date(isoDateTime);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(date);
  };

  const toggleMonth = (month) => {
    setExpandedMonths(prev => ({ 
      ...prev, 
      [month]: !prev[month] 
    }));
  };

  const handleUpdate = () => {
    refetch();
    setIsModalOpen(false);
    setSelectedReservation(null);
  };

  if (isLoading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando panel de administración...</p>;
  if (error) return <p className="error-message" style={{ textAlign: 'center' }}>{error.message}</p>;

  return (
    <div className="admin-panel">
      <h1>Panel de Administración</h1>
      
      <AnalyticsDashboard />
      <PriceEditor />
      <GastosManager />
      
      <div className="reservas-header">
        <h2 className="reservas-title">Gestión de Reservas</h2>
        <div>
          <button className="btn-toggle-archived" onClick={() => setShowArchived(!showArchived)}>
            {showArchived ? 'Ocultar Archivadas' : 'Ver Archivadas'}
          </button>
          <button className="btn-create" onClick={() => { setSelectedReservation(null); setIsCreating(true); setIsModalOpen(true); }}>
            + Crear Nueva Reserva
          </button>
        </div>
      </div>
      
      {showArchived && <ArchivedReservations />}
      
      {Object.keys(reservas).length > 0 ? (
        Object.keys(reservas).map(month => (
          <div key={month} className="month-section">
            <h3 className="month-header" onClick={() => toggleMonth(month)}>
              {month.charAt(0).toUpperCase() + month.slice(1)}
              {/* La flecha cambia de dirección según si está expandido o no */}
              <span className={`collapse-icon ${expandedMonths[month] ? '' : 'collapsed'}`}>▼</span>
            </h3>
            
            {/* Solo se renderiza la tabla si el mes está marcado como expandido */}
            {expandedMonths[month] && (
              <div className="table-container">
                <table className="reservas-table">
                  <thead>
                    <tr>
                      <th>Fecha Evento</th>
                      <th>Usuario</th>
                      <th>Estado</th>
                      <th>Comprobante</th>
                      <th>Valor Alquiler</th>
                      <th>Saldo Restante</th>
                      <th>Fecha Aceptación</th>
                      <th>IP Aceptación</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reservas[month].map(reserva => (
                      <tr key={reserva.id}>
                        <td>{formatDisplayDate(reserva.fecha?.dia)}</td>
                        <td>{`${reserva.usuario?.nombre || ''} ${reserva.usuario?.apellido || ''}`}</td>
                        <td><span className={`status ${reserva.estado}`}>{reserva.estado}</span></td>
                        <td>
                          {reserva.comprobante_url ? (
                            <a href={`/${reserva.comprobante_url}`} target="_blank" rel="noopener noreferrer">Ver</a>
                          ) : 'N/A'}
                        </td>
                        <td>${(reserva.valor_alquiler || 0).toLocaleString('es-AR')}</td>
                        <td>${(reserva.saldo_restante || 0).toLocaleString('es-AR')}</td>
                        <td>{formatDisplayDateTime(reserva.fecha_aceptacion)}</td>
                        <td>{reserva.ip_aceptacion || 'N/A'}</td>
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
      ) : <p>No hay reservas activas para mostrar.</p>}

      {isModalOpen && (
        <EditReservationModal 
          isCreating={isCreating}
          reservation={selectedReservation}
          onClose={() => setIsModalOpen(false)}
          onUpdate={handleUpdate}
        />
      )}
      <UserList />
    </div>
  );
}

export default AdminPanel;