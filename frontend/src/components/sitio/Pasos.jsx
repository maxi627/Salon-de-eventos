import { FaCheck } from 'react-icons/fa6';

// Indicador de pasos: actual es 1, 2 o 3.
export default function Pasos({ actual, etiquetas }) {
  return (
    <ol className="sv-indicador-pasos" aria-label="Pasos de la reserva">
      {etiquetas.map((etiqueta, i) => {
        const numero = i + 1;
        const estado = numero < actual ? 'hecho' : numero === actual ? 'actual' : 'pendiente';
        return (
          <li key={etiqueta} className={`sv-indicador-pasos__paso sv-indicador-pasos__paso--${estado}`} aria-current={estado === 'actual' ? 'step' : undefined}>
            {estado === 'hecho' ? <FaCheck aria-hidden="true" /> : <span aria-hidden="true">{numero} ·</span>} {etiqueta}
          </li>
        );
      })}
    </ol>
  );
}
