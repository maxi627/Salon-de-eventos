import { useEffect, useState } from 'react';
import './AdminPanel.css';
import EditReservationModal from '../components/EditReservationModal'; // Importaremos el modal

function AdminPanel() {
  const [reservas, setReservas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  // Estados para manejar el modal de edición
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);

  const fetchReservas = async () => {
    const token = localStorage.getItem('authToken');
    try {
      setIsLoading(true);
      const response = await fetch('/api/v1/reserva', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) throw new Error('No tienes permiso para ver esta página.');
      
      const data = await response.json();
      // Ordenamos las reservas, por ejemplo, por fecha
      const sortedReservas = data.data.sort((a, b) => new Date(a.fecha.dia) - new Date(b.fecha.dia));
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

  // Funciones para abrir y cerrar el modal
  const handleOpenModal = (reserva) => {
    setSelectedReservation(reserva);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedReservation(null);
  };

  const handleUpdate = () => {
    fetchReservas(); // Vuelve a cargar las reservas para ver los cambios
    handleCloseModal();
  };

  if (isLoading) return <p style={{textAlign: 'center', marginTop: '2rem'}}>Cargando reservas...</p>;
  if (error) return <p className="error-message">{error}</p>;

  return (
    <div className="admin-panel">
      <h1>Panel de Administración de Reservas</h1>
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
                <td>{reserva.fecha?.dia}</td>
                <td>{`${reserva.usuario?.nombre} ${reserva.usuario?.apellido}`}</td>
                <td>{reserva.usuario?.correo}</td>
                <td><span className={`status ${reserva.estado}`}>{reserva.estado}</span></td>
                <td>
                  {reserva.comprobante_url ? (
                    <a href={`/${reserva.comprobante_url}`} target="_blank" rel="noopener noreferrer">
                      Ver
                    </a>
                  ) : 'N/A'}
                </td>
                <td>${reserva.valor_alquiler?.toFixed(2)}</td>
                <td>${reserva.saldo_restante?.toFixed(2)}</td>
                <td>
                  <button className="btn-edit" onClick={() => handleOpenModal(reserva)}>
                    Editar
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