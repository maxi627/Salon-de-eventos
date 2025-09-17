import { useNavigate } from 'react-router-dom'; // 1. Importa el hook useNavigate
import './home.css';

function Home() {
  const navigate = useNavigate(); // 2. Inicializa el hook

  const handleReserveClick = () => {
    // 3. Esta función nos llevará a la página de reservas
    navigate('./reservar');
  };

  return (
    <>
      <section className="home">
        <img src="/foto_home.webp" alt="Gente celebrando en un evento" />
        <div>
            <h1>Bienvenidos a nuestro Salón de Eventos</h1>
            <p>Donde tus momentos se vuelven inolvidables</p>
            {/* 4. Llama a la función cuando se hace clic en el botón */}
            <button onClick={handleReserveClick}>Reserva Ahora</button>
        </div>
      </section>
    </>
  );
}

export default Home;