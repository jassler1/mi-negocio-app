import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import './ReporteEgresos.css';
import { FaMoneyBillWave, FaListAlt, FaSpinner, FaTable } from 'react-icons/fa';

function ReporteEgresos() {
  const [egresos, setEgresos] = useState([]);
  const [loading, setLoading] = useState(true);

  const egresosCollectionRef = collection(db, 'egresos');

  useEffect(() => {
    const fetchEgresos = async () => {
      try {
        const q = query(egresosCollectionRef, orderBy('fecha', 'desc'));
        const data = await getDocs(q);
        const egresosData = data.docs.map(doc => ({ ...doc.data(), id: doc.id }));
        setEgresos(egresosData);
        setLoading(false);
      } catch (error) {
        console.error("Error al obtener los egresos: ", error);
        setLoading(false);
      }
    };

    fetchEgresos();
  }, []);

  const totalEgresos = egresos.reduce((acc, egreso) => acc + egreso.monto, 0);
  const totalTransacciones = egresos.length;

  // Formato de la fecha
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    // Si es un objeto de Firebase Timestamp
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    }
    // Si es una cadena de texto, asumir que ya está en el formato correcto o intentar convertir
    return new Date(timestamp).toLocaleDateString('es-ES');
  };

  return (
    <div className="egresos-dashboard">
      <h1 className="dashboard-title">
        <FaListAlt className="title-icon" /> Reporte Histórico de Egresos
      </h1>

      <div className="summary-cards-container">
        <div className="summary-card total-egresos-card">
          <FaMoneyBillWave className="card-icon" />
          <div className="card-content">
            <span className="card-label">Total de Egresos</span>
            <span className="card-value">Bs. {totalEgresos.toFixed(2)}</span>
          </div>
        </div>
        <div className="summary-card total-transacciones-card">
          <FaTable className="card-icon" />
          <div className="card-content">
            <span className="card-label">Número de Transacciones</span>
            <span className="card-value">{totalTransacciones}</span>
          </div>
        </div>
      </div>

      <div className="egresos-table-container">
        {loading ? (
          <p className="loading-status">
            <FaSpinner className="spinner" /> Cargando datos...
          </p>
        ) : (
          <>
            {egresos.length === 0 ? (
              <p className="no-data-message">No hay egresos registrados.</p>
            ) : (
              <div className="table-responsive">
                <table className="egresos-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Concepto</th>
                      <th>Categoría</th>
                      <th>Monto (Bs.)</th>
                      <th>Recibo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {egresos.map(egreso => (
                      <tr key={egreso.id}>
                        <td>{formatDate(egreso.fecha)}</td>
                        <td>{egreso.concepto}</td>
                        <td>{egreso.categoria}</td>
                        <td className="monto-cell">Bs. {egreso.monto.toFixed(2)}</td>
                        <td>{egreso.numeroRecibo}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default ReporteEgresos;