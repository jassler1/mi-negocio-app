import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot } from 'firebase/firestore';
import './Historial.css';

function Historial() {
  const [movimientos, setMovimientos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const ingresosCollectionRef = collection(db, 'ingresos');
  const egresosCollectionRef = collection(db, 'egresos');
  const ventasCollectionRef = collection(db, 'ventas');
  const comandasCollectionRef = collection(db, 'comandas_pagadas');
  const loginLogsRef = collection(db, 'logs_login');  // Nueva colección para login
  const accionesLogsRef = collection(db, 'logs_acciones');  // Nueva colección para acciones/clicks

  useEffect(() => {
    let isMounted = true;
    let sourceData = {
      ventas: [],
      comandas: [],
      egresos: [],
      ingresos: [],
      loginLogs: [],
      accionesLogs: []
    };

    const updateCombinedData = (source, data) => {
      sourceData[source] = data;
      const newCombined = Object.values(sourceData).flatMap(arr => arr);

      newCombined.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      if (isMounted) {
        setMovimientos(newCombined);
        setLoading(false);
      }
    };

    // Subscripciones a colecciones
    const unsubscribeVentas = onSnapshot(ventasCollectionRef, (snapshot) => {
      const ventasList = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Venta de Accesorios',
        usuario: doc.data().usuario || 'N/A',
        fecha: doc.data().fecha,
        ...doc.data(),
      }));
      updateCombinedData('ventas', ventasList);
    });

    const unsubscribeComandas = onSnapshot(comandasCollectionRef, (snapshot) => {
      const comandasList = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Comanda',
        usuario: doc.data().cajero || 'N/A',
        fecha: doc.data().fecha,
        ...doc.data(),
      }));
      updateCombinedData('comandas', comandasList);
    });

    const unsubscribeEgresos = onSnapshot(egresosCollectionRef, (snapshot) => {
      const egresosList = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Egreso',
        usuario: doc.data().usuario || 'N/A',
        fecha: doc.data().fecha,
        ...doc.data(),
      }));
      updateCombinedData('egresos', egresosList);
    });

    const unsubscribeIngresos = onSnapshot(ingresosCollectionRef, (snapshot) => {
      const ingresosList = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Ingreso',
        usuario: doc.data().usuario || 'N/A',
        fecha: doc.data().fecha,
        ...doc.data(),
      }));
      updateCombinedData('ingresos', ingresosList);
    });

    // Subscripción a logs de login
    const unsubscribeLoginLogs = onSnapshot(loginLogsRef, (snapshot) => {
      const loginList = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Login',
        usuario: doc.data().usuario || 'N/A',
        fecha: doc.data().fecha,
        detalle: doc.data().detalle || '', // opcional
      }));
      updateCombinedData('loginLogs', loginList);
    });

    // Subscripción a logs de acciones (clicks, registros, etc)
    const unsubscribeAccionesLogs = onSnapshot(accionesLogsRef, (snapshot) => {
      const accionesList = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: doc.data().tipoAccion || 'Acción',
        usuario: doc.data().usuario || 'N/A',
        fecha: doc.data().fecha,
        detalle: doc.data().detalle || '', // descripción de la acción
      }));
      updateCombinedData('accionesLogs', accionesList);
    });

    return () => {
      isMounted = false;
      unsubscribeVentas();
      unsubscribeComandas();
      unsubscribeEgresos();
      unsubscribeIngresos();
      unsubscribeLoginLogs();
      unsubscribeAccionesLogs();
    };
  }, []);

  // Filtrar por rango de fechas
  const filteredMovimientos = movimientos.filter(movimiento => {
    const movementDate = new Date(movimiento.fecha);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && movementDate < start) return false;
    if (end && movementDate > end) return false;
    return true;
  });

  if (loading) {
    return <div className="loading">Cargando historial...</div>;
  }

  return (
    <div className="historial-container">
      <h2 className="historial-title">Historial de Movimientos</h2>
      
      <div className="filters">
        <div className="date-filter">
          <label htmlFor="startDate">Desde:</label>
          <input
            type="date"
            id="startDate"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>
        <div className="date-filter">
          <label htmlFor="endDate">Hasta:</label>
          <input
            type="date"
            id="endDate"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
      </div>

      {filteredMovimientos.length > 0 ? (
        <table className="historial-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Usuario</th>
              <th>Tipo</th>
              <th>Concepto / Detalle</th>
              <th>Monto (Bs.)</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovimientos.map((movimiento) => (
              <tr key={movimiento.id}>
                <td>{new Date(movimiento.fecha).toLocaleString()}</td>
                <td>{movimiento.usuario}</td>
                <td>{movimiento.tipo}</td>
                <td className="concepto-cell">
                  {movimiento.tipo === 'Venta de Accesorios' && 'Venta de Accesorios'}
                  {movimiento.tipo === 'Comanda' && `Comanda para ${movimiento.clienteNombre || 'N/A'}`}
                  {movimiento.tipo === 'Ingreso' && movimiento.concepto}
                  {movimiento.tipo === 'Egreso' && movimiento.concepto}
                  {movimiento.tipo === 'Login' && (movimiento.detalle || 'Inicio de sesión')}
                  {movimiento.tipo === 'Acción' && (movimiento.detalle || 'Acción realizada')}
                  {!['Venta de Accesorios','Comanda','Ingreso','Egreso','Login','Acción'].includes(movimiento.tipo) && movimiento.detalle}
                </td>
                <td className={`monto-cell ${movimiento.tipo === 'Egreso' ? 'egreso' : 'ingreso'}`}>
                  {movimiento.monto !== undefined
                    ? (movimiento.tipo === 'Egreso' ? `-${movimiento.monto.toFixed(2)}` : movimiento.monto.toFixed(2))
                    : '-'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-data-msg">No hay movimientos registrados para las fechas seleccionadas.</p>
      )}
    </div>
  );
}

export default Historial;