// Fotos del salón para la galería y la parte de arriba del inicio.
// Primero las fotos reales y después las hechas con IA. Se generan con scripts/optimizar-fotos.mjs.
export const FOTOS = [
  { src: '/fotos/exterior-800.webp', srcSet: '/fotos/exterior-800.webp 800w, /fotos/exterior-1600.webp 1280w', grande: '/fotos/exterior-1600.webp', alt: 'Exterior del salón, con el parque adelante', ancho: 1280, alto: 960 },
  { src: '/fotos/exterior-2-800.webp', srcSet: '/fotos/exterior-2-800.webp 800w, /fotos/exterior-2-1600.webp 1280w', grande: '/fotos/exterior-2-1600.webp', alt: 'Frente del salón y el patio', ancho: 1280, alto: 960 },
  { src: '/fotos/parrilla-800.webp', srcSet: '/fotos/parrilla-800.webp 800w, /fotos/parrilla-1600.webp 1280w', grande: '/fotos/parrilla-1600.webp', alt: 'Parrilla y mesas en el parque', ancho: 1280, alto: 960 },
  { src: '/fotos/parrilla-2-800.webp', srcSet: '/fotos/parrilla-2-800.webp 800w, /fotos/parrilla-2-1600.webp 1280w', grande: '/fotos/parrilla-2-1600.webp', alt: 'Parrilla techada junto al parque', ancho: 1280, alto: 960 },
  { src: '/fotos/parque-800.webp', srcSet: '/fotos/parque-800.webp 800w, /fotos/parque-1600.webp 1280w', grande: '/fotos/parque-1600.webp', alt: 'Parque con la pileta al fondo', ancho: 1280, alto: 960 },
  { src: '/fotos/parque-pileta-800.webp', srcSet: '/fotos/parque-pileta-800.webp 800w, /fotos/parque-pileta-1600.webp 1280w', grande: '/fotos/parque-pileta-1600.webp', alt: 'Parque con árboles y la pileta', ancho: 1280, alto: 960 },
  { src: '/fotos/pileta-800.webp', srcSet: '/fotos/pileta-800.webp 800w, /fotos/pileta-1600.webp 1280w', grande: '/fotos/pileta-1600.webp', alt: 'Pileta del salón', ancho: 1280, alto: 960 },
  { src: '/fotos/salon-juegos-800.webp', srcSet: '/fotos/salon-juegos-800.webp 800w, /fotos/salon-juegos-1600.webp 1600w', grande: '/fotos/salon-juegos-1600.webp', alt: 'Salón interior con mesa de pool y máquinas arcade', ancho: 1600, alto: 1200 },
  { src: '/fotos/salon-800.webp', srcSet: '/fotos/salon-800.webp 800w, /fotos/salon-1600.webp 1600w', grande: '/fotos/salon-1600.webp', alt: 'Salón interior amplio', ancho: 1600, alto: 1200 },
  { src: '/fotos/cocina-800.webp', srcSet: '/fotos/cocina-800.webp 800w, /fotos/cocina-1600.webp 1280w', grande: '/fotos/cocina-1600.webp', alt: 'Cocina con mesada y heladera', ancho: 1280, alto: 576 },
  { src: '/fotos/cocina-2-800.webp', srcSet: '/fotos/cocina-2-800.webp 800w, /fotos/cocina-2-1600.webp 1280w', grande: '/fotos/cocina-2-1600.webp', alt: 'Cocina con freezer y mesa de trabajo', ancho: 1280, alto: 576 },
  { src: '/fotos/bano-800.webp', srcSet: '/fotos/bano-800.webp 576w', grande: '/fotos/bano-1600.webp', alt: 'Baño del salón', ancho: 576, alto: 1280 },
  { src: '/fotos/ia-juegos-800.webp', srcSet: '/fotos/ia-juegos-800.webp 800w, /fotos/ia-juegos-1600.webp 1600w', grande: '/fotos/ia-juegos-1600.webp', alt: 'Chicos jugando al metegol en el salón', ancho: 1600, alto: 1200 },
  { src: '/fotos/ia-parque-800.webp', srcSet: '/fotos/ia-parque-800.webp 800w, /fotos/ia-parque-1600.webp 1112w', grande: '/fotos/ia-parque-1600.webp', alt: 'Chicos jugando en el parque', ancho: 1112, alto: 833 },
  { src: '/fotos/ia-asado-800.webp', srcSet: '/fotos/ia-asado-800.webp 800w, /fotos/ia-asado-1600.webp 1116w', grande: '/fotos/ia-asado-1600.webp', alt: 'Asado en la parrilla del parque', ancho: 1116, alto: 831 },
  { src: '/fotos/ia-cocina-800.webp', srcSet: '/fotos/ia-cocina-800.webp 800w, /fotos/ia-cocina-1600.webp 1421w', grande: '/fotos/ia-cocina-1600.webp', alt: 'Personas cocinando en la cocina del salón', ancho: 1421, alto: 639 },
  { src: '/fotos/ia-pileta-800.webp', srcSet: '/fotos/ia-pileta-800.webp 800w, /fotos/ia-pileta-1600.webp 1600w', grande: '/fotos/ia-pileta-1600.webp', alt: 'Pileta del salón con chicos jugando', ancho: 1600, alto: 1186 },
  { src: '/fotos/ia-ping-pong-800.webp', srcSet: '/fotos/ia-ping-pong-800.webp 800w, /fotos/ia-ping-pong-1600.webp 1600w', grande: '/fotos/ia-ping-pong-1600.webp', alt: 'Chicos jugando al ping pong en el parque', ancho: 1600, alto: 1200 },
];

export const FOTO_HERO = FOTOS[16];

// Las cinco que se ven en la grilla del inicio (índices de FOTOS).
export const FOTOS_GRILLA = [0, 12, 9, 16, 5];
