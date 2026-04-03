import { useEffect, useState } from 'react';
import EditReservationModal from './EditReservationModal';
import './UserList.css';

// Componente para la paginación
const Pagination = ({ usersPerPage, totalUsers, paginate, currentPage }) => {
  const pageNumbers = [];
  for (let i = 1; i <= Math.ceil(totalUsers / usersPerPage); i++) {
    pageNumbers.push(i);
  }

  return (
    <nav className="pagination-container">
      <ul className="pagination">
        {pageNumbers.map(number => (
          <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
            <a onClick={() => paginate(number)} href="#!" className="page-link">
              {number}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
};

function UserList() {
  // Estado para guardar la lista original intacta (Caché local)
  const [allUsers, setAllUsers] = useState([]);
  // Estado para la tabla visible (lo que se renderiza y pagina)
  const [displayedUsers, setDisplayedUsers] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null); // Para el Debounce
  
  const [selectedReservation, setSelectedReservation] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10); 

  // --- NUEVA FUNCIÓN: CONTACTAR POR WHATSAPP DESDE LA LISTA ---
  const handleWhatsAppContact = (user) => {
    if (!user.telefono) {
      alert("Este cliente no tiene un teléfono registrado.");
      return;
    }

    // Limpiamos el número (quitamos espacios, guiones y paréntesis)
    const cleanPhone = user.telefono.replace(/\D/g, '');
    
    // Mensaje genérico profesional
    const texto = `Hola ${user.nombre}, te contacto del Salón de Eventos para coordinar detalles sobre tu consulta/reserva.`;
    
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(texto)}`;
    window.open(url, '_blank');
  };

  // Carga inicial (obtiene todos los usuarios de la caché de Redis del backend)
  const fetchUsers = async () => {
    setIsLoading(true); 
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('/api/v1/usuario', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No tienes permiso para ver los usuarios.');
      }
      const data = await response.json();
      setAllUsers(data.data); 
      setDisplayedUsers(data.data); // Por defecto, mostramos todos
    } catch (err) {
        console.error(err);
        setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este usuario? Esta acción no se puede deshacer.')) {
      return;
    }
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch(`/api/v1/usuario/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.message || 'Error al eliminar el usuario.');
      }
      // Actualizamos ambas listas localmente para evitar otra llamada a la API
      setAllUsers(prev => prev.filter(user => user.id !== userId));
      setDisplayedUsers(prev => prev.filter(user => user.id !== userId));
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleViewReservation = (user) => {
    if (user.reservas && user.reservas.length > 0) {
        const reservasOrdenadas = [...user.reservas].sort((a, b) => b.id - a.id);
        const ultimaReserva = reservasOrdenadas[0]; 
        const reservaConUsuario = { ...ultimaReserva, usuario: user };
        setSelectedReservation(reservaConUsuario);
    } else {
        alert("Este usuario no tiene reservas registradas visibles.");
    }
  };

  const handleCloseModal = () => {
    setSelectedReservation(null);
  };

  const handleUpdateList = () => {
    fetchUsers(); 
  };

  // --- BÚSQUEDA CON DEBOUNCE EN LA TABLA ---
  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setCurrentPage(1); // Siempre volvemos a la página 1 al buscar

    if (searchTimeout) clearTimeout(searchTimeout);

    if (term.trim().length >= 2) {
      setIsLoading(true);
      const timeoutId = setTimeout(async () => {
        const token = localStorage.getItem('authToken');
        try {
          // Buscamos usando el índice de la base de datos
          const response = await fetch(`/api/v1/usuario/buscar?q=${encodeURIComponent(term)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const result = await response.json();
          if (response.ok) {
            setDisplayedUsers(result.data || []);
          }
        } catch (err) {
          console.error("Error en búsqueda:", err);
        } finally {
          setIsLoading(false);
        }
      }, 300);
      setSearchTimeout(timeoutId);
    } else if (term.trim().length === 0) {
      // Si borra el input, restauramos la lista original al instante (sin llamar a la API)
      setDisplayedUsers(allUsers);
    } else {
      // Si hay solo 1 letra, filtramos localmente para no bombardear el backend
      const localFilter = allUsers.filter(user =>
        `${user.nombre} ${user.apellido} ${user.dni}`.toLowerCase().includes(term.toLowerCase())
      );
      setDisplayedUsers(localFilter);
    }
  };

  // Paginación sobre los usuarios mostrados actualmente
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = displayedUsers.slice(indexOfFirstUser, indexOfLastUser);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  return (
    <div className="user-list-container">
      <h2 className="user-list-title">Gestión de Usuarios</h2>
      
      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Buscar por nombre, apellido o DNI..."
          className="search-input"
          value={searchTerm}
          onChange={handleSearchChange}
        />
      </div>

      {error && <p className="error-message" style={{ textAlign: 'center' }}>{error}</p>}
      
      <div className="table-container">
        <table className="user-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Cliente</th>
              <th>DNI</th>
              <th>Correo Electrónico</th>
              <th>Teléfono</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Cargando datos...</td>
              </tr>
            ) : currentUsers.length > 0 ? (
              currentUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td><strong>{user.apellido}, {user.nombre}</strong></td>
                  <td>{user.dni}</td>
                  <td>{user.correo}</td>
                  <td>{user.telefono || 'N/A'}</td>
                  <td>
                    <div className="action-buttons">
                        {/* BOTÓN WHATSAPP: Solo si tiene teléfono */}
                        {user.telefono && (
                          <button 
                            className="btn-whatsapp"
                            onClick={() => handleWhatsAppContact(user)}
                            title="Enviar mensaje de WhatsApp"
                          >
                            🟢 WA
                          </button>
                        )}

                        {user.reservas && user.reservas.length > 0 && (
                            <button 
                                className="btn-view-reserva"
                                onClick={() => handleViewReservation(user)}
                                title="Ver Última Reserva"
                            >
                                📅 Ver
                            </button>
                        )}

                        <button
                          className="btn-delete"
                          onClick={() => handleDelete(user.id)}
                          title="Eliminar Usuario"
                        >
                          🗑️
                        </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="6" style={{ textAlign: 'center' }}>No se encontraron usuarios que coincidan con la búsqueda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {!isLoading && displayedUsers.length > usersPerPage && (
        <Pagination
            usersPerPage={usersPerPage}
            totalUsers={displayedUsers.length}
            paginate={paginate}
            currentPage={currentPage}
        />
      )}

      {selectedReservation && (
        <EditReservationModal
          reservation={selectedReservation}
          onClose={handleCloseModal}
          onUpdate={handleUpdateList}
          isCreating={false}
        />
      )}
    </div>
  );
}

export default UserList;