import { QUE_INCLUYE, QUE_LLEVAR } from '../../content/salon';
import Section from '../ui/Section';

export default function QueIncluye() {
  return (
    <Section id="que-incluye" titulo="Qué incluye el alquiler" bajada={`Todo esto está incluido. ${QUE_LLEVAR}`}>
      <ul className="sv-incluye">
        {QUE_INCLUYE.map(({ icono, titulo, detalle }) => {
          const Icono = icono;
          return (
            <li key={titulo} className="sv-incluye__item">
              <Icono className="sv-incluye__icono" aria-hidden="true" />
              <strong>{titulo}</strong>
              <span>{detalle}</span>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}
