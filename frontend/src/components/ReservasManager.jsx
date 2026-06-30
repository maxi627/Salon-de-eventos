import { useState } from 'react';
import { useReservas } from '../hooks/useAdminData';
import ArchivedReservations from './ArchivedReservations';
import EditReservationModal from './EditReservationModal';
import Pagination from './Pagination'; // Importamos el nuevo componente
import './ReservasManager.css';
const ReservasManager = () => {
  const { data: reservas = {}, isLoading, error, refetch } = useReservas();
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedReservation, setSelectedReservation] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [showArchived, setShowArchived] = useState(false);

  // --- FILTROS ---
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  
  const [statusFilter, setStatusFilter] = useState('todas');
  const [monthFilter, setMonthFilter] = useState('todos');
  
  // Estado para mostrar u ocultar reservas pasadas
  const [showPastReservations, setShowPastReservations] = useState(false);
  
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Obtener la fecha de hoy en formato YYYY-MM-DD para comparar strings
  const today = new Date().toISOString().split('T')[0];

  const formatDisplayDate = (isoDate) => {
    if (!isoDate) return 'N/A';
    const dateParts = isoDate.split('-');
    const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
    return new Intl.DateTimeFormat('es-ES', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC'
    }).format(date);
  };

  const handleSearchChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setCurrentPage(1);
    if (searchTimeout) clearTimeout(searchTimeout);

    if (term.trim().length >= 2) {
      setIsSearching(true);
      const timeoutId = setTimeout(async () => {
        const token = localStorage.getItem('authToken');
        try {
          const response = await fetch(`/api/v1/reserva/buscar?q=${encodeURIComponent(term)}`, {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          const result = await response.json();
          if (response.ok) setSearchResults(result.data || []);
        } catch (err) {
          console.error("Error:", err);
        } finally { setIsSearching(false); }
      }, 300);
      setSearchTimeout(timeoutId);
    } else {
      setSearchResults(null);
    }
  };

  const availableMonths = Object.keys(reservas || {});
  let listToRender = [];
  
  if (searchResults !== null) {
    listToRender = searchResults;
  } else if (monthFilter !== 'todos') {
    listToRender = reservas[monthFilter] || [];
  } else {
    listToRender = availableMonths.reduce((acc, month) => [...acc, ...reservas[month]], []);
  }

  // --- FILTRO CRUCIAL: Solo próximas o incluir pasadas ---
  if (!showPastReservations && searchResults === null) {
    listToRender = listToRender.filter(r => r.fecha?.dia >= today);
  }

  if (statusFilter !== 'todas') {
    listToRender = listToRender.filter(r => r.estado === statusFilter);
  }

  listToRender.sort((a, b) => new Date(a.fecha?.dia || 0) - new Date(b.fecha?.dia || 0));

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = listToRender.slice(indexOfFirstItem, indexOfLastItem);

  if (error) return <div className="error-message">Error cargando reservas: {error.message}</div>;

  return (
    <div className="admin-section-fade">
      {/* CABECERA LIMPIA */}
      <div className="reservas-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--border-dark)', paddingBottom: '1rem' }}>
        <h2 className="section-title" style={{ margin: 0, fontSize: '1.4rem', color: 'var(--text-primary)' }}>Gestión de Reservas</h2>
        <button className="btn-create" onClick={() => { setSelectedReservation(null); setIsCreating(true); setIsModalOpen(true); }}>
          <i className="fa-solid fa-plus"></i> Nueva Reserva
        </button>
      </div>

      {showArchived && <ArchivedReservations />}

      {/* BARRA DE FILTROS UNIFICADA */}
      <div className="filters-toolbar">
        <div className="filters-inputs">
          <input
            type="text"
            placeholder="Buscar cliente, DNI o fecha..."
            className="search-input toolbar-input"
            value={searchTerm}
            onChange={handleSearchChange}
          />
          
          <select className="toolbar-select" value={monthFilter} onChange={(e) => { setMonthFilter(e.target.value); setCurrentPage(1); }} disabled={searchResults !== null}>
            <option value="todos">Todos los meses</option>
            {availableMonths.map(month => (
              <option key={month} value={month}>{month.charAt(0).toUpperCase() + month.slice(1)}</option>
            ))}
          </select>

          <select className="toolbar-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
            <option value="todas">Todos los estados</option>
            <option value="confirmada">Confirmadas</option>
            <option value="pendiente">Pendientes</option>
          </select>
        </div>

        {/* CONTROLES DE HISTORIAL AGRUPADOS */}
        <div className="toggle-group">
          <label className="show-past-toggle">
            <input 
              type="checkbox" 
              checked={showPastReservations} 
              onChange={(e) => setShowPastReservations(e.target.checked)} 
            />
            <span>Ver pasadas</span>
          </label>

          <label className="show-past-toggle">
            <input 
              type="checkbox" 
              checked={showArchived} 
              onChange={(e) => setShowArchived(e.target.checked)} 
            />
            <span>Ver archivadas</span>
          </label>
        </div>
      </div>

      <div className="table-container">
        <table className="reservas-table user-table">
          <thead>
            <tr>
              <th>Fecha del Evento</th>
              <th>Cliente</th>
              <th>Estado</th>
              <th>Alquiler</th>
              <th>Saldo Pendiente</th>
              <th style={{textAlign: 'center'}}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>Cargando reservas...</td></tr>
            ) : isSearching ? (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem'}}>Buscando...</td></tr>
            ) : currentItems.length > 0 ? (
              currentItems.map(reserva => (
                <tr key={reserva.id} className={reserva.fecha?.dia < today ? 'row-past-reservation' : ''}>
                  <td data-label="Fecha del Evento"><strong>{formatDisplayDate(reserva.fecha?.dia)}</strong></td>
                  <td data-label="Cliente">{`${reserva.usuario?.nombre || ''} ${reserva.usuario?.apellido || ''}`}</td>
                  <td data-label="Estado">
                    <span className={`status-badge ${reserva.estado}`}>
                      {reserva.estado}
                    </span>
                  </td>
                  <td data-label="Alquiler">${(reserva.valor_alquiler || 0).toLocaleString('es-AR')}</td>
                  <td data-label="Saldo Pendiente" style={{ fontWeight: reserva.saldo_restante > 0 ? 'bold' : 'normal', color: reserva.saldo_restante > 0 ? '#ef4444' : '#10b981' }}>
                    ${(reserva.saldo_restante || 0).toLocaleString('es-AR')}
                  </td>
                  <td data-label="Acciones" style={{textAlign: 'center'}}>
                    <button className="btn-view-reserva" onClick={() => { setSelectedReservation(reserva); setIsCreating(false); setIsModalOpen(true); }}>
                      <i className="fa-solid fa-pen-to-square"></i> Gestionar
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="6" style={{textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)'}}>No hay reservas que coincidan.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {!isSearching && (
        <Pagination 
          itemsPerPage={itemsPerPage} 
          totalItems={listToRender.length} 
          paginate={setCurrentPage} 
          currentPage={currentPage} 
        />
      )}

      {isModalOpen && (
        <EditReservationModal 
          isCreating={isCreating} 
          reservation={selectedReservation} 
          onClose={() => setIsModalOpen(false)} 
          onUpdate={refetch} 
        />
      )}
    </div>
  );
};

export default ReservasManager;