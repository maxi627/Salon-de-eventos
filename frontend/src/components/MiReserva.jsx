import { FaTimes } from 'react-icons/fa'; // Ícono para el botón de cerrar
import './MiReserva.css';

const MiReserva = ({ reservas, onClose }) => {

    // Función para formatear la fecha de manera legible
    const formatDisplayDate = (isoDate) => {
        if (!isoDate) return 'Fecha no disponible';
        // Aseguramos que la fecha se interprete como UTC para evitar problemas de zona horaria
        const date = new Date(isoDate + 'T00:00:00Z');
        return new Intl.DateTimeFormat('es-ES', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            timeZone: 'UTC'
        }).format(date);
    };

    // Objeto para mapear los estados de la reserva a clases de CSS para los colores
    const statusClasses = {
        'pendiente': 'status-pendiente',
        'confirmada': 'status-confirmada',
        'cancelada': 'status-cancelada'
    };

    return (
        <div className="mi-reserva-wrapper">
            <div className="mi-reserva-header">
                <h2 className="mi-reserva-title">Tus Reservas</h2>
                <button onClick={onClose} className="close-button">
                    <FaTimes />
                </button>
            </div>
            <div className="mi-reserva-grid">
                {reservas.map(reserva => (
                    <div key={reserva.id} className="reserva-card-modern">
                        <div className="reserva-header">
                            <span className="reserva-date">{formatDisplayDate(reserva.fecha.dia)}</span>
                            <span className={`reserva-status ${statusClasses[reserva.estado] || ''}`}>
                                {reserva.estado}
                            </span>
                        </div>
                        <div className="reserva-body">
                            <div className="reserva-info-item">
                                <span className="info-label">Valor Total</span>
                                <span className="info-value">${(reserva.valor_alquiler || 0).toLocaleString('es-AR')}</span>
                            </div>
                            <div className="reserva-info-item saldo">
                                <span className="info-label">Saldo Pendiente</span>
                                <span className="info-value">${(reserva.saldo_restante || 0).toLocaleString('es-AR')}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MiReserva;