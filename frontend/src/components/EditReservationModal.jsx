import { useEffect, useState } from 'react';
import '../pages/AdminPanel.css';

function EditReservationModal({ reservation, onClose, onUpdate, isCreating }) {
  const [formData, setFormData] = useState({
    usuario_id: reservation?.usuario?.id || '',
    fecha_dia: reservation?.fecha?.dia || '',
    valor_alquiler: reservation?.valor_alquiler || 0,
    estado: reservation?.estado || 'confirmada',
  });
  const [newPayment, setNewPayment] = useState({ monto: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchUsers = async () => {
      const token = localStorage.getItem('authToken');
      try {
        const response = await fetch('/api/v1/usuario', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        if (response.ok) {
          setUsers(data.data);
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    if (isCreating) {
      fetchUsers();
    }
  }, [isCreating]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePaymentChange = (e) => {
    setNewPayment({ monto: e.target.value });
  };
  
  const handleAddPayment = async () => {
    if (!newPayment.monto || parseFloat(newPayment.monto) <= 0) {
      setError('El monto del pago debe ser un número positivo.');
      return;
    }
    setError('');
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`/api/v1/reserva/${reservation.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ monto: parseFloat(newPayment.monto) }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      
      setMessage('Pago añadido con éxito.');
      setNewPayment({ monto: '' });
      // Refresca los datos para mostrar el nuevo pago y el saldo actualizado
      onUpdate(); 
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    const token = localStorage.getItem('authToken');
    const { saldo_restante, ...dataToSend } = formData;

    const method = isCreating ? 'POST' : 'PUT';
    const url = isCreating ? '/api/v1/reserva/crear' : `/api/v1/reserva/${reservation.id}`;

    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(dataToSend),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Ocurrió un error.');
      
      setMessage(isCreating ? 'Reserva creada con éxito.' : 'Reserva actualizada con éxito.');
      setTimeout(() => onUpdate(), 1500);
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm(`¿Estás seguro de que quieres eliminar la reserva del ${reservation.fecha.dia}? Esta acción no se puede deshacer.`)) {
      return;
    }

    setIsDeleting(true);
    setError('');
    setMessage('');
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/v1/reserva/${reservation.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al eliminar la reserva.');
      
      setMessage('¡Reserva eliminada con éxito!');
      setTimeout(() => onUpdate(), 2000);
      
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>{isCreating ? 'Crear Nueva Reserva' : `Gestionar Reserva`}</h2>
        {!isCreating && <p><strong>Usuario:</strong> {reservation.usuario.nombre} {reservation.usuario.apellido}</p>}
        
        <form onSubmit={handleSubmit}>
          {isCreating && (
            <div className="form-group">
              <label htmlFor="usuario_id">Usuario</label>
              <select name="usuario_id" value={formData.usuario_id} onChange={handleChange} required>
                <option value="">Seleccione un usuario</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nombre} {user.apellido} (ID: {user.id})
                  </option>
                ))}
              </select>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="fecha_dia">Fecha del Evento</label>
            <input type="date" name="fecha_dia" value={formData.fecha_dia} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="valor_alquiler">Valor del Alquiler</label>
            <input type="number" name="valor_alquiler" value={formData.valor_alquiler} onChange={handleChange} />
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
            <button type="submit" className="btn-save">{isCreating ? 'Crear Reserva' : 'Guardar Cambios'}</button>
          </div>
        </form>

        {!isCreating && (
          <div className="payments-section">
            <h4>Pagos Registrados</h4>
            <ul className="payment-list">
              {reservation.pagos && reservation.pagos.length > 0 ? (
                reservation.pagos.map(pago => (
                  <li key={pago.id}>
                    <span>{new Date(pago.fecha_pago).toLocaleDateString('es-ES')}</span>
                    <strong>${(pago.monto || 0).toLocaleString('es-AR')}</strong>
                  </li>
                ))
              ) : (
                <li>No hay pagos registrados.</li>
              )}
            </ul>
            <p className="saldo-restante">
              Saldo Restante: <strong>${(reservation.saldo_restante || 0).toLocaleString('es-AR')}</strong>
            </p>

            <div className="add-payment-form">
              <input
                type="number"
                placeholder="Monto del nuevo pago"
                value={newPayment.monto}
                onChange={handlePaymentChange}
              />
              <button onClick={handleAddPayment}>Añadir Pago</button>
            </div>
          </div>
        )}

        {!isCreating && (
          <div className="delete-section">
            <button onClick={handleDelete} className="btn-delete" disabled={isDeleting}>
              {isDeleting ? 'Eliminando...' : 'Eliminar Reserva'}
            </button>
          </div>
        )}

        {error && <p className="error-message">{error}</p>}
        {message && <p className="message-area">{message}</p>}
      </div>
    </div>
  );
}

export default EditReservationModal;