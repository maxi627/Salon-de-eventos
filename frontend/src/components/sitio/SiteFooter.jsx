import { FaFacebook, FaInstagram, FaWhatsapp } from 'react-icons/fa6';
import { Link } from 'react-router-dom';
import { SALON } from '../../content/salon';
import './sitio-layout.css';

export default function SiteFooter() {
  return (
    <footer className="sv-pie">
      <div className="sv-pie__contenido">
        <div>
          <p className="sv-pie__nombre">{SALON.nombre}</p>
          <p>{SALON.direccion}, {SALON.ciudad}</p>
          <p>{SALON.horario}</p>
        </div>

        <div className="sv-pie__redes">
          <a href={SALON.whatsappUrl} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp">
            <FaWhatsapp aria-hidden="true" /> {SALON.whatsappTexto}
          </a>
          <a href={SALON.redes.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook">
            <FaFacebook aria-hidden="true" /> Facebook
          </a>
          <a href={SALON.redes.instagram} target="_blank" rel="noopener noreferrer" aria-label="Instagram">
            <FaInstagram aria-hidden="true" /> Instagram
          </a>
        </div>

        <div className="sv-pie__legales">
          <Link to="/arrepentimiento">Botón de arrepentimiento</Link>
          <a href={SALON.defensaConsumidorUrl} target="_blank" rel="noopener noreferrer">
            Defensa de las y los Consumidores
          </a>
          <Link to="/privacidad">Privacidad</Link>
        </div>
      </div>
      <p className="sv-pie__copy">© {new Date().getFullYear()} {SALON.nombre}</p>
    </footer>
  );
}
