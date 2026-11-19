import { Link } from 'react-router-dom';
import { useFechas } from '../../hooks/useFechas';
import { formatoFechaLarga, formatoPesos, hoyLocal, precioDe, precioNormalDe, descuentoPorcentaje } from '../../lib/fechas';
import { ofertasVisibles } from '../../lib/ofertas';
import Button from '../ui/Button';

// Bloque destacado del inicio con la fecha en oferta más próxima (solo si hay alguna).
export default function BannerOferta() {
  const { fechas, isLoading, isError } = useFechas();
  if (isLoading || isError) return null;

  const ofertas = ofertasVisibles(fechas, hoyLocal());
  if (ofertas.length === 0) return null;

  const [oferta] = ofertas;
  const titulo = formatoFechaLarga(oferta.dia);
  const descuento = descuentoPorcentaje(oferta);
  const mas = ofertas.length - 1;

  return (
    <section className="sv-oferta" aria-labelledby="sv-oferta-titulo">
      <div className="sv-contenedor">
        <div className="sv-oferta__tarjeta">
          <p className="sv-oferta__etiqueta">
            <span aria-hidden="true">🔥</span> Fecha en oferta{descuento ? ` · ${descuento}% menos` : ''}
          </p>
          <h2 id="sv-oferta-titulo" className="sv-oferta__fecha">{titulo.charAt(0).toUpperCase() + titulo.slice(1)}</h2>
          <p className="sv-oferta__precios">
            <span className="sv-oferta__precio">{formatoPesos(precioDe(oferta))}</span>
            {descuento && (
              <s className="sv-oferta__antes">
                <span className="sv-solo-lector">Antes </span>
                {formatoPesos(precioNormalDe(oferta))}
              </s>
            )}
          </p>
          <div className="sv-oferta__acciones">
            <Button variant="claro" to={`/reservar?fecha=${oferta.dia}`} className="sv-oferta__boton">
              Reservar esta fecha
            </Button>
            {mas > 0 && (
              <Link to="/reservar" className="sv-oferta__mas">
                +{mas} {mas === 1 ? 'oferta más' : 'ofertas más'}
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
