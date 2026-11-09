import { FaWhatsapp } from 'react-icons/fa6';
import { FOTO_HERO } from '../../content/fotos';
import { SALON } from '../../content/salon';
import Button from '../ui/Button';
import Chip from '../ui/Chip';

const ETIQUETAS = ['Hasta 50 personas', 'Pileta en verano', 'Parrilla', 'Pool, ping pong y arcade'];

export default function HeroInicio() {
  return (
    <section className="sv-hero">
      <img
        className="sv-hero__foto"
        src={FOTO_HERO.src}
        srcSet={FOTO_HERO.srcSet}
        sizes="100vw"
        alt=""
        fetchPriority="high"
        width={FOTO_HERO.ancho}
        height={FOTO_HERO.alto}
      />
      <div className="sv-hero__velo" aria-hidden="true" />
      <div className="sv-hero__contenido">
        <h1>Tu evento con parque, pileta y parrilla</h1>
        <p className="sv-hero__bajada">
          Un salón para hasta 50 personas en San Rafael, de lunes a sábado de 11 a 20 hs. Mirá las fechas
          libres con su precio y reservá online.
        </p>
        <div className="sv-hero__botones">
          <Button to="/reservar">Ver fechas y precios</Button>
          <Button variant="claro" href={SALON.whatsappUrl} target="_blank" rel="noopener noreferrer">
            <FaWhatsapp aria-hidden="true" /> WhatsApp
          </Button>
        </div>
        <div className="sv-hero__etiquetas">
          {ETIQUETAS.map((e) => <Chip key={e}>{e}</Chip>)}
        </div>
      </div>
    </section>
  );
}
