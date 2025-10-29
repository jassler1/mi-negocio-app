import React from 'react';
import { Link } from 'react-router-dom';

const AdminDashboard = () => {
  return (
    <div>
      <h1>Dashboard de Administrador</h1>
      <nav>
        <ul>
          <li><Link to="/gestion-usuarios">Gestionar Usuarios</Link></li>
          <li><Link to="/gestion-productos">Gestionar Productos</Link></li>
          <li><Link to="/ingresos-y-egresos">Ingresos y Egresos</Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default AdminDashboard;
