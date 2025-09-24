import { useEffect, useState } from 'react';
import './GastosManager.css';

function GastosManager() {
  const [gastos, setGastos] = useState([]);
  const [formData, setFormData] = useState({
    descripcion: '',
    monto: '',
    categoria: 'Servicios',
    fecha: new Date().toISOString().slice(0, 10),
  });
  
  // --- INICIO DE NUEVOS ESTADOS Y LÓGICA ---
  const [currentDate, setCurrentDate] = useState(new Date());
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchGastos = async () => {
    setIsLoading(true);
    const token = localStorage.getItem('authToken');
    // Obtenemos mes y año de la fecha actual en el estado
    const mes = currentDate.getMonth() + 1;
    const anio = currentDate.getFullYear();
    try {
      // Pasamos los parámetros a la API
      const response = await fetch(`/api/v1/gasto?mes=${mes}&anio=${anio}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al cargar gastos');
      setGastos(result.data);
    } catch (err) {
      setError(err.message);
      setGastos([]); // Limpiar gastos si hay error
    } finally {
      setIsLoading(false);
    }
  };

  // Este efecto se ejecutará cada vez que 'currentDate' cambie
  useEffect(() => {
    fetchGastos();
  }, [currentDate]);

  const changeMonth = (offset) => {
    setCurrentDate(prevDate => {
      return new Date(prevDate.getFullYear(), prevDate.getMonth() + offset, 1);
    });
  };
  // --- FIN DE NUEVOS ESTADOS Y LÓGICA ---

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('/api/v1/gasto', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
            ...formData,
            monto: parseFloat(formData.monto)
        }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al registrar el gasto');
      
      // Volvemos a buscar los gastos para actualizar la lista
      fetchGastos(); 
      setFormData({
        descripcion: '',
        monto: '',
        categoria: 'Servicios',
        fecha: new Date().toISOString().slice(0, 10),
      });

    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleDelete = async (gastoId) => {
    if (!window.confirm('¿Estás seguro de eliminar este gasto?')) return;
    const token = localStorage.getItem('authToken');
    try {
        const response = await fetch(`/api/v1/gasto/${gastoId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if(!response.ok) throw new Error('No se pudo eliminar el gasto');
        setGastos(gastos.filter(g => g.id !== gastoId));
    } catch(err) {
        setError(err.message);
    }
  }

  return (
    <div className="gastos-container">
      <h2 className="gastos-title">Gestión de Gastos</h2>
      <div className="gastos-content">
        <form onSubmit={handleSubmit} className="gasto-form">
          <h3>Registrar Nuevo Gasto</h3>
          <div className="form-group">
            <label>Descripción</label>
            <input type="text" name="descripcion" value={formData.descripcion} onChange={handleChange} required />
          </div>
          <div className="form-group">
            <label>Monto ($)</label>
            <input type="number" name="monto" value={formData.monto} onChange={handleChange} required min="0.01" step="0.01" />
          </div>
          <div className="form-group">
            <label>Categoría</label>
            <select name="categoria" value={formData.categoria} onChange={handleChange}>
              <option value="Servicios">Servicios</option>
              <option value="Insumos">Insumos</option>
              <option value="Otros">Otros</option>
            </select>
          </div>
          <div className="form-group">
            <label>Fecha</label>
            <input type="date" name="fecha" value={formData.fecha} onChange={handleChange} required />
          </div>
          <button type="submit" className="btn-save">Añadir Gasto</button>
          {error && <p className="error-message">{error}</p>}
        </form>
        <div className="gastos-list">
          {/* --- INICIO DE NUEVO NAVEGADOR --- */}
          <div className="gastos-header">
            <h3>Gastos Registrados</h3>
            <div className="month-navigator">
              <button onClick={() => changeMonth(-1)}>&lt;</button>
              <span className="month-display">
                {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)}>&gt;</button>
            </div>
          </div>
          {/* --- FIN DE NUEVO NAVEGADOR --- */}

          {isLoading ? <p>Cargando...</p> : (
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Descripción</th>
                  <th>Categoría</th>
                  <th>Monto</th>
                  <th>Acción</th>
                </tr>
              </thead>
              <tbody>
                {gastos.length > 0 ? (
                  gastos.map(gasto => (
                    <tr key={gasto.id}>
                      <td>{new Date(gasto.fecha).toLocaleDateString('es-ES', {timeZone: 'UTC'})}</td>
                      <td>{gasto.descripcion}</td>
                      <td>{gasto.categoria}</td>
                      <td>${gasto.monto.toLocaleString('es-AR')}</td>
                      <td><button className="btn-delete-gasto" onClick={() => handleDelete(gasto.id)}>Eliminar</button></td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="5">No se encontraron gastos para este mes.</td>
                  </tr>
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default GastosManager;