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
  
  const [currentDate, setCurrentDate] = useState(new Date());
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchGastos = async () => {
    setIsLoading(true);
    setError('');
    const token = localStorage.getItem('authToken');
    const mes = currentDate.getMonth() + 1;
    const anio = currentDate.getFullYear();
    try {
      const response = await fetch(`/api/v1/gasto?mes=${mes}&anio=${anio}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const contentType = response.headers.get("content-type");
      if (!response.ok) {
          if (contentType && contentType.indexOf("application/json") === -1) {
              throw new Error('El servidor no respondió correctamente. Inténtelo de nuevo.');
          }
          const errorData = await response.json();
          throw new Error(errorData.message || 'Error al cargar los gastos.');
      }

      const result = await response.json();
      setGastos(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err.message);
      setGastos([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGastos();
  }, [currentDate]);

  const changeMonth = (offset) => {
    setCurrentDate(prevDate => {
      return new Date(prevDate.getFullYear(), prevDate.getMonth() + offset, 1);
    });
  };

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
    <div className="gastos-container admin-section-fade">
      <div className="gastos-header-main">
        <h2 className="gastos-title">Control de Gastos</h2>
      </div>

      <div className="gastos-content">
        {/* COLUMNA IZQUIERDA: FORMULARIO */}
        <div className="gasto-form-card">
          <form onSubmit={handleSubmit} className="gasto-form">
            <h3><i className="fa-solid fa-file-invoice-dollar"></i> Registrar Nuevo Gasto</h3>
            
            <div className="form-group">
              <label>Descripción</label>
              <input type="text" name="descripcion" value={formData.descripcion} onChange={handleChange} required placeholder="Ej: Compra de insumos..." />
            </div>
            
            <div className="form-group">
              <label>Monto ($)</label>
              <input type="number" name="monto" value={formData.monto} onChange={handleChange} required min="0.01" step="0.01" placeholder="0.00" />
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
            
            <button type="submit" className="btn-save-gasto">
              <i className="fa-solid fa-plus"></i> Añadir Gasto
            </button>
            {error && <p className="error-message"><i className="fa-solid fa-triangle-exclamation"></i> {error}</p>}
          </form>
        </div>

        {/* COLUMNA DERECHA: TABLA DE GASTOS */}
        <div className="gastos-list-card">
          <div className="gastos-list-header">
            <h3>Gastos Registrados</h3>
            <div className="month-navigator">
              <button onClick={() => changeMonth(-1)}><i className="fa-solid fa-chevron-left"></i></button>
              <span className="month-display">
                {currentDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
              </span>
              <button onClick={() => changeMonth(1)}><i className="fa-solid fa-chevron-right"></i></button>
            </div>
          </div>

          <div className="gastos-table-wrapper">
            {isLoading ? (
              <div className="loading-state">
                <i className="fa-solid fa-circle-notch fa-spin"></i> Cargando...
              </div>
            ) : (
              <table className="gastos-table">
                <thead>
                  <tr>
                    <th>Fecha</th>
                    <th>Descripción</th>
                    <th>Categoría</th>
                    <th>Monto</th>
                    <th style={{textAlign: 'center'}}>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {gastos && gastos.length > 0 ? (
                    gastos.map(gasto => (
                      <tr key={gasto.id}>
                        <td>{gasto.fecha ? new Date(gasto.fecha).toLocaleDateString('es-ES', {timeZone: 'UTC'}) : '---'}</td>
                        <td className="desc-cell">{gasto.descripcion || 'Sin descripción'}</td>
                        <td>
                          <span className={`cat-badge ${gasto.categoria ? gasto.categoria.toLowerCase() : 'otros'}`}>
                            {gasto.categoria || 'General'}
                          </span>
                        </td>
                        <td className="amount-cell">${gasto.monto?.toLocaleString('es-AR') || '0,00'}</td>
                        <td style={{textAlign: 'center'}}>
                          <button className="btn-delete-gasto" onClick={() => handleDelete(gasto.id)} title="Eliminar gasto">
                            <i className="fa-solid fa-trash-can"></i>
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="empty-state">No se encontraron gastos para este mes.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default GastosManager;