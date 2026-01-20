import { useCallback, useEffect, useState } from 'react';
import './PriceEditor.css';

const DAYS_OF_WEEK = [
  { label: 'Dom', value: 0 }, { label: 'Lun', value: 1 }, { label: 'Mar', value: 2 },
  { label: 'Mié', value: 3 }, { label: 'Jue', value: 4 }, { label: 'Vie', value: 5 }, { label: 'Sáb', value: 6 },
];

function PriceEditor() {
  const [mode, setMode] = useState('calendar'); // 'calendar', 'individual', 'bulk'
  const [selectedDate, setSelectedDate] = useState('');
  const [fechaData, setFechaData] = useState(null);
  const [price, setPrice] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [monthPrices, setMonthPrices] = useState({});

  // --- 1. CARGAR TODOS LOS PRECIOS ---
  const fetchAllPrices = useCallback(async () => {
    try {
      const response = await fetch('/api/v1/fecha');
      const result = await response.json();
      if (response.ok) {
        const pricesMap = {};
        result.data.forEach(item => {
          pricesMap[item.dia] = { id: item.id, valor: item.valor_estimado };
        });
        setMonthPrices(pricesMap);
      }
    } catch (err) {
      console.error("Error al cargar mapa de precios:", err);
    }
  }, []);

  useEffect(() => {
    fetchAllPrices();
  }, [fetchAllPrices]);

  // --- 2. BUSCAR FECHA ESPECÍFICA (Manual o Clic) ---
  const handleManualSearch = async (date) => {
    setSelectedDate(date);
    if (!date) {
      setFechaData(null);
      setPrice('');
      return;
    }

    try {
      setIsLoading(true);
      setError('');
      const response = await fetch(`/api/v1/fecha/by-date/${date}`);
      const result = await response.json();
      
      if (response.ok && result.data) {
        setFechaData(result.data);
        setPrice(result.data.valor_estimado || '0');
      } else {
        setFechaData(null);
        setPrice('0');
        setError("Esta fecha no está configurada en la base de datos.");
      }
    } catch (err) {
      setError("Error al conectar con el servidor.");
    } finally {
      setIsLoading(false);
    }
  };

  // --- 3. GUARDAR PRECIO INDIVIDUAL ---
  const handleSaveIndividual = async (e) => {
    e.preventDefault();
    if (!fechaData) return;

    setIsLoading(true);
    setMessage('');
    setError('');

    try {
      const response = await fetch(`/api/v1/fecha/${fechaData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: JSON.stringify({
          dia: fechaData.dia,
          valor_estimado: parseFloat(price)
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.message || "Error al actualizar");

      await fetchAllPrices(); 
      setMessage(`¡Precio de ${fechaData.dia} actualizado!`);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- 4. ACTUALIZACIÓN MASIVA (Lógica corregida) ---
  const [bulkDay, setBulkDay] = useState(0);
  const [bulkMonths, setBulkMonths] = useState(3);

  const handleSaveBulk = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
    setError('');
    const token = localStorage.getItem('authToken');

    const targetDates = [];
    const start = new Date();
    const end = new Date();
    end.setMonth(end.getMonth() + parseInt(bulkMonths));

    let curr = new Date(start);
    while (curr <= end) {
      if (curr.getDay() === parseInt(bulkDay)) {
        targetDates.push(curr.toISOString().split('T')[0]);
      }
      curr.setDate(curr.getDate() + 1);
    }

    try {
      let count = 0;
      for (const d of targetDates) {
        // Buscamos si la fecha existe en nuestro mapa local primero
        const existing = monthPrices[d];
        if (existing) {
          await fetch(`/api/v1/fecha/${existing.id}`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json', 
              'Authorization': `Bearer ${token}` 
            },
            body: JSON.stringify({ dia: d, valor_estimado: parseFloat(price) }),
          });
          count++;
        }
      }
      await fetchAllPrices();
      setMessage(`Se actualizaron ${count} fechas con éxito.`);
    } catch (err) {
      setError("Error en proceso masivo: " + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // --- LÓGICA DE DIBUJO DEL CALENDARIO ---
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysAmount = new Date(year, month + 1, 0).getDate();
  const daysArray = [...Array(daysAmount).keys()].map(i => i + 1);
  const blanks = [...Array(firstDay).keys()];

  return (
    <div className="price-editor-container admin-section-fade">
      <div className="price-editor-header">
        <h3>Gestión de Tarifas</h3>
        <div className="mode-selector">
          <button className={mode === 'calendar' ? 'active' : ''} onClick={() => setMode('calendar')}>📅 Calendario</button>
          <button className={mode === 'individual' ? 'active' : ''} onClick={() => setMode('individual')}>✏️ Individual</button>
          <button className={mode === 'bulk' ? 'active' : ''} onClick={() => setMode('bulk')}>🚀 Masivo</button>
        </div>
      </div>

      {mode === 'calendar' && (
        <div className="calendar-view">
          <div className="calendar-controls">
            <button onClick={() => setCurrentMonth(new Date(year, month - 1, 1))}>◀</button>
            <h4>{currentMonth.toLocaleString('es-ES', { month: 'long', year: 'numeric' }).toUpperCase()}</h4>
            <button onClick={() => setCurrentMonth(new Date(year, month + 1, 1))}>▶</button>
          </div>
          
          <div className="calendar-grid">
            {DAYS_OF_WEEK.map(d => <div key={d.value} className="calendar-day-label">{d.label}</div>)}
            {blanks.map((_, i) => <div key={`b-${i}`} className="calendar-cell blank"></div>)}
            {daysArray.map(day => {
              const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const dayData = monthPrices[dateStr];
              
              return (
                <div key={day} className="calendar-cell" onClick={() => {
                  setMode('individual');
                  handleManualSearch(dateStr);
                }}>
                  <span className="day-number">{day}</span>
                  {dayData ? (
                    <span className="price-tag">${dayData.valor.toLocaleString('es-AR')}</span>
                  ) : (
                    <span className="price-missing">Sin precio</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'individual' && (
        <div className="manual-edit-section">
          <h4>Actualizar Día Específico</h4>
          <form className="price-editor-form" onSubmit={handleSaveIndividual}>
            <div className="form-group">
              <label>Seleccionar Fecha</label>
              <input type="date" value={selectedDate} onChange={(e) => handleManualSearch(e.target.value)} />
            </div>
            <div className="form-group">
              <label>Nuevo Precio ($)</label>
              <input 
                type="number" 
                value={price} 
                onChange={(e) => setPrice(e.target.value)} 
                disabled={!fechaData}
                placeholder="0"
              />
            </div>
            <div className="action-buttons">
              <button type="submit" className="btn-save" disabled={isLoading || !fechaData}>
                {isLoading ? 'Guardando...' : 'Confirmar Cambios'}
              </button>
              <button type="button" className="btn-cancel" onClick={() => setMode('calendar')}>Volver</button>
            </div>
          </form>
          {!fechaData && selectedDate && !isLoading && (
            <p className="error-text">La fecha seleccionada no existe en la base de datos.</p>
          )}
        </div>
      )}

      {mode === 'bulk' && (
        <div className="manual-edit-section">
          <h4>Actualización en Bloque</h4>
          <form className="price-editor-form" onSubmit={handleSaveBulk}>
            <div className="form-group">
              <label>Día de la semana</label>
              <select value={bulkDay} onChange={(e) => setBulkDay(e.target.value)}>
                {DAYS_OF_WEEK.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Rango (meses)</label>
              <select value={bulkMonths} onChange={(e) => setBulkMonths(e.target.value)}>
                <option value="1">1 Mes</option>
                <option value="3">3 Meses</option>
                <option value="6">6 Meses</option>
              </select>
            </div>
            <div className="form-group">
              <label>Nuevo Precio ($)</label>
              <input type="number" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            </div>
            <div className="action-buttons">
              <button type="submit" className="btn-save" disabled={isLoading || !price}>
                {isLoading ? 'Procesando...' : 'Aplicar a todos'}
              </button>
              <button type="button" className="btn-cancel" onClick={() => setMode('calendar')}>Cancelar</button>
            </div>
          </form>
        </div>
      )}

      {(message || error) && (
        <div className={`message-toast ${message ? 'success' : 'error'}`}>
          <p>{message || error}</p>
          <button className="btn-close-toast" onClick={() => {setMessage(''); setError('')}}>✕</button>
        </div>
      )}
    </div>
  );
}

export default PriceEditor;