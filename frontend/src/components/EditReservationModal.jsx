import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import './EditReservationModal.css';

function EditReservationModal({ reservation, onClose, onUpdate, isCreating }) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    usuario_id: reservation?.usuario?.id || '',
    fecha_dia: reservation?.fecha?.dia || '',
    valor_alquiler: reservation?.valor_alquiler || 0,
    estado: reservation?.estado || 'confirmada',
  });

  const [localReservation, setLocalReservation] = useState(reservation);
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
    fetchUsers();
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
        `${user.nombre} ${user.apellido} ${user.dni}`.toLowerCase().includes(term.toLowerCase())
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
    if (montoAAgregar > localReservation.saldo_restante) {
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
      
      const nuevoPago = {
        id: result.pago?.id || result.id || Date.now(),
        monto: montoAAgregar,
        fecha_pago: result.pago?.fecha_pago || result.fecha_pago || new Date().toISOString()
      };

      setLocalReservation(prev => ({
        ...prev,
        pagos: [...(prev.pagos || []), nuevoPago],
        saldo_restante: prev.saldo_restante - montoAAgregar
      }));

      await onUpdate(); 
      setMessage('Pago añadido con éxito.');
      setNewPayment({ monto: '' });
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleDeletePayment = async (pagoId) => {
    const masterPassword = window.prompt("Para eliminar este pago, por favor ingresa la contraseña maestra:");
    if (!masterPassword) return;

    setError('');
    setMessage('');
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/v1/pago/${pagoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ master_password: masterPassword })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al eliminar el pago.');

      const pagoEliminado = localReservation.pagos.find(p => p.id === pagoId);
      const montoRecuperado = pagoEliminado ? parseFloat(pagoEliminado.monto) : 0;

      setLocalReservation(prev => ({
        ...prev,
        pagos: prev.pagos.filter(p => p.id !== pagoId),
        saldo_restante: prev.saldo_restante + montoRecuperado
      }));

      await onUpdate();
      setMessage('Pago eliminado correctamente.');
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
      await onUpdate();
      queryClient.invalidateQueries({ queryKey: ['fechas'] });
      onClose();
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm(`¿Estás seguro de que quieres archivar la reserva?`)) return;
    setIsDeleting(true);
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`/api/v1/reserva/${reservation.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Error al archivar.');
      setMessage('¡Reserva archivada!');
      await onUpdate();
      queryClient.invalidateQueries({ queryKey: ['fechas'] });
      onClose();
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <h2>{isCreating ? 'Crear Nueva Reserva' : `Gestionar Reserva`}</h2>

      {/* --- Sección de Comprobante de Pago --- */}
      {!isCreating && localReservation?.comprobante_url && (
        <div className="receipt-view-section">
          <div className="receipt-header-row">
            <h4>Comprobante de Solicitud</h4>
            <span className="receipt-status-badge">Adjunto</span>
          </div>
          <div className="receipt-action-container">
            <a
              href={`/uploads/comprobantes/${localReservation.comprobante_url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="receipt-action-btn"
            >
              <span className="icon">📄</span>
              <div className="text-content">
                <span className="main-text">Abrir Comprobante de Transferencia</span>
                <span className="sub-text">Se abrirá en una nueva pestaña (Imagen/PDF)</span>
              </div>
              <span className="external-link-icon">↗</span>
            </a>
          </div>
        </div>
      )}

        {!isCreating && localReservation?.usuario && (
          <p><strong>Usuario:</strong> {localReservation.usuario.nombre} {localReservation.usuario.apellido}</p>
        )}
        
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
                  placeholder="Buscar por nombre o DNI..."
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
            <button type="submit" className="btn-save">
              {isCreating ? 'Crear Reserva' : 'Guardar Cambios'}
            </button>
          </div>
        </form>

        {!isCreating && (
          <div className="payments-section">
            <h4>Pagos Registrados</h4>
            <ul className="payment-list">
              {localReservation.pagos && localReservation.pagos.length > 0 ? (
                localReservation.pagos.map(pago => (
                  <li key={pago.id}>
                    <div>
                      <span>{new Date(pago.fecha_pago).toLocaleDateString('es-ES')}</span>
                      <strong> - ${(pago.monto || 0).toLocaleString('es-AR')}</strong>
                    </div>
                    <button className="btn-delete-pago" onClick={() => handleDeletePayment(pago.id)} title="Eliminar pago">&times;</button>
                  </li>
                ))
              ) : (
                <li className="no-payments">No hay pagos registrados.</li>
              )}
            </ul>
            <p className="saldo-restante">
              Saldo Restante: <strong>${(localReservation.saldo_restante || 0).toLocaleString('es-AR')}</strong>
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
        {message && <p className="message-area" style={{color: 'green', textAlign: 'center', marginTop: '10px'}}>{message}</p>}
      </div>
    </div>
  );
}

export default EditReservationModal;