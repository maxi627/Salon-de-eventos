import { Link } from 'react-router-dom';

// Botón del sitio. `to` lo convierte en Link interno; `href` en enlace externo.
// variant: "primario" (relleno), "secundario" (con borde), "enlace" (subrayado), "claro" (sobre fotos).
export default function Button({ variant = 'primario', to, href, className = '', children, ...props }) {
  const clases = `sv-boton sv-boton--${variant} ${className}`.trim();
  if (to) return <Link to={to} className={clases} {...props}>{children}</Link>;
  if (href) return <a href={href} className={clases} {...props}>{children}</a>;
  return <button type="button" className={clases} {...props}>{children}</button>;
}
