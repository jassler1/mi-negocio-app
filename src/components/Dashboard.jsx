import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Obtener el rol del usuario desde localStorage
    const rol = localStorage.getItem('usuarioRol');

    if (rol === 'admin') {
      // Si el rol es admin, redirigir al dashboard de administrador
      navigate('/admin-dashboard');
    } else if (rol === 'cajero') {
      // Si el rol es cajero, redirigir al dashboard de cajero
      navigate('/cajero-dashboard');
    } else {
      // Si no se encuentra un rol válido, redirigir al login
      navigate('/login');
    }
  }, [navigate]);

  return <div>Redirigiendo...</div>;
};

export default Dashboard;
