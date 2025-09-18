import { useEffect, useState } from 'react';
import AnalyticsDashboard from '../components/AnalyticsDashboard';
import EditReservationModal from '../components/EditReservationModal';
import PriceEditor from '../components/PriceEditor';
import './AdminPanel.css';

function AdminPanel() {
  const [reservas, setReservas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Función para formatear la fecha a un formato legible
  // Convierte "2025-09-17" a "miércoles, 17 de septiembre de 2025"
  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return 'N/A';
    
    // Dividimos el string para evitar problemas de zona horaria
    const dateParts = isoDate.split('-');
    // Creamos la fecha en UTC para asegurar que sea el día correcto
    const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));

    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC' // Especificamos la zona horaria para consistencia
    }).format(date);
  };

  const fetchReservas = async () => {
    const token = localStorage.getItem('authToken');
    try {
      // No reiniciamos el loading en cada fetch para una mejor UX con el dashboard
      // setIsLoading(true); 
      const response = await fetch('/api/v1/reserva', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No tienes permiso o hubo un error al cargar las reservas.');
      }
      
      const data = await response.json();
      // Ordenamos las reservas por fecha para una mejor visualización
      const sortedReservas = data.data.sort((a, b) => new Date(a.fecha?.dia) - new Date(b.fecha?.dia));
      setReservas(sortedReservas);

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReservas();
  }, []);

  const handleOpenModal = (reserva) => {
    setSelectedReservation(reserva);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReservation(null);
  };

  // Esta función se llama desde el modal para refrescar la lista de reservas
  const handleUpdate = () => {
    fetchReservas(); 
    handleCloseModal();
  };

  if (isLoading) return <p style={{textAlign: 'center', marginTop: '2rem'}}>Cargando panel de administración...</p>;
  if (error) return <p className="error-message" style={{textAlign: 'center'}}>{error}</p>;

  return (
    <div className="admin-panel">
      <h1>Panel de Administración</h1>
      
      <AnalyticsDashboard />

      <PriceEditor />

      <h2 className="reservas-title">Gestión de Reservas</h2>
      <div className="table-container">
        <table className="reservas-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Email</th>
              <th>Estado</th>
              <th>Comprobante</th>
              <th>Valor Alquiler</th>
              <th>Saldo Restante</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservas.length > 0 ? (
              reservas.map(reserva => (
                <tr key={reserva.id}>
                  {/* Aplicamos la función de formateo en la celda de la fecha */}
                  <td>{formatDisplayDate(reserva.fecha?.dia)}</td>
                  
                  <td>{`${reserva.usuario?.nombre || ''} ${reserva.usuario?.apellido || ''}`}</td>
                  <td>{reserva.usuario?.correo || 'N/A'}</td>
                  <td><span className={`status ${reserva.estado}`}>{reserva.estado}</span></td>
                  <td>
                    {reserva.comprobante_url ? (
                      <a href={`/${reserva.comprobante_url}`} target="_blank" rel="noopener noreferrer">
                        Ver
                      </a>
                    ) : 'N/A'}
                  </td>
                  <td>${(reserva.valor_alquiler || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  <td>${(reserva.saldo_restante || 0).toLocaleString('es-AR', { minimumFractionDigits: 2 })}</td>
                  <td>
                    <button className="btn-edit" onClick={() => handleOpenModal(reserva)}>
                      Gestionar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="8">No hay reservas para mostrar.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <EditReservationModal 
          reservation={selectedReservation}
          onClose={handleCloseModal}
          onUpdate={handleUpdate}
        />
      )}
    </div>
  );
}

export default AdminPanel;