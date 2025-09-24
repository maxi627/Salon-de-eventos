import { jwtDecode } from 'jwt-decode';
import { useEffect, useState } from 'react';
import { FaGamepad, FaSwimmingPool, FaUtensils } from 'react-icons/fa';
import { useNavigate } from 'react-router-dom';
import MiReserva from '../components/MiReserva';
import PhotoGallery from '../components/PhotoGallery';
import './home.css';

function Home() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [reservas, setReservas] = useState([]);

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

      {/* --- SECCIÓN "SOBRE NOSOTROS" (TEXTO ACTUALIZADO) --- */}
      <section className="about-section">
        <div className="about-content">
          <div className="about-text">
            <h2>Bienvenidos a Nuestro Salón</h2>
            <p>
              Olvídate de las complicaciones. Te ofrecemos un espacio privado y totalmente equipado, pensado para tu disfrute. Tienes todo lo necesario para tu celebración: una cocina completa, un amplio espacio interior y un fantástico parque con pileta. Además, ¡la diversión está incluida!
            </p>
          </div>
          <div className="about-image">
            {/* REEMPLAZA ESTA IMAGEN CON UNA FOTO DEL EXTERIOR DEL SALÓN */}
            <img src="../foto_salon.jpg" alt="Exterior del salón de eventos" />
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
      {/* La sección de "Mis Reservas" solo aparece si el usuario está logueado y tiene reservas */}
      {user && reservas.length > 0 && <MiReserva reservas={reservas} />}
    </div>
  );
}

export default Home;