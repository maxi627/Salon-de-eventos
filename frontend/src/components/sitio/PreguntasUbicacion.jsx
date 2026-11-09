import { FaLocationDot } from 'react-icons/fa6';
import { PREGUNTAS, SALON } from '../../content/salon';
import Accordion from '../ui/Accordion';
import Section from '../ui/Section';

export default function PreguntasUbicacion() {
  return (
    <Section className="sv-preguntas-ubicacion">
      <div className="sv-dos-columnas">
        <div>
          <h2>Preguntas frecuentes</h2>
          <Accordion items={PREGUNTAS} />
        </div>
        <div id="ubicacion">
          <h2>Dónde estamos</h2>
          <p className="sv-ubicacion__direccion">
            <FaLocationDot aria-hidden="true" /> {SALON.direccion}, {SALON.ciudad}
          </p>
          <iframe
            className="sv-ubicacion__mapa"
            src={SALON.mapaEmbedUrl}
            title={`Mapa: ${SALON.direccion}, San Rafael`}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      </div>
    </Section>
  );
}
