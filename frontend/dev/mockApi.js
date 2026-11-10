// API simulada para revisar el frontend en local (`npm run dev:mock`).
// Solo se carga en el servidor de desarrollo con --mode mock; nunca entra al build.

const DIA_MS = 24 * 60 * 60 * 1000;

function texto(fecha) {
  const y = fecha.getFullYear();
  const m = String(fecha.getMonth() + 1).padStart(2, '0');
  const d = String(fecha.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function base64url(obj) {
  return Buffer.from(JSON.stringify(obj)).toString('base64url');
}

function tokenFalso(rol, nombre) {
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url({ sub: '1', role: rol, nombre, exp })}.firma-de-prueba`;
}

// Fechas de los próximos 90 días, con todos los estados posibles.
function generarFechas() {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fechas = [];
  let id = 1;
  for (let i = 1; i <= 90; i += 1) {
    const dia = new Date(hoy.getTime() + i * DIA_MS);
    if (dia.getDay() === 0) continue; // los domingos no se alquilan
    if (i % 2 === 0 && dia.getDay() !== 5 && dia.getDay() !== 6) continue; // dejamos huecos sin cargar
    const finde = dia.getDay() === 5 || dia.getDay() === 6;
    let estado = 'disponible';
    if (i % 7 === 3) estado = 'reservada';
    else if (i % 11 === 4) estado = 'pendiente';
    const valor = finde ? 190000 + (i % 3) * 20000 : 150000;
    fechas.push({ id: id++, dia: texto(dia), estado, usuario_id: null, valor_estimado: valor });
  }
  // Una fecha libre sin precio cargado.
  const sinPrecio = fechas.find((f) => f.estado === 'disponible' && f.valor_estimado === 150000);
  if (sinPrecio) sinPrecio.valor_estimado = null;
  return fechas;
}

function reservasDePrueba(fechas) {
  const libres = fechas.filter((f) => f.estado !== 'disponible');
  const [a, b, c] = [libres[0], libres[1], libres[2]].map((f, i) => f ?? fechas[i]);
  return [
    { id: 1, estado: 'confirmada', valor_alquiler: 210000, saldo_restante: 147000, fecha: { id: a.id, dia: a.dia }, pagos: [{ id: 1, monto: 63000 }] },
    { id: 2, estado: 'pendiente', valor_alquiler: 190000, saldo_restante: 190000, fecha: { id: b.id, dia: b.dia }, pagos: [] },
    { id: 3, estado: 'cancelada', valor_alquiler: 150000, saldo_restante: 150000, fecha: { id: c.id, dia: c.dia }, pagos: [] },
  ];
}

// Reservas que ve el administrador: dos pedidas desde la web (nacen con valor 0), una en un día
// con precio cargado y otra en el día sin precio, y una confirmada con su valor ya guardado.
function reservasDelPanel(fechas) {
  const usuario = { id: 7, nombre: 'Laura', apellido: 'Gómez', correo: 'laura@ejemplo.com', telefono: '2604000000' };
  const conPrecio = fechas.find((f) => f.estado === 'pendiente' && f.valor_estimado > 0) ?? fechas[0];
  const sinPrecio = fechas.find((f) => f.valor_estimado === null) ?? fechas[1];
  const confirmada = fechas.find((f) => f.estado === 'reservada') ?? fechas[2];
  const reserva = (id, estado, valor, f) => ({
    id, estado, valor_alquiler: valor, saldo_restante: valor, cantidad_personas: 40,
    hora_inicio: null, hora_fin: null, comprobante_url: null, pagos: [],
    usuario, fecha: { id: f.id, dia: f.dia },
  });
  return [
    reserva(21, 'pendiente', 0, conPrecio),
    reserva(22, 'pendiente', 0, sinPrecio),
    reserva(23, 'confirmada', 210000, confirmada),
  ];
}

function responder(res, status, data, message = 'ok') {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status_code: status, message, data }));
}

async function leerCuerpo(req) {
  const partes = [];
  for await (const parte of req) partes.push(parte);
  const crudo = Buffer.concat(partes).toString();
  try {
    return JSON.parse(crudo);
  } catch {
    return {};
  }
}

export default function mockApi() {
  return {
    name: 'mock-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        if (!req.url.startsWith('/api/v1/')) return next();
        const url = new URL(req.url, 'http://localhost');
        const ruta = url.pathname.replace('/api/v1', '');
        const fechas = generarFechas();

        if (req.method === 'GET' && ruta === '/fecha') return responder(res, 200, fechas);

        const porFecha = ruta.match(/^\/fecha\/by-date\/(\d{4}-\d{2}-\d{2})$/);
        if (req.method === 'GET' && porFecha) {
          const encontrada = fechas.find((f) => f.dia === porFecha[1]);
          return responder(res, 200, encontrada ?? { id: 999, dia: porFecha[1], estado: 'disponible', valor_estimado: null });
        }

        if (req.method === 'GET' && ruta === '/payment-info') return responder(res, 200, { alias: 'salon.eventos.prueba' });

        if (req.method === 'POST' && ruta === '/login') {
          const { correo = '' } = await leerCuerpo(req);
          const rol = correo.startsWith('admin') ? 'administrador' : 'cliente';
          return responder(res, 200, { token: tokenFalso(rol, 'Laura') });
        }

        if (req.method === 'GET' && ruta === '/reserva') return responder(res, 200, reservasDelPanel(fechas));
        if (req.method === 'GET' && ruta === '/reserva/mis-reservas') return responder(res, 200, reservasDePrueba(fechas));
        if (req.method === 'POST' && ruta === '/reserva/solicitar') return responder(res, 201, { id: 10 }, 'Solicitud enviada');

        const genericas = ['/usuario', '/forgot-password', '/reset-password', '/reservas/arrepentimiento', '/reservas/arrepentimiento/confirmar'];
        if (req.method === 'POST' && genericas.includes(ruta)) return responder(res, 200, {}, 'Listo (respuesta simulada)');

        return responder(res, 404, null, 'No existe en la API simulada');
      });
    },
  };
}
