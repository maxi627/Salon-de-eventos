import { PASOS_RESERVA } from '../../content/salon';
import Section from '../ui/Section';

export default function ComoReservar() {
  return (
    <Section id="como-reservar" titulo="Cómo se reserva" bajada="Todo online, en unos minutos.">
      <ol className="sv-pasos-reserva">
        {PASOS_RESERVA.map(({ titulo, detalle }) => (
          <li key={titulo}>
            <strong>{titulo}</strong>
            <span>{detalle}</span>
          </li>
        ))}
      </ol>
    </Section>
  );
}
