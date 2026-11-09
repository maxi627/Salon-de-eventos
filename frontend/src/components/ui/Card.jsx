export default function Card({ as: Etiqueta = 'div', className = '', children, ...props }) {
  return <Etiqueta className={`sv-tarjeta ${className}`.trim()} {...props}>{children}</Etiqueta>;
}
