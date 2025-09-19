import * as Sentry from "@sentry/react";
import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
// Importamos el Layout Principal
import App from './App.jsx';

// Importamos los componentes de las páginas
import Confirmacion from './pages/confirmacion.jsx';
import Home from './pages/home.jsx';
import Login from './pages/login.jsx';
import Register from './pages/register.jsx';
import Reservas from './pages/reservas.jsx';

// Importamos los componentes de rutas y especiales
import ProtectedRoute from './components/ProtectedRoute.jsx';
// --- LÍNEA FALTANTE AÑADIDA AQUÍ ---
import AdminPanel from './pages/AdminPanel.jsx';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN_FRONTEND,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      // Esta opción adicional es para la privacidad, oculta los textos por defecto
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  // Monitoreo de rendimiento
  tracesSampleRate: 1.0,
  // Grabación de sesiones para depuración
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// Definimos las rutas
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        index: true,
        element: <Home />,
      },
      {
        path: "/login",
        element: <Login />,
      },
      {
        path: "/register",
        element: <Register />,
      },
      { path: "/reservar", element: <Reservas /> },
      { path: "/reservar/:dateString", element: <Confirmacion /> },
      {
        // Esta estructura está perfecta
        element: <ProtectedRoute />,
        children: [
          { path: "/admin-panel", element: <AdminPanel /> }
        ]
      },
    ]
  },
]);

// Renderizamos la aplicación con el router
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)