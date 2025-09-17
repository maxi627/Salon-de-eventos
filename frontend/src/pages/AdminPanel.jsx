import { useEffect, useState } from 'react';
import './AdminPanel.css'; // Crearemos este archivo para los estilos

function AdminPanel() {
  const [reservas, setReservas] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchReservas = async () => {
      const token = localStorage.getItem('authToken');
      try {
        const response = await fetch('/api/v1/reserva', {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        if (!response.ok) {
          throw new Error('No tienes permiso para ver esta página.');
        }
        const data = await response.json();
        setReservas(data.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    };
    fetchReservas();
  }, []);

  if (isLoading) return <p>Cargando reservas...</p>;
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
                <td>{reserva.fecha.dia}</td>
                <td>{`${reserva.usuario.nombre} ${reserva.usuario.apellido}`}</td>
                <td>{reserva.usuario.correo}</td>
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
                  <button className="btn-edit">Editar</button>
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
  );
}

export default AdminPanel;