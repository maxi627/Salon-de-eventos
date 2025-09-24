import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
// --- LÍNEA CORREGIDA ---
import { FaClock, FaGamepad, FaMapMarkerAlt, FaSwimmingPool, FaUtensils } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import MiReserva from '../components/MiReserva';
import PhotoGallery from '../components/PhotoGallery';
import './home.css';
function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);
  const [showReservas, setShowReservas] = useState(false); // 1. ESTADO PARA CONTROLAR VISIBILIDAD

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    if (token) {
      try {
        const decodedToken = jwtDecode(token);
        setUser(decodedToken);
        fetchReservas(token);
      } catch (error) {
        console.error("Error al decodificar el token:", error);
      }
    }
  }, []);

  const fetchReservas = async (token) => {
    try {
      const response = await fetch('/api/v1/reserva/mis-reservas', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      const data = await response.json();
      if (response.ok) {
        setReservas(data.data);
      }
    } catch (error) {
      console.error("Error al obtener las reservas:", error);
    }
  };


  const handleReserveClick = () => {
    navigate('/reservar');
  };

  // 2. FUNCIÓN PARA MOSTRAR/OCULTAR EL PANEL
  const toggleReservas = () => {
    setShowReservas(prev => !prev);
  };

  return (
    <div className="home-container">
      {/* --- SECCIÓN HERO (IMAGEN PRINCIPAL) --- */}
      <section className="hero-section">
        <div className="hero-content">
          <h1>Tu Evento Soñado, Hecho Realidad</h1>
          <p>Calidad, elegancia y un servicio excepcional para tus momentos más especiales.</p>
          <button onClick={handleReserveClick} className="hero-button">Reserva Ahora</button>
        </div>
      </section>

      <section className="about-section">
        <div className="about-content">
          <div className="about-text">
            <h2>Bienvenidos a Nuestro Salón</h2>
            <p>
              Olvídate de las complicaciones. Te ofrecemos un espacio privado y totalmente equipado, pensado para tu disfrute. Tienes todo lo necesario para tu celebración: una cocina completa, un amplio espacio interior y un fantástico parque con pileta. Además, ¡la diversión está incluida!
            </p>
          </div>
          <div className="about-image">
            {/* ASEGÚRATE DE QUE LA RUTA A TU IMAGEN SEA CORRECTA DESDE LA CARPETA `public` */}
            <img src="../public/foto_salon.jpg" alt="Exterior del salón de eventos" />
          </div>
        </div>
      </section>
      <section className="location-section">
        <div className="location-content">
          <div className="location-info">
            <h2 className="section-title">Ubicación y Horarios</h2>
            <div className="info-item">
              <FaMapMarkerAlt className="info-icon" />
              <div>
                <h3>Dirección</h3>
                <p>Bolivar 1425, San Rafael, Mendoza, Argentina </p>
              </div>
            </div>
            <div className="info-item">
              <FaClock className="info-icon" />
              <div>
                <h3>Horarios de Alquiler</h3>
                <p>Lunes a Domingos: 11:00 a 20:00 hs</p>
                <p>Turnos de noche: Consultar</p>
              </div>
            </div>
          </div>
          <div className="location-map">
            <iframe
              src='https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d820.6631743855417!2d-68.31195903039101!3d-34.63821589490476!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9679a9bd44f1ea6d%3A0xf07b4cc0a177c032!2sSal%C3%B3n%20de%20eventos!5e0!3m2!1ses-419!2sar!4v1758735908958!5m2!1ses-419!2sar'
              width="100%"
              height="100%"
              style={{ border: 0 }}
              allowFullScreen=""
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </div>
      </section>

      {/* --- SECCIÓN DE SERVICIOS --- */}
       <section className="services-section">
        <h2 className="section-title">¿Qué Incluye el Alquiler?</h2>
        <div className="services-grid">
          <div className="service-item">
            <FaUtensils className="service-icon" />
            <h3>Salón Totalmente Equipado</h3>
            <p>Incluye sillas, mesones, cocina completa con heladera, freezer, pava eléctrica y 4 baños.</p>
          </div>
          <div className="service-item">
            <FaGamepad className="service-icon" />
            <h3>Diversión Asegurada</h3>
            <p>Disfruta de mesa de pool, ping pong, metegol y máquinas de videojuegos arcade para todas las edades.</p>
          </div>
          <div className="service-item">
            <FaSwimmingPool className="service-icon" />
            <h3>Amplios Exteriores</h3>
            <p>Contamos con un gran parque, pileta para la temporada de verano y cocheras privadas para tu comodidad.</p>
          </div>
        </div>
      </section>
      <section className="gallery-section">
        <h2 className="section-title">Fotos del Salón</h2>
        <PhotoGallery />
      </section>

      {/* --- 3. NUEVA LÓGICA PARA EL BOTÓN Y PANEL FLOTANTE --- */}
      {user && reservas.length > 0 && (
        <>
          <button onClick={toggleReservas} className="mis-reservas-button">
            Mis Reservas
          </button>
          {showReservas && <MiReserva reservas={reservas} onClose={toggleReservas} />}
        </>
      )}
    </div>
  );
}

export default Home;