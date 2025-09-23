import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';

// Importa todos tus componentes de página
import Login from './components/Login.jsx';
import ClientManagement from './components/ClientManagement.jsx';
import UserManagement from './components/UserManagement.jsx';
import InventoryManagement from './components/InventoryManagement.jsx';
import Comandas from './pages/Comandas.jsx';
import Egresos from './pages/Egresos.jsx';
import Historial from './pages/Historial.jsx';
import Home from './pages/Home.jsx';
import Ingresos from './pages/Ingresos.jsx';
import Inventario from './pages/Inventario.jsx';
import ReporteEgresos from './pages/ReporteEgresos.jsx';
import ReporteTotales from './pages/ReporteTotales.jsx';
import VentasAccesorios from './pages/VentasAccesorios.jsx';

import './App.css';

// Estado inicial para las comandas
const initialCanchas = [
  { id: 1, nombre: 'Cancha 1', productosEnComanda: [], clienteSeleccionado: null, tipo: 'cancha' },
  { id: 2, nombre: 'Cancha 2', productosEnComanda: [], clienteSeleccionado: null, tipo: 'cancha' },
  { id: 3, nombre: 'Cancha 3', productosEnComanda: [], clienteSeleccionado: null, tipo: 'cancha' },
  { id: 4, nombre: 'Cancha 4', productosEnComanda: [], clienteSeleccionado: null, tipo: 'cancha' },
  { id: 5, nombre: 'Cancha 5', productosEnComanda: [], clienteSeleccionado: null, tipo: 'cancha' },
];

const initialOpenOrders = [];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);
  const [canchas, setCanchas] = useState(initialCanchas);
  const [openOrders, setOpenOrders] = useState(initialOpenOrders);

  const handleLoginSuccess = (role) => {
    setIsLoggedIn(true);
    setUserRole(role);
  };

  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const routes = [
    { path: '/', name: 'Home', element: <Home />, roles: ['cajero', 'admin'] },
    { path: '/clientes', name: 'Clientes', element: <ClientManagement />, roles: ['cajero', 'admin'] },
    { path: '/comandas', name: 'Comandas', element: <Comandas canchas={canchas} setCanchas={setCanchas} openOrders={openOrders} setOpenOrders={setOpenOrders} />, roles: ['cajero', 'admin'] },
    { path: '/ventas-accesorios', name: 'Ventas Accesorios', element: <VentasAccesorios />, roles: ['cajero', 'admin'] },
    { path: '/egresos', name: 'Egresos', element: <Egresos />, roles: ['admin'] },
    { path: '/historial', name: 'Historial', element: <Historial />, roles: ['admin'] },
    { path: '/ingresos', name: 'Ingresos', element: <Ingresos />, roles: ['admin'] },
    { path: '/inventario', name: 'Inventario', element: <InventoryManagement />, roles: ['admin'] },
    { path: '/reporte-egresos', name: 'Reporte Egresos', element: <ReporteEgresos />, roles: ['admin'] },
    { path: '/reporte-totales', name: 'Reporte Totales', element: <ReporteTotales />, roles: ['admin'] },
    { path: '/gestion-usuarios', name: 'Gestión de Usuarios', element: <UserManagement />, roles: ['admin'] },
  ];

  return (
    <Router>
      <div className="App">
        {/* Generación dinámica de la navegación */}
        <nav>
          <div className="nav-container full-width-nav">
            <ul>
              {routes.map(route => {
                if (route.roles.includes(userRole)) {
                  return (
                    <li key={route.path}>
                      <Link to={route.path}>{route.name}</Link>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          </div>
        </nav>
        
        {/* Generación dinámica de las rutas */}
        <Routes>
          {routes.map(route => {
            if (route.roles.includes(userRole)) {
              return (
                <Route key={route.path} path={route.path} element={route.element} />
              );
            }
            return null;
          })}
        </Routes>
      </div>
    </Router>
  );
}

export default App;
