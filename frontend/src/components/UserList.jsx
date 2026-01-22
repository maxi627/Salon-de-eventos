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
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el modal de reserva
  const [selectedReservation, setSelectedReservation] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10); 

  const fetchUsers = async () => {
    // setIsLoading(true); 
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
      setUsers(data.data); // data.data porque asumo que tu API devuelve { data: [...] }
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
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(''), 3000);
    }
  };

  // --- NUEVAS FUNCIONES PARA EL MODAL ---
  const handleViewReservation = (user) => {
    if (user.reservas && user.reservas.length > 0) {
        // MEJORA: Ordenamos por ID descendente para tomar siempre la más reciente
        // (Asumiendo que ID más alto = más reciente)
        const reservasOrdenadas = [...user.reservas].sort((a, b) => b.id - a.id);
        const ultimaReserva = reservasOrdenadas[0]; 
        
        // Inyectamos el objeto usuario dentro de la reserva
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

  // -------------------------------------

  const filteredUsers = users.filter(user =>
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );
  
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);
  
  const handleSearchChange = (e) => {
      setSearchTerm(e.target.value);
      setCurrentPage(1);
  };

  if (isLoading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando usuarios...</p>;

  return (
    <div className="user-list-container">
      <h2 className="user-list-title">Gestión de Usuarios</h2>
      
      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Buscar por nombre o apellido..."
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
              <th>Nombre</th>
              <th>Apellido</th>
              <th>Correo Electrónico</th>
              <th>DNI</th>
              <th>Teléfono</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {currentUsers.length > 0 ? (
              currentUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.nombre}</td>
                  <td>{user.apellido}</td>
                  <td>{user.correo}</td>
                  <td>{user.dni}</td>
                  <td>{user.telefono || 'N/A'}</td>
                  <td>
                    <div className="action-buttons">
                        {/* BOTÓN VER RESERVA - Solo aparece si tiene reservas */}
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
                <td colSpan="7">No se encontraron usuarios que coincidan con la búsqueda.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredUsers.length > usersPerPage && (
        <Pagination
            usersPerPage={usersPerPage}
            totalUsers={filteredUsers.length}
            paginate={paginate}
            currentPage={currentPage}
        />
      )}

      {/* RENDERIZADO DEL MODAL */}
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