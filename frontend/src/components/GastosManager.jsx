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
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const fetchGastos = async () => {
    const token = localStorage.getItem('authToken');
    try {
      const response = await fetch('/api/v1/gasto', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || 'Error al cargar gastos');
      setGastos(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGastos();
  }, []);

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
      
      // Actualizar la lista de gastos y resetear el formulario
      setGastos([result.data, ...gastos]);
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
          <h3>Gastos Registrados</h3>
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
                {gastos.map(gasto => (
                  <tr key={gasto.id}>
                    <td>{new Date(gasto.fecha).toLocaleDateString('es-ES', {timeZone: 'UTC'})}</td>
                    <td>{gasto.descripcion}</td>
                    <td>{gasto.categoria}</td>
                    <td>${gasto.monto.toLocaleString('es-AR')}</td>
                    <td><button className="btn-delete-gasto" onClick={() => handleDelete(gasto.id)}>Eliminar</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

export default GastosManager;