// Preguntas desplegables con <details>, sin estado propio.
export default function Accordion({ items }) {
  return (
    <div className="sv-acordeon">
      {items.map(({ pregunta, respuesta }) => (
        <details key={pregunta} className="sv-acordeon__item">
          <summary>{pregunta}</summary>
          <p>{respuesta}</p>
        </details>
      ))}
    </div>
  );
}
