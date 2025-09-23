import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
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

  useEffect(() => {
    let isMounted = true;
    
    // Escucha todos los cambios en las colecciones en tiempo real
    const unsubscribeVentas = onSnapshot(ventasCollectionRef, (snapshot) => {
      if (!isMounted) return;
      const ventasList = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Venta de Accesorios',
        usuario: doc.data().usuario || 'N/A',
        ...doc.data(),
      }));
      updateCombinedData('ventas', ventasList);
    });

    const unsubscribeComandas = onSnapshot(comandasCollectionRef, (snapshot) => {
      if (!isMounted) return;
      const comandasList = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Comanda',
        usuario: doc.data().cajero || 'N/A',
        ...doc.data(),
      }));
      updateCombinedData('comandas', comandasList);
    });
    
    const unsubscribeEgresos = onSnapshot(egresosCollectionRef, (snapshot) => {
      if (!isMounted) return;
      const egresosList = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Egreso',
        usuario: doc.data().usuario || 'N/A',
        ...doc.data(),
      }));
      updateCombinedData('egresos', egresosList);
    });
    
    const unsubscribeIngresos = onSnapshot(ingresosCollectionRef, (snapshot) => {
      if (!isMounted) return;
      const ingresosList = snapshot.docs.map(doc => ({
        id: doc.id,
        tipo: 'Ingreso',
        usuario: doc.data().usuario || 'N/A',
        ...doc.data(),
      }));
      updateCombinedData('ingresos', ingresosList);
    });
    
    let sourceData = {
      ventas: [],
      comandas: [],
      egresos: [],
      ingresos: []
    };

    const updateCombinedData = (source, data) => {
      sourceData[source] = data;
      const newCombined = Object.values(sourceData).flatMap(arr => arr);
        
      newCombined.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      setMovimientos(newCombined);
      setLoading(false);
    };

    return () => {
      isMounted = false;
      unsubscribeVentas();
      unsubscribeComandas();
      unsubscribeEgresos();
      unsubscribeIngresos();
    };
  }, []);

  const filteredMovimientos = movimientos.filter(movimiento => {
    const movementDate = new Date(movimiento.fecha);
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start && movementDate < start) {
      return false;
    }
    if (end && movementDate > end) {
      return false;
    }
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
              <th>Concepto</th>
              <th>Monto (Bs.)</th>
            </tr>
          </thead>
          <tbody>
            {filteredMovimientos.map((movimiento) => (
              <tr key={movimiento.id}>
                <td>{movimiento.fecha}</td>
                <td>{movimiento.usuario}</td>
                <td>{movimiento.tipo}</td>
                <td className="concepto-cell">
                  {movimiento.tipo === 'Venta de Accesorios' ? 'Venta de Accesorios' :
                   movimiento.tipo === 'Comanda' ? `Comanda para ${movimiento.clienteNombre}` :
                   movimiento.concepto}
                </td>
                <td className={`monto-cell ${movimiento.tipo === 'Egreso' ? 'egreso' : 'ingreso'}`}>
                  {movimiento.tipo === 'Egreso' ? `-${movimiento.monto.toFixed(2)}` : movimiento.total ? movimiento.total.toFixed(2) : movimiento.monto.toFixed(2)}
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