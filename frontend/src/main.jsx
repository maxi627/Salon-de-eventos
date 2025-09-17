import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// Importamos el Layout Principal
import App from './App.jsx'
// Importamos los componentes de las páginas
import Home from './pages/home.jsx'
// ¡Importa las nuevas páginas que crearemos!
import Confirmacion from './pages/confirmacion.jsx'
import Login from './pages/login.jsx'
import Register from './pages/register.jsx'
import Reservas from './pages/reservas.jsx'
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
      // Agregamos las nuevas rutas aquí
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
    ]
  },
]);

// Renderizamos la aplicación con el router
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)