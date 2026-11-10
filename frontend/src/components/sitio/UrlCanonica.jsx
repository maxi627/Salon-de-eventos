import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { urlCanonica } from '../../content/seo';

// Mantiene <link rel="canonical"> con la url de la página pública actual, para que Google
// no cuente como páginas distintas las variantes con consulta (?fecha=...) o con www.
export default function UrlCanonica() {
  const { pathname } = useLocation();
  useEffect(() => {
    let enlace = document.querySelector('link[rel="canonical"]');
    if (!enlace) {
      enlace = document.createElement('link');
      enlace.rel = 'canonical';
      document.head.appendChild(enlace);
    }
    enlace.href = urlCanonica(pathname);
  }, [pathname]);
  return null;
}
