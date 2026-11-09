export default function Chip({ children, className = '' }) {
  return <span className={`sv-etiqueta ${className}`.trim()}>{children}</span>;
}
