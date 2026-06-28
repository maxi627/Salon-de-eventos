import { useState, useEffect } from 'react';
import './reintegrosAdmin.css';

function ReintegrosAdmin() {
  const [reintegros, setReintegros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // 1. Cargar las cancelaciones que tienen la bandera requiere_reintegro = True
  const fetchReintegros = async () => {
    try {
      // Reemplazá el token según cómo lo manejes en tu auth (localStorage, context, etc)
      const token = localStorage.getItem('authToken'); 
      const response = await fetch('/api/v1/reserva/reintegros-pendientes', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Error al cargar los reintegros.');
      }
      
      setReintegros(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReintegros();
  }, []);

  // 2. Acción para bajar la bandera una vez que transferiste
  const handleMarcarPagado = async (reservaId) => {
    const confirmacion = window.confirm("¿Confirmás que ya realizaste la devolución del dinero a este cliente?");
    if (!confirmacion) return;

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/reserva/${reservaId}/reintegro`, {
        method: 'PATCH', // Usamos PATCH porque solo modificamos un campo pequeño
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('No se pudo actualizar el estado del reintegro.');
      }

      // Si salió bien, lo sacamos visualmente de la tabla sin recargar la página
      setReintegros(reintegros.filter(r => r.id !== reservaId));
      
    } catch (err) {
      alert(`Error: ${err.message}`);
    }
  };

  if (loading) return <div className="reintegros-loading">Cargando solicitudes...</div>;

  return (
    <div className="reintegros-admin-container">
      <h2>Gestión de Reintegros</h2>
      <p className="reintegros-subtitle">
        Reservas canceladas por arrepentimiento que requieren devolución de seña.
      </p>

      {error && <div className="error-alert">{error}</div>}

      {reintegros.length === 0 ? (
        <div className="reintegros-empty">
          <p>¡Todo al día! No hay devoluciones pendientes.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="reintegros-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha Liberada</th>
                <th>Motivo del Cliente</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {reintegros.map((reserva) => (
                <tr key={reserva.id}>
                  <td>#{reserva.id}</td>
                  {/* Asegurate de que tu schema backend envíe el objeto usuario anidado */}
                  <td>{reserva.usuario?.nombre} {reserva.usuario?.apellido}</td>
                  <td>{reserva.fecha?.dia || 'Fecha no especificada'}</td>
                  <td className="observaciones-cell">{reserva.observaciones}</td>
                  <td>
                    <button 
                      className="btn-pagado"
                      onClick={() => handleMarcarPagado(reserva.id)}
                    >
                      Marcar Pagado
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ReintegrosAdmin;