import { FaChevronLeft, FaChevronRight, FaMoon, FaRegMoon } from 'react-icons/fa6';
import { etiquetaDelDia } from '../../lib/calendario';
import { DIAS_MAXIMOS, esElegible, estaEnOferta, estadoDelDia, estadoNoche, formatoPesos, precioDe, sumarDias } from '../../lib/fechas';

const DIAS_SEMANA = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
const NOMBRES_DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const ETIQUETA_VISIBLE = { pendiente: 'Pendiente', ocupado: 'Ocupado', domingo: 'No se alquila' };

function textoDe(anio, mes, dia) {
  return `${anio}-${String(mes + 1).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

function precioCorto(valor) {
  return valor >= 1000 ? `$${Math.round(valor / 1000)}k` : formatoPesos(valor);
}

// mes: { anio, mes } con mes 0-11. feriados: { 'YYYY-MM-DD': { nombre, ... } } (opcional).
export default function Calendario({ porDia, feriados = {}, hoy, mes, onCambiarMes, seleccionada, onSeleccionar, cargando }) {
  const [anioHoy, mesHoy] = hoy.split('-').map(Number);
  const [anioMax, mesMax] = sumarDias(hoy, DIAS_MAXIMOS).split('-').map(Number);
  const indice = (a, m) => a * 12 + m;
  const puedeAtras = indice(mes.anio, mes.mes) > indice(anioHoy, mesHoy - 1);
  const puedeAdelante = indice(mes.anio, mes.mes) < indice(anioMax, mesMax - 1);

  const primerDia = new Date(mes.anio, mes.mes, 1).getDay();
  const diasDelMes = new Date(mes.anio, mes.mes + 1, 0).getDate();
  const titulo = new Date(mes.anio, mes.mes, 1).toLocaleDateString('es-AR', { month: 'long', year: 'numeric' });
  const tituloMes = titulo.charAt(0).toUpperCase() + titulo.slice(1);

  const celdas = [];
  let hayOfertas = false;
  for (let i = 0; i < primerDia; i += 1) celdas.push(<div key={`vacio-${i}`} aria-hidden="true" />);
  for (let dia = 1; dia <= diasDelMes; dia += 1) {
    const texto = textoDe(mes.anio, mes.mes, dia);
    if (cargando) {
      celdas.push(<div key={texto} className="sv-dia sv-fantasma" aria-hidden="true" />);
      continue;
    }
    const info = porDia[texto];
    const estado = estadoDelDia(texto, info, hoy);
    const precio = precioDe(info);
    const libre = estado === 'libre';
    // Turno noche: se muestra con una luna; si el día está tomado y la noche libre, igual se puede elegir.
    const noche = estadoNoche(texto, info, hoy);
    const elegible = esElegible(texto, info, hoy);
    const elegido = texto === seleccionada;
    const feriado = feriados[texto];
    const oferta = libre && estaEnOferta(info);
    if (oferta) hayOfertas = true;
    const etiqueta = etiquetaDelDia(texto, estado, precio, feriado, oferta, noche);

    celdas.push(
      <button
        key={texto}
        type="button"
        className={`sv-dia sv-dia--${estado}${elegido ? ' sv-dia--elegido' : ''}${feriado ? ' sv-dia--feriado' : ''}${oferta ? ' sv-dia--oferta' : ''}${!libre && elegible ? ' sv-dia--solo-noche' : ''}`}
        title={feriado ? `Feriado: ${feriado.nombre}` : undefined}
        disabled={!elegible}
        aria-pressed={elegible ? elegido : undefined}
        aria-label={etiqueta}
        onClick={() => onSeleccionar(texto)}
      >
        <span className="sv-dia__numero">{dia}</span>
        {feriado && <span className="sv-dia__feriado" aria-hidden="true" />}
        {libre && (
          <span className="sv-dia__precio">
            {precio ? (
              <>
                <span className="sv-dia__precio-corto">{precioCorto(precio)}</span>
                <span className="sv-dia__precio-largo">{formatoPesos(precio)}</span>
              </>
            ) : <span className="sv-dia__precio-largo">Consultar</span>}
          </span>
        )}
        {ETIQUETA_VISIBLE[estado] && <span className="sv-dia__estado">{ETIQUETA_VISIBLE[estado]}</span>}
        {oferta && <span className="sv-dia__estado sv-dia__estado--oferta">Oferta</span>}
        {noche && (
          <span className={`sv-dia__noche sv-dia__noche--${noche === 'libre' ? 'libre' : 'tomada'}`} aria-hidden="true">
            {noche === 'libre' ? <FaMoon /> : <FaRegMoon />}
          </span>
        )}
      </button>,
    );
  }

  return (
    <div className="sv-calendario sv-tarjeta">
      <div className="sv-calendario__cabecera">
        <button type="button" className="sv-calendario__flecha" onClick={() => onCambiarMes(-1)} disabled={!puedeAtras} aria-label="Mes anterior">
          <FaChevronLeft aria-hidden="true" />
        </button>
        <h2 className="sv-calendario__mes" aria-live="polite">{tituloMes}</h2>
        <button type="button" className="sv-calendario__flecha" onClick={() => onCambiarMes(1)} disabled={!puedeAdelante} aria-label="Mes siguiente">
          <FaChevronRight aria-hidden="true" />
        </button>
      </div>

      <div className="sv-calendario__semana" aria-hidden="true">
        {DIAS_SEMANA.map((d, i) => <div key={NOMBRES_DIAS[i]} title={NOMBRES_DIAS[i]}>{d}</div>)}
      </div>
      <div className="sv-calendario__grilla">{celdas}</div>

      <ul className="sv-calendario__leyenda">
        <li><i className="sv-muestra sv-muestra--libre" /> Libre</li>
        <li><i className="sv-muestra sv-muestra--pendiente" /> Pendiente</li>
        <li><i className="sv-muestra sv-muestra--ocupado" /> Ocupado</li>
        <li><i className="sv-muestra sv-muestra--domingo" /> Domingo (no se alquila)</li>
        <li><FaMoon className="sv-leyenda__noche" aria-hidden="true" /> Noche libre (20:30 a 4:30, por WhatsApp)</li>
        {Object.keys(feriados).length > 0 && <li><i className="sv-muestra sv-muestra--feriado" /> Feriado</li>}
        {hayOfertas && <li><i className="sv-muestra sv-muestra--oferta" /> En oferta</li>}
      </ul>
    </div>
  );
}
