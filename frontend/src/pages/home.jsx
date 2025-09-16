import './home.css';
function Home() {
  return (
    <>
      <section className="home">
        <img src="/public/foto_home.webp" alt="" />
        <div>
            <h1>Bienvenidos a nuestro Salón de Eventos</h1>
            <p>Donde tus momentos se vuelven inolvidables</p>
            <button>Reserva Ahora</button>
        </div>
      </section>
    </>
  );
}

export default Home;