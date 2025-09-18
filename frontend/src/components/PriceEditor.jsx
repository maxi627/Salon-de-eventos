import { useState } from 'react';
import './PriceEditor.css';

function PriceEditor() {
  const [selectedDate, setSelectedDate] = useState('');
  const [fechaData, setFechaData] = useState(null);
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleDateChange = async (e) => {
    const date = e.target.value;
    setSelectedDate(date);
    if (!date) {
      setFechaData(null);
      setPrice('');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      setMessage('');
      const response = await fetch(`/api/v1/fecha/by-date/${date}`);
      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setFechaData(result.data);
      setPrice(result.data.valor_estimado || '0');
    } catch (err) {
      setError(err.message);
      setFechaData(null);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSavePrice = async (e) => {
    e.preventDefault();
    if (!fechaData) {
      setError('Primero debes seleccionar una fecha.');
      return;
    }
    
    setIsLoading(true);
    setError('');
    setMessage('');
    const token = localStorage.getItem('authToken');

    try {
      const response = await fetch(`/api/v1/fecha/${fechaData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          dia: fechaData.dia,
          valor_estimado: parseFloat(price)
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message);

      setMessage(`¡Precio para el ${fechaData.dia} guardado con éxito!`);
      setFechaData(result.data); // Actualizamos con los datos devueltos

    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="price-editor-container">
      <h3>Gestionar Precios por Día</h3>
      <form className="price-editor-form" onSubmit={handleSavePrice}>
        <div className="form-group">
          <label htmlFor="date-picker">Selecciona una Fecha</label>
          <input
            type="date"
            id="date-picker"
            value={selectedDate}
            onChange={handleDateChange}
          />
        </div>

        {selectedDate && (
          <div className="form-group">
            <label htmlFor="price-input">Precio Estimado ($)</label>
            <input
              type="number"
              id="price-input"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="Ej: 50000"
              min="0"
              step="0.01"
              disabled={isLoading || !fechaData}
            />
          </div>
        )}
        
        <button type="submit" disabled={isLoading || !fechaData}>
          {isLoading ? 'Guardando...' : 'Guardar Precio'}
        </button>
      </form>
      {message && <p className="message-area">{message}</p>}
      {error && <p className="error-message">{error}</p>}
    </div>
  );
}

export default PriceEditor;