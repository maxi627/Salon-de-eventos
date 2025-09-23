import { useEffect, useState } from 'react';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import EditReservationModal from '../components/EditReservationModal';
import GastosManager from '../components/GastosManager';
import PriceEditor from '../components/PriceEditor';
import UserList from '../components/UserList';
import './AdminPanel.css';

function AdminPanel() {
  const [reservas, setReservas] = useState({}); // Cambiado a objeto para agrupar
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [collapsedMonths, setCollapsedMonths] = useState({}); // Estado para secciones desplegables

  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return 'N/A';
    const dateParts = isoDate.split('-');
    const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC'
    }).format(date);
  };

  const formatDisplayDateTime = (isoDateTime) => {
    if (!isoDateTime) return 'N/A';
    const date = new Date(isoDateTime);
    return new Intl.DateTimeFormat('es-AR', {
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      timeZone: 'America/Argentina/Buenos_Aires'
    }).format(date);
  };

  const fetchReservas = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('/api/v1/reserva', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No tienes permiso o hubo un error al cargar las reservas.');
      }
      const data = await response.json();
      
      // Agrupar reservas por mes y año
      const groupedReservas = data.data.sort((a, b) => new Date(a.fecha?.dia) - new Date(b.fecha?.dia))
        .reduce((acc, reserva) => {
          if (!reserva.fecha?.dia) return acc;
          const fecha = new Date(reserva.fecha.dia);
          // Corregir problema de zona horaria sumando un día para asegurar el mes correcto
          const adjustedDate = new Date(fecha.getUTCFullYear(), fecha.getUTCMonth(), fecha.getUTCDate() + 1);
          const monthYear = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(adjustedDate);
          
          if (!acc[monthYear]) {
            acc[monthYear] = [];
          }
          acc[monthYear].push(reserva);
          return acc;
      }, {});

      setReservas(groupedReservas);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservas();
  }, []);

  const toggleMonth = (month) => {
    setCollapsedMonths(prev => ({
      ...prev,
      [month]: !prev[month]
    }));
  };
  
  const handleOpenEditModal = (reserva) => {
    setSelectedReservation(reserva);
    setIsCreating(false);
    setIsModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setSelectedReservation(null);
    setIsCreating(true);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReservation(null);
    setIsCreating(false);
  };

  const handleUpdate = () => {
    fetchReservas();
    handleCloseModal();
  };

  if (isLoading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando panel de administración...</p>;
  if (error) return <p className="error-message" style={{ textAlign: 'center' }}>{error}</p>;

  return (
    <div className="admin-panel">
      <h1>Panel de Administración</h1>
      
      <AnalyticsDashboard />
      <PriceEditor />
      <GastosManager />
      <div className="reservas-header">
        <h2 className="reservas-title">Gestión de Reservas</h2>
        <button className="btn-create" onClick={handleOpenCreateModal}>
          + Crear Nueva Reserva
        </button>
      </div>
      
      {Object.keys(reservas).length > 0 ? (
        Object.keys(reservas).map(month => (
          <div key={month} className="month-section">
            <h3 className="month-header" onClick={() => toggleMonth(month)}>
              {month.charAt(0).toUpperCase() + month.slice(1)}
              <span className={`collapse-icon ${collapsedMonths[month] ? 'collapsed' : ''}`}>▼</span>
            </h3>
            {!collapsedMonths[month] && (
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
                            <a href={`/${reserva.comprobante_url}`} target="_blank" rel="noopener noreferrer">
                              Ver
                            </a>
                          ) : 'N/A'}
                        </td>
                        <td>${(reserva.valor_alquiler || 0).toLocaleString('es-AR')}</td>
                        <td>${(reserva.saldo_restante || 0).toLocaleString('es-AR')}</td>
                        <td>{formatDisplayDateTime(reserva.fecha_aceptacion)}</td>
                        <td>{reserva.ip_aceptacion || 'N/A'}</td>
                        <td>
                          <button className="btn-edit" onClick={() => handleOpenEditModal(reserva)}>
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
      ) : (
        <p>No hay reservas para mostrar.</p>
      )}

      {isModalOpen && (
        <EditReservationModal 
          isCreating={isCreating}
          reservation={selectedReservation}
          onClose={handleCloseModal}
          onUpdate={handleUpdate}
        />
      )}
      
      <UserList />
    </div>
  );
}

export default AdminPanel;