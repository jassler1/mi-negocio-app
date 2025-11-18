import React, { useState, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';

// Componentes
import Login from './components/Login.jsx';
import ClientManagement from './components/ClientManagement.jsx';
import UserManagement from './components/UserManagement.jsx';
import InventoryManagement from './components/InventoryManagement.jsx';
import HistorialAuditoria from './components/HistorialAuditoria.jsx';

// Páginas
import Comandas from './pages/Comandas.jsx';
import Egresos from './pages/Egresos.jsx';
import Home from './pages/Home.jsx';
import Ingresos from './pages/Ingresos.jsx';
import VentasAccesorios from './pages/VentasAccesorios.jsx'; // Usando el nombre de importación del usuario
import ReporteTotales from './pages/ReporteTotales.jsx';

import './App.css';

// --- Roles ---
const ROLES = {
  CAJERO: 'cajero',
  ADMIN: 'admin',
};

// --- Estado Inicial ---
const initialCanchas = [
  { id: 1, nombre: 'Cancha 1', productosEnComanda: [], clienteSeleccionado: null, tipo: 'cancha' },
  { id: 2, nombre: 'Cancha 2', productosEnComanda: [], clienteSeleccionado: null, tipo: 'cancha' },
  { id: 3, nombre: 'Cancha 3', productosEnComanda: [], clienteSeleccionado: null, tipo: 'cancha' },
  { id: 4, nombre: 'Cancha 4', productosEnComanda: [], clienteSeleccionado: null, tipo: 'cancha' },
  { id: 5, nombre: 'Cancha 5', productosEnComanda: [], clienteSeleccionado: null, tipo: 'cancha' },
];

const initialOpenOrders = [];

// --- Rutas de la aplicación ---
const appRoutes = [
  { path: '/', name: 'Home', element: <Home />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/clientes', name: 'Clientes', element: <ClientManagement />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/comandas', name: 'Comandas', element: null, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/ventas-accesorios', name: 'Ventas Accesorios', element: null, roles: [ROLES.CAJERO, ROLES.ADMIN] }, // Cambiado a null para manejo manual
  { path: '/egresos', name: 'Egresos', element: <Egresos />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/historial', name: 'Historial', element: <HistorialAuditoria />, roles: [ROLES.ADMIN] },
  { path: '/ingresos', name: 'Ingresos', element: <Ingresos />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/inventario', name: 'Inventario', element: <InventoryManagement />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/reporte-totales', name: 'Reporte Totales', element: <ReporteTotales />, roles: [ROLES.ADMIN] },
  { path: '/gestion-usuarios', name: 'Gestión de Usuarios', element: <UserManagement />, roles: [ROLES.ADMIN] },
];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // 1. ESTADO PARA COMANDAS (ALQUILER/COMIDA)
  const [canchas, setCanchas] = useState(initialCanchas);
  const [openOrders, setOpenOrders] = useState(initialOpenOrders);

  // 2. ESTADO NUEVO PARA VENTAS DE ACCESORIOS
  // Inicializamos con arrays vacíos para que VentaAccesorios pueda inicializar las canchas
  const [canchasAccesorios, setCanchasAccesorios] = useState([]);
  const [openVentasAccesorios, setOpenVentasAccesorios] = useState([]);


  const handleLoginSuccess = (role) => {
    setIsLoggedIn(true);
    setUserRole(role);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setUserRole(null);
  };

  // Filtrar rutas permitidas según el rol
  const allowedRoutes = useMemo(() => (
    appRoutes.filter(route => route.roles.includes(userRole))
  ), [userRole]);

  // Componente específico para Comandas (con props)
  const comandasElement = (
    <Comandas 
      canchas={canchas} 
      setCanchas={setCanchas} 
      openOrders={openOrders} 
      setOpenOrders={setOpenOrders} 
    />
  );

  // Componente específico para Ventas de Accesorios (con props)
  const accesoriosElement = (
    <VentasAccesorios
      canchas={canchasAccesorios}
      setCanchas={setCanchasAccesorios}
      openVentas={openVentasAccesorios}
      setOpenVentas={setOpenVentasAccesorios}
    />
  );


  // Mostrar Login si no está autenticado
  if (!isLoggedIn) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Router>
      <>
        <nav>
          <div className="nav-container full-width-nav">
            <ul>
              {allowedRoutes.map(route => (
                <li key={route.path}>
                  <Link to={route.path}>{route.name}</Link>
                </li>
              ))}
              <li>
                <button onClick={handleLogout}>Cerrar sesión</button>
              </li>
            </ul>
          </div>
        </nav>

        <Routes>
          {allowedRoutes.map(route => (
            <Route
              key={route.path}
              path={route.path}
              // 3. RENDERIZACIÓN CONDICIONAL DE ELEMENTOS CON PROPS
              element={
                route.path === '/comandas' 
                  ? comandasElement
                  : route.path === '/ventas-accesorios'
                    ? accesoriosElement
                    : route.element
              }
            />
          ))}
          {/* Ruta por defecto */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </>
    </Router>
  );
}

export default App;
