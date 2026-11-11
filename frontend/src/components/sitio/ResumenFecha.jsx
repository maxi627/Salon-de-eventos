import { useEffect, useRef } from 'react';
import { formatoFechaLarga, formatoPesos, montoSena, precioDe } from '../../lib/fechas';
import Button from '../ui/Button';

// Resumen de la fecha elegida: precio, seña y el botón para seguir.
export default function ResumenFecha({ fecha, info, feriado, onReservar }) {
  const ref = useRef(null);
  const precio = precioDe(info);
  const sena = montoSena(precio);

  // En el celular el resumen queda abajo del calendario: lo traemos a la vista.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [fecha]);

  const titulo = formatoFechaLarga(fecha);

  return (
    <div ref={ref} className="sv-resumen" aria-live="polite">
      <p className="sv-resumen__fecha">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</p>
      {feriado && <p className="sv-resumen__feriado">Feriado: {feriado.nombre}</p>}
      <dl className="sv-resumen__datos">
        <div>
          <dt>Precio estimado</dt>
          <dd>{precio ? formatoPesos(precio) : 'Precio a confirmar'}</dd>
        </div>
        <div>
          <dt>Seña para reservar (30%)</dt>
          <dd>{sena ? formatoPesos(sena) : 'A confirmar por WhatsApp'}</dd>
        </div>
      </dl>
      <Button onClick={onReservar} className="sv-resumen__boton">Reservar esta fecha</Button>
    </div>
  );
}
