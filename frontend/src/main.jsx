import * as Sentry from "@sentry/react";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router-dom';

// Importaciones de tus componentes y páginas
import App from './App.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import './index.css';
import AdminPanel from './pages/AdminPanel.jsx';
import Confirmacion from './pages/confirmacion.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import Home from './pages/home.jsx';
import Login from './pages/login.jsx';
import Register from './pages/register.jsx';
import Reservas from './pages/reservas.jsx';
import ResetPassword from './pages/ResetPassword.jsx';

// 1. Configuración de Sentry
Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN_FRONTEND,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],
  tracesSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});

// 2. Configuración de React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      refetchOnWindowFocus: false,
      staleTime: 1000 * 60 * 5,
    },
  },
});

// 3. Definición de Rutas
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      { index: true, element: <Home /> },
      { path: "/login", element: <Login /> },
      { path: "/register", element: <Register /> },
      { path: "/forgot-password", element: <ForgotPassword /> },
      { path: "/reset-password/:token", element: <ResetPassword /> },
      { path: "/reservar", element: <Reservas /> },
      { path: "/reservar/:dateString", element: <Confirmacion /> },
      {
        element: <ProtectedRoute />,
        children: [
          { path: "/admin-panel", element: <AdminPanel /> }
        ]
      },
    ]
  },
]);

// 4. Renderizado Final
ReactDOM.createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </StrictMode>
);