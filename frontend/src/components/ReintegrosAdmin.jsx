import { useState, useEffect } from 'react';
import './reintegrosAdmin.css';

function ReintegrosAdmin() {
  const [reintegros, setReintegros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Nuevos estados para manejar el comprobante
  const [reservaActiva, setReservaActiva] = useState(null);
  const [comprobante, setComprobante] = useState(null);
  const [subiendo, setSubiendo] = useState(false);

  const fetchReintegros = async () => {
    try {
      const token = localStorage.getItem('authToken'); 
      const response = await fetch('/api/v1/reserva/reintegros-pendientes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Error al cargar los reintegros.');
      setReintegros(data.data || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReintegros(); }, []);

  // Abre el modal para adjuntar el comprobante
  const iniciarPago = (reserva) => {
    setReservaActiva(reserva);
    setComprobante(null);
  };

  // Ejecuta la subida del archivo y confirma el pago
  const confirmarPago = async () => {
    if (!comprobante) {
      alert("Por favor, adjuntá el comprobante de transferencia.");
      return;
    }

    setSubiendo(true);
    
    // Usamos FormData para poder enviar el archivo al backend
    const formData = new FormData();
    formData.append('comprobante', comprobante);

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/reserva/${reservaActiva.id}/reintegro`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
          // IMPORTANTE: Al usar FormData NO se pone el 'Content-Type'. 
          // El navegador lo calcula solo y le agrega el 'boundary'.
        },
        body: formData
      });

      if (!response.ok) throw new Error('No se pudo procesar el reintegro.');

      // Actualizamos la tabla y cerramos el modal
      setReintegros(reintegros.filter(r => r.id !== reservaActiva.id));
      setReservaActiva(null);
      alert("Reintegro procesado y cliente notificado por email.");
      
    } catch (err) {
      alert(`Error: ${err.message}`);
    } finally {
      setSubiendo(false);
    }
  };

  if (loading) return <div className="reintegros-loading">Cargando solicitudes...</div>;

  return (
    <div className="reintegros-admin-container">
      <h2>Gestión de Reintegros</h2>
      <p className="reintegros-subtitle">Reservas canceladas que requieren devolución de seña.</p>

      {error && <div className="error-alert">{error}</div>}

      {reintegros.length === 0 ? (
        <div className="reintegros-empty"><p>¡Todo al día! No hay devoluciones pendientes.</p></div>
      ) : (
        <div className="table-responsive">
          <table className="reintegros-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Fecha Liberada</th>
                <th>Motivo</th>
                <th>Acción</th>
              </tr>
            </thead>
            <tbody>
              {reintegros.map((reserva) => (
                <tr key={reserva.id}>
                  <td>#{reserva.id}</td>
                  <td>{reserva.usuario?.nombre} {reserva.usuario?.apellido}</td>
                  <td>{reserva.fecha?.dia}</td>
                  <td className="observaciones-cell">{reserva.observaciones}</td>
                  <td>
                    <button className="btn-pagado" onClick={() => iniciarPago(reserva)}>
                      Procesar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL PARA SUBIR COMPROBANTE */}
      {reservaActiva && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Procesar Reintegro #{reservaActiva.id}</h3>
            <p>Subí el comprobante de transferencia para enviárselo a <strong>{reservaActiva.usuario?.nombre}</strong>.</p>
            
            <input 
              type="file" 
              accept=".pdf,image/png,image/jpeg" 
              onChange={(e) => setComprobante(e.target.files[0])} 
              className="file-input"
            />
            
            <div className="modal-actions">
              <button className="btn-cancelar" onClick={() => setReservaActiva(null)} disabled={subiendo}>
                Cancelar
              </button>
              <button className="btn-confirmar" onClick={confirmarPago} disabled={subiendo}>
                {subiendo ? 'Enviando...' : 'Confirmar y Notificar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ReintegrosAdmin;