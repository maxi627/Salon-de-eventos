import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Calendario from '../components/sitio/Calendario';
import ResumenFecha from '../components/sitio/ResumenFecha';
import '../components/sitio/calendario.css';
import Button from '../components/ui/Button';
import { useFechas } from '../hooks/useFechas';
import { useFeriados } from '../hooks/useFeriados';
import { esReservable, hoyLocal } from '../lib/fechas';
import { sesionValida } from '../lib/sesion';

function mesDe(texto) {
  const [anio, mes] = texto.split('-').map(Number);
  return { anio, mes: mes - 1 };
}

function Reservas() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const { porDia, isLoading, isError, refetch } = useFechas();
  const feriados = useFeriados();
  const hoy = hoyLocal();

  const pedida = params.get('fecha');
  // Una fecha inválida, pasada, de domingo u ocupada en la URL se ignora sin error.
  // Mientras cargan las fechas no se sabe si está ocupada: recién después se acepta.
  const seleccionada = !isLoading && !isError && pedida && esReservable(pedida, porDia[pedida], hoy) ? pedida : null;

  const [mes, setMes] = useState(() => mesDe(pedida && esReservable(pedida, undefined, hoy) ? pedida : hoy));

  const cambiarMes = (desplazamiento) => {
    setMes(({ anio, mes: m }) => {
      const fecha = new Date(anio, m + desplazamiento, 1);
      return { anio: fecha.getFullYear(), mes: fecha.getMonth() };
    });
  };

  const seleccionar = (texto) => setParams({ fecha: texto }, { replace: true });

  const reservar = () => {
    const destino = `/reservar/${seleccionada}`;
    if (sesionValida(localStorage.getItem('authToken'))) navigate(destino);
    else navigate(`/login?volver=${encodeURIComponent(destino)}`);
  };

  return (
    <div className="sv-contenedor sv-reservar">
      <header className="sv-reservar__encabezado">
        <h1>Elegí la fecha</h1>
        <p>
          De lunes a sábado, hasta 90 días adelante. Los precios son estimaciones base para 50 personas y pueden
          variar según el tipo de evento y el horario.
        </p>
      </header>

      <div className="sv-reservar__cuerpo">
        {isError ? (
          <div className="sv-tarjeta sv-reservar__error" role="alert">
            <p>No pudimos cargar el calendario.</p>
            <Button variant="secundario" onClick={() => refetch()}>Reintentar</Button>
          </div>
        ) : (
          <Calendario
            porDia={porDia}
            feriados={feriados}
            hoy={hoy}
            mes={mes}
            onCambiarMes={cambiarMes}
            seleccionada={seleccionada}
            onSeleccionar={seleccionar}
            cargando={isLoading}
          />
        )}

        <aside className="sv-reservar__lateral">
          {seleccionada ? (
            <ResumenFecha fecha={seleccionada} info={porDia[seleccionada]} feriado={feriados[seleccionada]} onReservar={reservar} />
          ) : (
            <div className="sv-reservar__ayuda">
              <p><strong>Tocá un día libre</strong> para ver el precio y la seña.</p>
              <p>La seña es el 30% del precio estimado y se paga por transferencia.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

export default Reservas;
