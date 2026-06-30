import { useEffect, useState } from 'react';
import '../pages/AdminPanel.css'; // Reutilizamos los estilos

// --- SUB-COMPONENTE: Modal Detalle de Archivada ---
const ArchivedDetailsModal = ({ reserva, onClose }) => {
  if (!reserva) return null;

  // Reutilizamos tu lógica de fechas y cálculos
  const dateStr = new Date(reserva.fecha.dia + 'T00:00:00Z').toLocaleDateString('es-ES', { timeZone: 'UTC' });
  const valorPagado = reserva.valor_alquiler - reserva.saldo_restante;

  return (
    // zIndex: 1100 garantiza que se abra por encima del modal grande de archivadas
    <div className="details-modal-overlay" style={{ zIndex: 1100 }} onClick={onClose}>
      <div className="details-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="details-modal-header">
          <h3>Detalles de Archivada</h3>
          <button className="btn-close-modal" onClick={onClose}>&times;</button>
        </div>
        
        <div className="details-modal-body">
          <p><strong>Fecha Evento:</strong> {dateStr}</p>
          <p><strong>Usuario:</strong> {reserva.usuario?.nombre || ''} {reserva.usuario?.apellido || ''}</p>
          <p><strong>Estado:</strong> <span className={`status-badge ${reserva.estado}`}>{reserva.estado}</span></p>
          <p><strong>Valor Pagado:</strong> ${valorPagado.toLocaleString('es-AR')}</p>
        </div>
      </div>
    </div>
  );
};

// --- COMPONENTE PRINCIPAL ---
function ArchivedReservations() {
  const [archived, setArchived] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Estado para controlar qué reserva se muestra en el mini-modal
  const [selectedReserva, setSelectedReserva] = useState(null);

  useEffect(() => {
    const fetchArchived = async () => {
      const token = localStorage.getItem('authToken');
      try {
        const response = await fetch('/api/v1/reserva/archivadas', {
          headers: { 'Authorization': `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error('No se pudieron cargar las reservas archivadas.');
        }
        const data = await response.json();
        setArchived(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchArchived();
  }, []);

  if (isLoading) return <p style={{ textAlign: 'center', padding: '2rem' }}>Cargando reservas archivadas...</p>;
  if (error) return <p className="error-message" style={{ textAlign: 'center' }}>{error}</p>;

  return (
    <div className="archived-section">
      {archived.length > 0 ? (
        <div className="table-container">
          {/* Cambiamos la clase a archivadas-table */}
          <table className="archivadas-table">
            <thead>
              <tr>
                <th>Fecha Evento</th>
                <th>Usuario</th>
                {/* Ocultamos Estado y Valor en móviles */}
                <th className="hide-on-mobile">Estado</th>
                <th className="hide-on-mobile">Valor Pagado</th>
              </tr>
            </thead>
            <tbody>
              {archived.map(reserva => {
                const dateStr = new Date(reserva.fecha.dia + 'T00:00:00Z').toLocaleDateString('es-ES', { timeZone: 'UTC' });
                const valorPagado = reserva.valor_alquiler - reserva.saldo_restante;
                
                return (
                  <tr 
                    key={reserva.id} 
                    className="clickable-row" 
                    onClick={() => setSelectedReserva(reserva)}
                    title="Ver detalles"
                  >
                    <td><strong>{dateStr}</strong></td>
                    <td>{`${reserva.usuario?.nombre || ''} ${reserva.usuario?.apellido || ''}`}</td>
                    <td className="hide-on-mobile">
                      <span className={`status-badge ${reserva.estado}`}>
                        {reserva.estado}
                      </span>
                    </td>
                    <td className="hide-on-mobile">${valorPagado.toLocaleString('es-AR')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p style={{ textAlign: 'center', padding: '2rem' }}>No hay reservas archivadas para mostrar.</p>
      )}

      {/* Renderizamos el modal secundario si el usuario tocó una fila */}
      <ArchivedDetailsModal 
        reserva={selectedReserva} 
        onClose={() => setSelectedReserva(null)} 
      />
    </div>
  );
}

export default ArchivedReservations;