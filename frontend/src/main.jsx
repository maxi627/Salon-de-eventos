import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'

// Importamos el Layout Principal
import App from './App.jsx'
// Importamos los componentes de las páginas
import Home from './pages/home.jsx'


// Definimos las rutas
const router = createBrowserRouter([
  {
    path: "/",
    element: <App />, // App.jsx es ahora el elemento principal que contiene el layout
    // Las "rutas hijas" se renderizarán dentro del <Outlet> de App.jsx
    children: [
      {
        index: true, // Esto hace que 'Home' sea la página por defecto en la ruta "/"
        element: <Home />,
      },
      // Aquí podrías agregar más páginas, por ejemplo:
      // {
      //   path: "/servicios",
      //   element: <ServiciosPage />,
      // }
    ]
  },
]);

// Renderizamos la aplicación con el router
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
)