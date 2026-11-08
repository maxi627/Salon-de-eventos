import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';

// La Site Key es pública (va en el HTML). En desarrollo se puede usar la clave de prueba
// de Cloudflare "1x00000000000000000000AA" con VITE_TURNSTILE_SITE_KEY.
const SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY || '0x4AAAAAAF4Xtr8jAYXFr-ek';
const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let scriptPromise = null;

function cargarScript() {
  if (window.turnstile) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      script.onload = resolve;
      script.onerror = () => {
        scriptPromise = null;
        reject(new Error('No se pudo cargar Turnstile'));
      };
      document.head.appendChild(script);
    });
  }
  return scriptPromise;
}

/**
 * Widget de Cloudflare Turnstile. Llama a onToken con el token cuando el usuario
 * queda verificado, y con '' cuando el token vence o hay un error.
 * Cada token sirve una sola vez: después de enviar el formulario, llamar a ref.current.reset().
 */
const Turnstile = forwardRef(function Turnstile({ onToken }, ref) {
  const contenedorRef = useRef(null);
  const widgetIdRef = useRef(null);
  const onTokenRef = useRef(onToken);

  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  useImperativeHandle(ref, () => ({
    reset() {
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.reset(widgetIdRef.current);
      }
      onTokenRef.current('');
    },
  }));

  useEffect(() => {
    let cancelado = false;

    cargarScript()
      .then(() => {
        if (cancelado || !contenedorRef.current) return;
        widgetIdRef.current = window.turnstile.render(contenedorRef.current, {
          sitekey: SITE_KEY,
          language: 'es',
          callback: (token) => onTokenRef.current(token),
          'expired-callback': () => onTokenRef.current(''),
          'error-callback': () => onTokenRef.current(''),
        });
      })
      .catch(() => onTokenRef.current(''));

    return () => {
      cancelado = true;
      if (window.turnstile && widgetIdRef.current !== null) {
        window.turnstile.remove(widgetIdRef.current);
      }
      widgetIdRef.current = null;
    };
  }, []);

  return <div ref={contenedorRef} className="turnstile-widget" style={{ margin: '1rem 0' }} />;
});

export default Turnstile;
