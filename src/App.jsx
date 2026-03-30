import React, { useState, useMemo, useEffect } from 'react';
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
import VentasAccesorios from './pages/VentasAccesorios.jsx';
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
  { path: '/comandas', name: 'Comandas', element: <Comandas />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/ventas-accesorios', name: 'Ventas de Accesorios', element: <VentasAccesorios />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/egresos', name: 'Egresos', element: <Egresos />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/ingresos', name: 'Ingresos', element: <Ingresos />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/gestion-clientes', name: 'Gestión de Clientes', element: <ClientManagement />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/inventario', name: 'Inventario', element: <InventoryManagement />, roles: [ROLES.CAJERO, ROLES.ADMIN] },
  { path: '/reporte-totales', name: 'Reporte Totales', element: <ReporteTotales />, roles: [ROLES.ADMIN] },
  { path: '/gestion-usuarios', name: 'Gestión de Usuarios', element: <UserManagement />, roles: [ROLES.ADMIN] },
];

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState(null);

  // ✅ CARGAR DESDE LOCALSTORAGE AL INICIAR
  const [canchas, setCanchas] = useState(() => {
    try {
      const saved = localStorage.getItem('canchas');
      return saved ? JSON.parse(saved) : initialCanchas;
    } catch (e) {
      console.error('Error loading canchas:', e);
      return initialCanchas;
    }
  });

  const [openOrders, setOpenOrders] = useState(() => {
    try {
      const saved = localStorage.getItem('openOrders');
      return saved ? JSON.parse(saved) : initialOpenOrders;
    } catch (e) {
      console.error('Error loading openOrders:', e);
      return initialOpenOrders;
    }
  });

  const [canchasAccesorios, setCanchasAccesorios] = useState(() => {
    try {
      const saved = localStorage.getItem('canchasAccesorios');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading canchasAccesorios:', e);
      return [];
    }
  });

  const [openVentasAccesorios, setOpenVentasAccesorios] = useState(() => {
    try {
      const saved = localStorage.getItem('openVentasAccesorios');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Error loading openVentasAccesorios:', e);
      return [];
    }
  });

  // ✅ GUARDAR A LOCALSTORAGE CUANDO CAMBIEN
  useEffect(() => {
    try {
      localStorage.setItem('canchas', JSON.stringify(canchas));
    } catch (e) {
      console.error('Error saving canchas:', e);
    }
  }, [canchas]);

  useEffect(() => {
    try {
      localStorage.setItem('openOrders', JSON.stringify(openOrders));
    } catch (e) {
      console.error('Error saving openOrders:', e);
    }
  }, [openOrders]);

  useEffect(() => {
    try {
      localStorage.setItem('canchasAccesorios', JSON.stringify(canchasAccesorios));
    } catch (e) {
      console.error('Error saving canchasAccesorios:', e);
    }
  }, [canchasAccesorios]);

  useEffect(() => {
    try {
      localStorage.setItem('openVentasAccesorios', JSON.stringify(openVentasAccesorios));
    } catch (e) {
      console.error('Error saving openVentasAccesorios:', e);
    }
  }, [openVentasAccesorios]);

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
