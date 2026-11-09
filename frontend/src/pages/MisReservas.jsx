import { FaWhatsapp } from 'react-icons/fa6';
import { Navigate } from 'react-router-dom';
import Button from '../components/ui/Button';
import { whatsappConTexto } from '../content/salon';
import { useMisReservas } from '../hooks/useAdminData';
import { formatoFechaLarga, formatoPesos, hoyLocal, sumarDias } from '../lib/fechas';
import { sesionValida } from '../lib/sesion';
import './mis-reservas.css';

const ESTADOS = {
  pendiente: { texto: 'En revisión', clase: 'pendiente' },
  confirmada: { texto: 'Confirmada', clase: 'confirmada' },
  cancelada: { texto: 'Cancelada', clase: 'cancelada' },
};

function capitalizar(texto) {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function TarjetaReserva({ reserva }) {
  const estado = ESTADOS[reserva.estado] ?? { texto: reserva.estado, clase: 'cancelada' };
  const fechaLarga = formatoFechaLarga(reserva.fecha.dia);
  const total = Number(reserva.valor_alquiler) || 0;
  const saldo = Math.min(Math.max(Number(reserva.saldo_restante) || 0, 0), total);
  const pagado = total - saldo;
  const porcentaje = total > 0 ? Math.round((pagado / total) * 100) : 0;

  return (
    <li className="sv-tarjeta sv-mi-reserva">
      <div className="sv-mi-reserva__cabecera">
        <h2>{capitalizar(fechaLarga)}</h2>
        <span className={`sv-insignia sv-insignia--${estado.clase}`}>{estado.texto}</span>
      </div>

      {reserva.estado === 'confirmada' && (
        <>
          <div
            className="sv-barra"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={porcentaje}
            aria-label={`Pagado ${porcentaje}%`}
          >
            <span style={{ width: `${porcentaje}%` }} />
          </div>
          <dl className="sv-mi-reserva__montos">
            <div><dt>Pagado</dt><dd className="sv-mi-reserva__pagado">{formatoPesos(pagado)}</dd></div>
            <div><dt>Saldo</dt><dd>{formatoPesos(saldo)} de {formatoPesos(total)}</dd></div>
          </dl>
          {saldo > 0 && (
            <>
              <p className="sv-mi-reserva__nota">El saldo lo podés transferir cuando quieras; avisanos por WhatsApp.</p>
              <Button
                variant="secundario"
                href={whatsappConTexto(`Hola, quiero avisar un pago de mi reserva del ${fechaLarga}.`)}
                target="_blank"
                rel="noopener noreferrer"
                className="sv-mi-reserva__boton"
              >
                <FaWhatsapp aria-hidden="true" /> Avisar un pago por WhatsApp
              </Button>
            </>
          )}
        </>
      )}

      {reserva.estado === 'pendiente' && (
        <p className="sv-mi-reserva__nota">Estamos revisando tu comprobante. Te avisamos por correo cuando se confirme.</p>
      )}
    </li>
  );
}

function MisReservas() {
  const sesion = sesionValida(localStorage.getItem('authToken'));
  const { data: respuesta, isLoading, isError, refetch } = useMisReservas();

  if (!sesion) return <Navigate to="/login?volver=%2Fmis-reservas" replace />;

  // Futuras y pasadas de hace 15 días o menos, sin las archivadas.
  const desde = sumarDias(hoyLocal(), -15);
  const reservas = (respuesta?.data ?? [])
    .filter((r) => r.fecha?.dia && r.estado !== 'archivada' && r.fecha.dia >= desde)
    .sort((a, b) => a.fecha.dia.localeCompare(b.fecha.dia));

  return (
    <div className="sv-contenedor sv-mis-reservas">
      <h1>Mis reservas</h1>
      <p className="sv-mis-reservas__saludo">
        {sesion.nombre ? `Hola, ${sesion.nombre}. ` : ''}Acá ves el estado de tus fechas.
      </p>

      {isLoading && (
        <ul className="sv-mis-reservas__lista" aria-busy="true">
          {[0, 1].map((i) => <li key={i} className="sv-fantasma sv-mi-reserva--fantasma" />)}
        </ul>
      )}

      {isError && (
        <div className="sv-tarjeta sv-mis-reservas__vacio" role="alert">
          <p>No pudimos cargar tus reservas.</p>
          <Button variant="secundario" onClick={() => refetch()}>Reintentar</Button>
        </div>
      )}

      {!isLoading && !isError && reservas.length === 0 && (
        <div className="sv-tarjeta sv-mis-reservas__vacio">
          <p>Todavía no tenés reservas.</p>
          <Button to="/reservar">Ver fechas libres</Button>
        </div>
      )}

      {!isLoading && !isError && reservas.length > 0 && (
        <ul className="sv-mis-reservas__lista">
          {reservas.map((r) => <TarjetaReserva key={r.id} reserva={r} />)}
        </ul>
      )}
    </div>
  );
}

export default MisReservas;
