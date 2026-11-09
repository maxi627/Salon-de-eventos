export default function Card({ as = 'div', className = '', children, ...props }) {
  const Etiqueta = as;
  return <Etiqueta className={`sv-tarjeta ${className}`.trim()} {...props}>{children}</Etiqueta>;
}
