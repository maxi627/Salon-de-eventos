// Datos fijos del salón: se cambian acá y se actualizan en todo el sitio.
// Las respuestas tienen que coincidir con App/chatbot/manual_salon.md (lo que dice el chat).
import {
  FaCar,
  FaFire,
  FaGamepad,
  FaKitchenSet,
  FaPersonSwimming,
  FaRestroom,
  FaTree,
  FaUsers,
} from 'react-icons/fa6';

export const SALON = {
  nombre: 'Salón de Eventos',
  direccion: 'Bolívar 1425',
  ciudad: 'San Rafael, Mendoza',
  whatsappTexto: '260 411-9865',
  whatsappUrl: 'https://wa.me/542604119865',
  horario: 'Lunes a sábado de 11 a 20 hs',
  capacidad: 50,
  redes: {
    facebook: 'https://www.facebook.com/saljjuh/',
    instagram: 'https://www.instagram.com/saloneventos_?igsh=amVocnl5dGdkdXN2',
  },
  defensaConsumidorUrl: 'https://www.argentina.gob.ar/produccion/defensadelconsumidor/formulario',
  mapaEmbedUrl: 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3282.653457813076!2d-68.313890123447!3d-34.63821707294406!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x9679a9bdbd71ebbd%3A0xf07b4cc0a177c032!2sSal%C3%B3n%20de%20eventos!5e0!3m2!1ses-419!2sar!4v1709584000000!5m2!1ses-419!2sar',
};

export function whatsappConTexto(texto) {
  return `${SALON.whatsappUrl}?text=${encodeURIComponent(texto)}`;
}

export const QUE_INCLUYE = [
  { icono: FaUsers, titulo: 'Hasta 50 personas', detalle: '25 sillas y 4 mesones' },
  { icono: FaKitchenSet, titulo: 'Cocina completa', detalle: 'Heladera, freezer y gas' },
  { icono: FaFire, titulo: 'Parrilla', detalle: 'En el parque' },
  { icono: FaPersonSwimming, titulo: 'Pileta', detalle: 'En verano, de uso libre' },
  { icono: FaTree, titulo: 'Gran parque', detalle: 'Con sombra de árboles' },
  { icono: FaGamepad, titulo: 'Juegos', detalle: 'Pool, ping pong, metegol y arcade' },
  { icono: FaRestroom, titulo: '4 baños', detalle: 'Accesible en silla de ruedas' },
  { icono: FaCar, titulo: 'Cocheras', detalle: '4 techadas y más espacio libre' },
];

export const QUE_LLEVAR = 'La vajilla, el carbón y la música los llevás vos.';

export const PREGUNTAS = [
  {
    pregunta: '¿Se alquila los domingos?',
    respuesta: 'No. Los domingos el salón está ocupado todo el año; se alquila de lunes a sábado.',
  },
  {
    pregunta: '¿Puedo entrar antes a decorar?',
    respuesta: 'Sí, hasta 2 horas antes del evento, pidiéndolo con anticipación por WhatsApp.',
  },
  {
    pregunta: '¿Se pueden sumar horas extra?',
    respuesta: 'Sí, consultando antes por WhatsApp para que no se superpongan con otro turno. La hora extra ronda los $10.000.',
  },
  {
    pregunta: '¿Qué pasa si cancelo?',
    respuesta: 'Si cancelás, la seña no se devuelve. Con el botón de arrepentimiento podés cancelar con devolución dentro de los 10 días corridos desde que reservaste, si faltan al menos 7 días para el evento.',
  },
];

export const PASOS_RESERVA = [
  { titulo: 'Elegí la fecha', detalle: 'Creá tu cuenta y tocá un día libre.' },
  { titulo: 'Aceptá el contrato', detalle: 'Lo leés en el sitio antes de seguir.' },
  { titulo: 'Pagá la seña', detalle: 'Transferís el 30% y subís el comprobante.' },
  { titulo: 'Listo', detalle: 'Te confirmamos por correo con el contrato.' },
];
