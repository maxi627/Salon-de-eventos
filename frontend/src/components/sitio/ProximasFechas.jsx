import { FaWhatsapp } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { SALON } from '../../content/salon';
import { useFechas } from '../../hooks/useFechas';
import { formatoPesos, hoyLocal, precioDe, proximasFechasLibres } from '../../lib/fechas';
import Button from '../ui/Button';
import Section from '../ui/Section';

function partes(texto) {
  const [y, m, d] = texto.split('-').map(Number);
  const fecha = new Date(y, m - 1, d);
  return {
    diaSemana: fecha.toLocaleDateString('es-AR', { weekday: 'long' }),
    diaMes: `${d} ${fecha.toLocaleDateString('es-AR', { month: 'short' }).replace('.', '')}`,
  };
}

export default function ProximasFechas() {
  const { fechas, isLoading, isError } = useFechas();
  const proximas = proximasFechasLibres(fechas, hoyLocal());
  const sinFechas = !isLoading && (isError || proximas.length === 0);

  return (
    <Section
      id="fechas"
      fondo="blanco"
      titulo="Próximas fechas libres"
      bajada={sinFechas ? undefined : 'Viernes y sábados primero. Tocá una para reservarla.'}
    >
      {sinFechas ? (
        <div className="sv-fechas__vacio">
          <p>Consultá disponibilidad por WhatsApp y te contamos qué fechas quedan.</p>
          <Button variant="secundario" href={SALON.whatsappUrl} target="_blank" rel="noopener noreferrer">
            <FaWhatsapp aria-hidden="true" /> Consultar por WhatsApp
          </Button>
        </div>
      ) : (
        <>
          <ul className="sv-fechas" aria-busy={isLoading}>
            {isLoading
              ? Array.from({ length: 5 }, (_, i) => (
                  <li key={i} aria-hidden="true"><div className="sv-fecha sv-fantasma" /></li>
                ))
              : proximas.map((f) => {
                  const { diaSemana, diaMes } = partes(f.dia);
                  return (
                    <li key={f.dia}>
                      <Link to={`/reservar?fecha=${f.dia}`} className="sv-fecha">
                        <span className="sv-fecha__dia">{diaSemana}</span>
                        <span className="sv-fecha__fecha">{diaMes}</span>
                        <span className="sv-fecha__precio">{formatoPesos(precioDe(f))}</span>
                      </Link>
                    </li>
                  );
                })}
          </ul>
          <Link to="/reservar" className="sv-fechas__todas">Ver el calendario completo →</Link>
        </>
      )}
    </Section>
  );
}
