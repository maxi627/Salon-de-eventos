import { useEffect, useRef } from 'react';
import { FaMoon, FaWhatsapp } from 'react-icons/fa6';
import { whatsappConTexto } from '../../content/salon';
import { descuentoPorcentaje, estadoDelDia, estadoNoche, formatoFechaLarga, formatoPesos, montoSena, precioDe, precioNormalDe } from '../../lib/fechas';
import { TURNOS, textoWhatsappNoche } from '../../lib/turnos';
import Button from '../ui/Button';

const TOMADO = { pendiente: 'pendiente', ocupado: 'ocupado' };

// Resumen de la fecha elegida, por turno: el día se reserva online (precio, seña y botón);
// la noche, si está libre, se consulta por WhatsApp.
export default function ResumenFecha({ fecha, info, feriado, hoy, onReservar }) {
  const ref = useRef(null);
  const precio = precioDe(info);
  const sena = montoSena(precio);
  const descuento = descuentoPorcentaje(info);
  const dia = estadoDelDia(fecha, info, hoy);
  const noche = estadoNoche(fecha, info, hoy);

  // En el celular el resumen queda abajo del calendario: lo traemos a la vista.
  useEffect(() => {
    ref.current?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [fecha]);

  const titulo = formatoFechaLarga(fecha);

  return (
    <div ref={ref} className="sv-resumen" aria-live="polite">
      <p className="sv-resumen__fecha">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</p>
      {feriado && <p className="sv-resumen__feriado">Feriado: {feriado.nombre}</p>}

      <section className="sv-resumen__turno">
        <h3 className="sv-resumen__turno-titulo">Día · {TURNOS.dia.texto}</h3>
        {dia === 'libre' ? (
          <>
            <dl className="sv-resumen__datos">
              <div>
                <dt>{descuento ? <>Precio de oferta <span className="sv-resumen__chip">{descuento}% menos</span></> : 'Precio estimado'}</dt>
                <dd>
                  {descuento && (
                    <s className="sv-resumen__antes">
                      <span className="sv-solo-lector">Antes </span>
                      {formatoPesos(precioNormalDe(info))}
                    </s>
                  )}
                  {precio ? formatoPesos(precio) : 'Precio a confirmar'}
                </dd>
              </div>
              <div>
                <dt>Seña para reservar (30%)</dt>
                <dd>{sena ? formatoPesos(sena) : 'A confirmar por WhatsApp'}</dd>
              </div>
            </dl>
            <Button onClick={onReservar} className="sv-resumen__boton">Reservar esta fecha</Button>
          </>
        ) : (
          <p className="sv-resumen__tomado">Turno día {TOMADO[dia] ?? 'no disponible'}</p>
        )}
      </section>

      {noche && (
        <section className="sv-resumen__turno sv-resumen__turno--noche">
          <h3 className="sv-resumen__turno-titulo"><FaMoon aria-hidden="true" /> Noche · {TURNOS.noche.texto}</h3>
          {noche === 'libre' ? (
            <>
              <p className="sv-resumen__noche-libre">Libre · precio a consultar</p>
              <Button
                variant="secundario"
                href={whatsappConTexto(textoWhatsappNoche(fecha))}
                target="_blank"
                rel="noopener noreferrer"
                className="sv-resumen__boton"
              >
                <FaWhatsapp aria-hidden="true" /> Consultar la noche por WhatsApp
              </Button>
            </>
          ) : (
            <p className="sv-resumen__tomado">Turno noche {TOMADO[noche]}</p>
          )}
        </section>
      )}
    </div>
  );
}
