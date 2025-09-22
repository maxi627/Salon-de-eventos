import { useEffect, useState } from 'react';
import './UserList.css';

function UserList() {
  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  // 1. Estado para el término de búsqueda
  const [searchTerm, setSearchTerm] = useState('');

  const fetchUsers = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('/api/v1/usuario', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'No tienes permiso para ver los usuarios.');
      }
      const data = await response.json();
      setUsers(data.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  // 2. Lógica de eliminación de usuario
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

      // Actualiza el estado para reflejar la eliminación sin recargar
      setUsers(prevUsers => prevUsers.filter(user => user.id !== userId));

    } catch (err) {
      setError(err.message);
      // Ocultar el error después de unos segundos
      setTimeout(() => setError(''), 3000);
    }
  };

  // 3. Filtra los usuarios basándose en el término de búsqueda
  const filteredUsers = users.filter(user =>
    user.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.apellido.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) return <p style={{ textAlign: 'center', marginTop: '2rem' }}>Cargando usuarios...</p>;

  return (
    <div className="user-list-container">
      <h2 className="user-list-title">Gestión de Usuarios</h2>
      
      {/* 4. Campo de búsqueda */}
      <div className="search-bar-container">
        <input
          type="text"
          placeholder="Buscar por nombre o apellido..."
          className="search-input"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
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
              <th>Acciones</th> {/* <-- Nueva columna */}
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map(user => (
                <tr key={user.id}>
                  <td>{user.id}</td>
                  <td>{user.nombre}</td>
                  <td>{user.apellido}</td>
                  <td>{user.correo}</td>
                  <td>{user.dni}</td>
                  <td>{user.telefono || 'N/A'}</td>
                  <td>
                    {/* 5. Botón de eliminar */}
                    <button
                      className="btn-delete"
                      onClick={() => handleDelete(user.id)}
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="7">No se encontraron usuarios.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default UserList;