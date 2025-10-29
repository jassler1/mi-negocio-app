import React from 'react';
import { Link } from 'react-router-dom';

const CajeroDashboard = () => {
  return (
    <div>
      <h1>Dashboard de Cajero</h1>
      <nav>
        <ul>
          <li><Link to="/ingresos-y-egresos">Ingresos y Egresos</Link></li>
        </ul>
      </nav>
    </div>
  );
};

export default CajeroDashboard;
