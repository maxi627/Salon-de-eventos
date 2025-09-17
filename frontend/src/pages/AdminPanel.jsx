import { useEffect, useState } from 'react';
import './AdminPanel.css';
import EditReservationModal from '../components/EditReservationModal'; // Asegúrate de que esta ruta sea correcta

function AdminPanel() {
  const [reservas, setReservas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para manejar el modal de edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  // Función para obtener las reservas del backend
  const fetchReservas = async () => {
    const token = localStorage.getItem('authToken');
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/reserva', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.status === 401) {
          throw new Error('Tu sesión ha expirado. Por favor, inicia sesión de nuevo.');
      }
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ message: 'Error al obtener las reservas.' }));
        throw new Error(errorData.message || 'No tienes permiso o hubo un error.');
      }
      
      const data = await response.json();
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

  const handleUpdate = () => {
    fetchReservas(); 
    handleCloseModal();
  };

  if (isLoading) return <p style={{textAlign: 'center', marginTop: '2rem'}}>Cargando reservas...</p>;
  if (error) return <p className="error-message" style={{textAlign: 'center'}}>{error}</p>;

  return (
    <div className="admin-panel">
      <h1>Panel de Administración de Reservas</h1>
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
                  <td>{reserva.fecha?.dia || 'N/A'}</td>
                  
                  {/* --- CORRECCIÓN APLICADA AQUÍ --- */}
                  {/* Accedemos a las propiedades nombre y apellido del objeto usuario */}
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
                  <td>${(reserva.valor_alquiler || 0).toFixed(2)}</td>
                  <td>${(reserva.saldo_restante || 0).toFixed(2)}</td>
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