import { useEffect, useState } from 'react';
import './EditReservationModal.css';

function EditReservationModal({ reservation, onClose, onUpdate, isCreating }) {
  const [localReservation, setLocalReservation] = useState(reservation);

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
  const [isProcessing, setIsProcessing] = useState(false); // Nuevo estado para bloquear botones

  // Sincronización protegida con el padre
  useEffect(() => {
    if (reservation && (!localReservation || reservation.id !== localReservation.id)) {
      setLocalReservation(reservation);
      setFormData({
        usuario_id: reservation.usuario?.id || '',
        fecha_dia: reservation.fecha?.dia || '',
        valor_alquiler: reservation.valor_alquiler || 0,
        estado: reservation.estado || 'confirmada',
      });
    }
  }, [reservation]);

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

  // Función infalible para recargar datos frescos
  const reloadData = async () => {
    const token = localStorage.getItem('authToken');
    try {
      // Agregamos timestamp para evitar caché del navegador
      const response = await fetch(`/api/v1/reserva/${localReservation.id}?t=${Date.now()}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await response.json();
      if (response.ok && result.data) {
        setLocalReservation(result.data);
        // También actualizamos el form por si el backend normalizó algún dato
        setFormData(prev => ({
            ...prev,
            valor_alquiler: result.data.valor_alquiler,
            estado: result.data.estado
        }));
      }
    } catch (err) {
      console.error("Error recargando datos:", err);
    }
  };

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

  // --- LÓGICA DE AÑADIR PAGO (ENCADENADA) ---
  const handleAddPayment = async () => {
    const montoAAgregar = parseFloat(newPayment.monto);

    if (!montoAAgregar || montoAAgregar <= 0) {
      setError('El monto del pago debe ser positivo.');
      return;
    }

    setError('');
    setMessage('Procesando cambios y pago...');
    setIsProcessing(true); // Bloqueamos para evitar doble click
    const token = localStorage.getItem('authToken');

    try {
      // PASO 1: Actualizar la Reserva (Precio/Estado)
      // Esto asegura que el backend tenga el "Valor Alquiler" nuevo antes de calcular saldos
      const updateResponse = await fetch(`/api/v1/reserva/${localReservation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            ...formData,
            valor_alquiler: parseFloat(formData.valor_alquiler) // Aseguramos que sea número
        }),
      });

      if (!updateResponse.ok) throw new Error('Error al guardar los cambios de la reserva.');

      // PASO 2: Crear el Pago
      const pagoResponse = await fetch(`/api/v1/reserva/${localReservation.id}/pagos`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ monto: montoAAgregar }),
      });

      const pagoResult = await pagoResponse.json();
      if (!pagoResponse.ok) throw new Error(pagoResult.message || 'Error al agregar el pago.');

      // PASO 3: Recargar TODO desde el servidor
      // Ya no hacemos cálculos manuales, confiamos en la DB
      await reloadData();

      setMessage('Pago registrado y datos actualizados.');
      setNewPayment({ monto: '' });
      
      // Notificar al padre
      if(onUpdate) onUpdate();

    } catch (err) {
      console.error(err);
      setError(err.message || 'Ocurrió un error inesperado.');
    } finally {
      setIsProcessing(false); // Desbloqueamos
    }
  };
  
  const handleDeletePayment = async (pagoId) => {
    const masterPassword = window.prompt("Ingresa la contraseña maestra para eliminar:");
    if (!masterPassword) return;

    setError('');
    setMessage('Eliminando pago...');
    setIsProcessing(true);
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

      if (!response.ok) {
          const res = await response.json();
          throw new Error(res.message || 'Error al eliminar pago.');
      }

      await reloadData(); // Recargamos para ver el saldo actualizado
      setMessage('Pago eliminado correctamente.');
      if(onUpdate) onUpdate();

    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('Guardando...');
    setIsProcessing(true);
    const token = localStorage.getItem('authToken');
    const { saldo_restante, ...dataToSend } = formData;

    const method = isCreating ? 'POST' : 'PUT';
    const url = isCreating ? '/api/v1/reserva/crear' : `/api/v1/reserva/${localReservation.id}`;

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
      
      setMessage('Guardado con éxito.');
      
      if (!isCreating) {
         await reloadData();
      } else {
         // Si es creación, cerramos o actualizamos según lógica del padre
         setTimeout(() => {
            if(onUpdate) onUpdate();
            onClose();
         }, 1000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleDelete = async () => {
    if (!window.confirm(`¿Archivar reserva del ${localReservation.fecha.dia}?`)) return;

    setIsDeleting(true);
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/v1/reserva/${localReservation.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });

      if (!response.ok) throw new Error('Error al archivar.');
      
      setMessage('Reserva archivada.');
      setTimeout(() => {
        if(onUpdate) onUpdate();
      }, 1000);
      
    } catch (err) {
      setError(err.message);
      setIsDeleting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>{isCreating ? 'Crear Nueva Reserva' : `Gestionar Reserva`}</h2>
        
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
            <button type="button" className="btn-close" onClick={onClose} disabled={isProcessing}>Cerrar</button>
            {/* Si no estamos creando, ocultamos este botón porque "Añadir Pago" ya guarda */}
            <button type="submit" className="btn-save" disabled={isProcessing}>
                {isProcessing ? 'Guardando...' : (isCreating ? 'Crear Reserva' : 'Guardar Cambios')}
            </button>
          </div>
        </form>

        {!isCreating && (
          <div className="payments-section">
            <h4>Pagos Registrados</h4>
            <ul className="payment-list">
              {localReservation && localReservation.pagos && localReservation.pagos.length > 0 ? (
                localReservation.pagos.map(pago => (
                  <li key={pago.id}>
                    <div>
                      <span>{new Date(pago.fecha_pago).toLocaleDateString('es-ES')}</span>
                      <strong> - ${(pago.monto || 0).toLocaleString('es-AR')}</strong>
                    </div>
                    <button 
                      className="btn-delete-pago" 
                      onClick={() => handleDeletePayment(pago.id)}
                      title="Eliminar pago"
                      disabled={isProcessing}
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
              Saldo Restante: <strong>${(localReservation?.saldo_restante || 0).toLocaleString('es-AR')}</strong>
            </p>

            <div className="add-payment-form">
              <input
                type="number"
                placeholder="Monto del nuevo pago"
                value={newPayment.monto}
                onChange={handlePaymentChange}
                min="0"
                disabled={isProcessing}
              />
              <button 
                type="button" 
                className="btn-add-payment" 
                onClick={handleAddPayment}
                disabled={isProcessing || !newPayment.monto}
              >
                {isProcessing ? 'Procesando...' : 'Añadir Pago y Guardar'}
              </button>
            </div>
          </div>
        )}

        {!isCreating && (
          <div className="delete-section">
            <button onClick={handleDelete} className="btn-delete" disabled={isDeleting || isProcessing}>
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