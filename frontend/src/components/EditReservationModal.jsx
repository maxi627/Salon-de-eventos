import { useEffect, useState } from 'react';
import './EditReservationModal.css';

function EditReservationModal({ reservation, onClose, onUpdate, isCreating }) {
  const [formData, setFormData] = useState({
    usuario_id: reservation?.usuario?.id || '',
    fecha_dia: reservation?.fecha?.dia || '',
    valor_alquiler: reservation?.valor_alquiler || 0,
    estado: reservation?.estado || 'confirmada',
  });

  const [users, setUsers] = useState([]);
  const [userSearchTerm, setUserSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [showUserList, setShowUserList] = useState(false);

  const [newPayment, setNewPayment] = useState({ monto: '' });
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

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
          if (!isCreating && reservation?.usuario) {
            setUserSearchTerm(`${reservation.usuario.nombre} ${reservation.usuario.apellido}`);
          }
        }
      } catch (err) {
        console.error("Failed to fetch users:", err);
      }
    };
    if (isCreating || !isCreating) {
      fetchUsers();
    }
  }, [isCreating, reservation]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUserSearch = (e) => {
    const term = e.target.value;
    setUserSearchTerm(term);
    if (term) {
      const filtered = users.filter(user =>
        `${user.nombre} ${user.apellido}`.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredUsers(filtered);
      setShowUserList(true);
    } else {
      setFilteredUsers([]);
      setShowUserList(false);
    }
  };

  const handleUserSelect = (user) => {
    setFormData(prev => ({ ...prev, usuario_id: user.id }));
    setUserSearchTerm(`${user.nombre} ${user.apellido} (ID: ${user.id})`);
    setShowUserList(false);
  };

  const handlePaymentChange = (e) => {
    setNewPayment({ monto: e.target.value });
  };

  const handleAddPayment = async () => {
    const montoAAgregar = parseFloat(newPayment.monto);

    if (!montoAAgregar || montoAAgregar <= 0) {
      setError('El monto del pago debe ser un número positivo.');
      return;
    }
    
    if (montoAAgregar > reservation.saldo_restante) {
      setError('El pago no puede ser mayor que el saldo restante.');
      return;
    }
    
    setError('');
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`/api/v1/reserva/${reservation.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ monto: montoAAgregar }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);
      
      setMessage('Pago añadido con éxito.');
      setNewPayment({ monto: '' });
      onUpdate(); 
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleDeletePayment = async (pagoId) => {
    const masterPassword = window.prompt("Para eliminar este pago, por favor ingresa la contraseña maestra:");

    if (!masterPassword) {
      return;
    }

    setError('');
    setMessage('');
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/v1/pago/${pagoId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ master_password: masterPassword })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al eliminar el pago.');

      setMessage('Pago eliminado correctamente.');
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
    if (!window.confirm(`¿Estás seguro de que quieres archivar la reserva del ${reservation.fecha.dia}? Esta acción no se puede deshacer.`)) {
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
      if (!response.ok) throw new Error(result.message || 'Error al archivar la reserva.');
      
      setMessage('¡Reserva archivada con éxito!');
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
              <label htmlFor="usuario_search">Usuario</label>
              <div className="user-search-container">
                <input
                  type="text"
                  id="usuario_search"
                  value={userSearchTerm}
                  onChange={handleUserSearch}
                  placeholder="Buscar por nombre..."
                  autoComplete="off"
                  className="user-search-input"
                  onBlur={() => setTimeout(() => setShowUserList(false), 200)}
                />
                {showUserList && filteredUsers.length > 0 && (
                  <ul className="user-search-results">
                    {filteredUsers.map(user => (
                      <li key={user.id} onClick={() => handleUserSelect(user)}>
                        {user.nombre} {user.apellido} (DNI: {user.dni})
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
          
          <div className="form-group">
            <label htmlFor="fecha_dia">Fecha del Evento</label>
            <input type="date" name="fecha_dia" value={formData.fecha_dia} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label htmlFor="valor_alquiler">Valor del Alquiler</label>
            <input type="number" name="valor_alquiler" value={formData.valor_alquiler} onChange={handleChange} min="0" />
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
                    <div>
                      <span>{new Date(pago.fecha_pago).toLocaleDateString('es-ES')}</span>
                      <strong> - ${(pago.monto || 0).toLocaleString('es-AR')}</strong>
                    </div>
                    <button 
                      className="btn-delete-pago" 
                      onClick={() => handleDeletePayment(pago.id)}
                      title="Eliminar pago"
                    >
                      &times;
                    </button>
                  </li>
                ))
              ) : (
                <li className="no-payments">No hay pagos registrados.</li>
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
                min="0"
              />
              <button type="button" className="btn-add-payment" onClick={handleAddPayment}>Añadir Pago</button>
            </div>
          </div>
        )}

        {!isCreating && (
          <div className="delete-section">
            <button onClick={handleDelete} className="btn-delete" disabled={isDeleting}>
              {isDeleting ? 'Archivando...' : 'Archivar Reserva'}
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