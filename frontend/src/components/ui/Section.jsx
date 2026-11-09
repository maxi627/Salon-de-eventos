// Sección con contenedor centrado (1040 px máx.). fondo: "crema" | "blanco".
export default function Section({ id, titulo, bajada, fondo = 'crema', className = '', children }) {
  return (
    <section id={id} className={`sv-seccion sv-seccion--${fondo} ${className}`.trim()}>
      <div className="sv-contenedor">
        {titulo && <h2 className="sv-seccion__titulo">{titulo}</h2>}
        {bajada && <p className="sv-seccion__bajada">{bajada}</p>}
        {children}
      </div>
    </section>
  );
}
