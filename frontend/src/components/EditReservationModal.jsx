import { useState } from 'react';

function EditReservationModal({ reservation, onClose, onUpdate }) {
  // Estado para manejar los datos del formulario
  const [formData, setFormData] = useState({
    valor_alquiler: reservation.valor_alquiler || 0,
    saldo_restante: reservation.saldo_restante || 0,
    estado: reservation.estado || 'pendiente',
  });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/v1/reserva/${reservation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      
      setMessage('Reserva actualizada con éxito.');
      setTimeout(() => onUpdate(), 1500); // Llama a onUpdate para refrescar la tabla
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleApprove = async () => {
    setError('');
    setMessage('');
    const token = localStorage.getItem('authToken');
     try {
      const response = await fetch(`/api/v1/reserva/${reservation.id}/approve`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setMessage('¡Reserva APROBADA con éxito!');
      setTimeout(() => onUpdate(), 1500);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>Editar Reserva: {reservation.fecha.dia}</h2>
        <p><strong>Usuario:</strong> {reservation.usuario.nombre} {reservation.usuario.apellido}</p>
        
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="valor_alquiler">Valor del Alquiler</label>
            <input type="number" name="valor_alquiler" value={formData.valor_alquiler} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="saldo_restante">Saldo Restante</label>
            <input type="number" name="saldo_restante" value={formData.saldo_restante} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label htmlFor="estado">Estado</label>
            <select name="estado" value={formData.estado} onChange={handleChange}>
              <option value="pendiente">Pendiente</option>
              <option value="confirmada">Confirmada</option>
              <option value="cancelada">Cancelada</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-close" onClick={onClose}>Cerrar</button>
            <button type="submit" className="btn-save">Guardar Cambios</button>
          </div>
        </form>

        {reservation.estado === 'pendiente' && (
          <button onClick={handleApprove} className="btn-approve">Aprobar Reserva (Pago Recibido)</button>
        )}

        {error && <p className="error-message">{error}</p>}
        {message && <p className="message-area">{message}</p>}
      </div>
    </div>
  );
}

export default EditReservationModal;