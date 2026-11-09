import './formularios.css';

// Tarjeta centrada para formularios y páginas de texto. ancho: "angosto" (440 px) | "ancho" (720 px).
export default function TarjetaFormulario({ titulo, bajada, ancho = 'angosto', children }) {
  return (
    <div className={`sv-contenedor sv-pagina-formulario sv-pagina-formulario--${ancho}`}>
      <div className="sv-tarjeta sv-tarjeta-formulario">
        <h1>{titulo}</h1>
        {bajada && <p className="sv-tarjeta-formulario__bajada">{bajada}</p>}
        {children}
      </div>
    </div>
  );
}
