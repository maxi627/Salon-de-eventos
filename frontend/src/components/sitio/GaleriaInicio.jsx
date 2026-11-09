import { useState } from 'react';
import Lightbox from 'yet-another-react-lightbox';
import 'yet-another-react-lightbox/styles.css';
import { FOTOS, FOTOS_GRILLA } from '../../content/fotos';
import Section from '../ui/Section';

const SLIDES = FOTOS.map((f) => ({ src: f.src, alt: f.alt, width: f.ancho, height: f.alto }));

export default function GaleriaInicio() {
  const [indice, setIndice] = useState(-1);
  const ultima = FOTOS_GRILLA.length - 1;

  return (
    <Section id="fotos" titulo="Fotos">
      <div className="sv-galeria">
        {FOTOS_GRILLA.map((i, posicion) => {
          const foto = FOTOS[i];
          const clases = posicion === 0 ? 'sv-galeria__foto sv-galeria__foto--grande' : 'sv-galeria__foto';
          return (
            <button
              key={foto.src}
              type="button"
              className={clases}
              onClick={() => setIndice(posicion === ultima ? 0 : i)}
              aria-label={posicion === ultima ? `Ver las ${FOTOS.length} fotos` : `Ampliar: ${foto.alt}`}
            >
              <img
                src={foto.src}
                srcSet={foto.srcSet}
                sizes="(min-width: 720px) 50vw, 100vw"
                alt=""
                loading="lazy"
              />
              {posicion === ultima && <span className="sv-galeria__mas">Ver las {FOTOS.length} fotos</span>}
            </button>
          );
        })}
      </div>
      <Lightbox open={indice >= 0} index={indice} close={() => setIndice(-1)} slides={SLIDES} />
    </Section>
  );
}
