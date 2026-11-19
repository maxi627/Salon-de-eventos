import { useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { useFechas } from '../hooks/useFechas';
import { useFeriados } from '../hooks/useFeriados';
import {
  descuentoPorcentaje,
  diasEntre,
  esReservable,
  estaEnOferta,
  formatoFechaLarga,
  formatoPesos,
  hoyLocal,
  precioNormalDe,
  sumarDias,
} from '../lib/fechas';
import { ofertasVisibles } from '../lib/ofertas';
import './OfertasManager.css';

const DIAS_LISTADOS = 30;

const mayuscula = (texto) => texto.charAt(0).toUpperCase() + texto.slice(1);

async function pedir(metodo, id, cuerpo) {
  const respuesta = await fetch(`/api/v1/fecha/${id}/oferta`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('authToken')}` },
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) throw new Error(datos.message || `Error ${respuesta.status} del servidor`);
  return datos;
}

// Sección "Ofertas" del panel: poner en oferta fechas libres próximas y quitar las activas.
export default function OfertasManager() {
  const queryClient = useQueryClient();
  const { fechas, isLoading, isError } = useFechas();
  const feriados = useFeriados();
  const [precios, setPrecios] = useState({});
  const [ocupado, setOcupado] = useState(null);
  const [aviso, setAviso] = useState(null);

  const hoy = hoyLocal();
  const limite = sumarDias(hoy, DIAS_LISTADOS);
  const activas = ofertasVisibles(fechas, hoy);
  const candidatas = fechas
    .filter((f) => !estaEnOferta(f) && f.dia <= limite && esReservable(f.dia, f, hoy))
    .sort((a, b) => a.dia.localeCompare(b.dia));

  const ejecutar = async (id, accion, exito) => {
    setOcupado(id);
    setAviso(null);
    try {
      await accion();
      await queryClient.invalidateQueries({ queryKey: ['fechas'] });
      setAviso({ ok: true, texto: exito });
      setPrecios((p) => ({ ...p, [id]: '' }));
    } catch (err) {
      setAviso({ ok: false, texto: err.message });
    } finally {
      setOcupado(null);
    }
  };

  const ponerOferta = (fecha) => ejecutar(
    fecha.id,
    () => pedir('PUT', fecha.id, { valor_oferta: Number(precios[fecha.id]) }),
    `${mayuscula(formatoFechaLarga(fecha.dia))} quedó en oferta a ${formatoPesos(Number(precios[fecha.id]))}.`,
  );

  const quitarOferta = (fecha) => ejecutar(
    fecha.id,
    () => pedir('DELETE', fecha.id),
    `Se quitó la oferta del ${formatoFechaLarga(fecha.dia)}.`,
  );

  const nombreFecha = (dia) => (
    <div className="ofertas-fecha">
      {mayuscula(formatoFechaLarga(dia))}
      {feriados[dia] && <span className="ofertas-chip" title={feriados[dia].nombre}>Feriado</span>}
    </div>
  );

  return (
    <div className="ofertas-container admin-section-fade">
      <h3><i className="fa-solid fa-fire"></i> Ofertas</h3>
      <p className="ofertas-ayuda">
        Poné en oferta una fecha libre para alquilarla más barata. Mientras esté libre, aparece destacada en el inicio
        del sitio y su precio de oferta vale en todo el sitio (calendario, seña y chat).
      </p>

      {aviso && (
        <p className={aviso.ok ? 'ofertas-aviso ofertas-aviso--ok' : 'ofertas-aviso ofertas-aviso--error'} role="status">
          {aviso.texto}
        </p>
      )}

      {isLoading && <p className="ofertas-vacio">Cargando fechas…</p>}
      {isError && <p className="ofertas-aviso ofertas-aviso--error">No se pudieron cargar las fechas.</p>}

      {!isLoading && !isError && (
        <>
          <section className="ofertas-bloque">
            <h4>Ofertas activas</h4>
            {activas.length === 0 ? (
              <p className="ofertas-vacio">No hay ofertas activas.</p>
            ) : activas.map((f) => {
              const faltan = diasEntre(hoy, f.dia);
              const descuento = descuentoPorcentaje(f);
              return (
                <div key={f.id} className="ofertas-fila">
                  <div>
                    {nombreFecha(f.dia)}
                    <div className="ofertas-sub">Libre · {faltan === 0 ? 'es hoy' : faltan === 1 ? 'falta 1 día' : `faltan ${faltan} días`}</div>
                  </div>
                  <div>
                    {precioNormalDe(f) && <s className="ofertas-tachado">{formatoPesos(precioNormalDe(f))}</s>}
                    <span className="ofertas-precio">{formatoPesos(Number(f.valor_oferta))}</span>
                  </div>
                  <div className="ofertas-pct">{descuento ? `${descuento}% de descuento` : ''}</div>
                  <button type="button" className="ofertas-btn ofertas-btn--quitar" disabled={ocupado === f.id} onClick={() => quitarOferta(f)}>
                    {ocupado === f.id ? 'Quitando…' : 'Quitar oferta'}
                  </button>
                </div>
              );
            })}
          </section>

          <section className="ofertas-bloque">
            <h4>Próximas fechas libres ({DIAS_LISTADOS} días)</h4>
            {candidatas.length === 0 ? (
              <p className="ofertas-vacio">No hay fechas libres en los próximos {DIAS_LISTADOS} días.</p>
            ) : candidatas.map((f) => {
              const valor = precios[f.id] ?? '';
              const descuento = valor ? descuentoPorcentaje({ valor_estimado: f.valor_estimado, valor_oferta: valor }) : null;
              return (
                <form key={f.id} className="ofertas-fila" onSubmit={(e) => { e.preventDefault(); ponerOferta(f); }}>
                  <div>
                    {nombreFecha(f.dia)}
                    <div className="ofertas-sub">
                      {precioNormalDe(f) ? `Precio actual ${formatoPesos(precioNormalDe(f))}` : 'Sin precio cargado'}
                    </div>
                  </div>
                  <input
                    type="number"
                    min="1"
                    className="ofertas-input"
                    placeholder="Precio de oferta"
                    aria-label={`Precio de oferta para el ${formatoFechaLarga(f.dia)}`}
                    value={valor}
                    onChange={(e) => setPrecios((p) => ({ ...p, [f.id]: e.target.value }))}
                  />
                  <div className="ofertas-pct">{descuento ? `${descuento}% de descuento` : ''}</div>
                  <button type="submit" className="ofertas-btn ofertas-btn--poner" disabled={!valor || ocupado === f.id}>
                    {ocupado === f.id ? 'Guardando…' : 'Poner en oferta'}
                  </button>
                </form>
              );
            })}
          </section>
        </>
      )}
    </div>
  );
}
