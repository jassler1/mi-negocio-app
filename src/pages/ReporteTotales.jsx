import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import './ReporteTotales.css';
import { FaChartLine, FaMoneyBillWave, FaSpinner, FaTable, FaFileInvoiceDollar, FaFilter, FaDownload } from 'react-icons/fa';
import jsPDF from 'jspdf';
// Nota: La importación de jspdf-autotable se ha eliminado de aquí para usarla de forma dinámica.

function ReporteTotales() {
  const [ingresos, setIngresos] = useState([]);
  const [ventas, setVentas] = useState([]);
  const [comandas, setComandas] = useState([]);
  const [egresos, setEgresos] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [filterType, setFilterType] = useState('all');
  const [loading, setLoading] = useState(true);

  const ingresosCollectionRef = collection(db, 'ingresos');
  const ventasCollectionRef = collection(db, 'ventas');
  const comandasCollectionRef = collection(db, 'comandas_pagadas');
  const egresosCollectionRef = collection(db, 'egresos');

  useEffect(() => {
    const fetchAllData = async () => {
      try {
        const [ingresosSnapshot, ventasSnapshot, comandasSnapshot, egresosSnapshot] = await Promise.all([
          getDocs(query(ingresosCollectionRef, orderBy('fecha', 'desc'))),
          getDocs(query(ventasCollectionRef, orderBy('fecha', 'desc'))),
          getDocs(query(comandasCollectionRef, orderBy('fecha', 'desc'))),
          getDocs(query(egresosCollectionRef, orderBy('fecha', 'desc'))),
        ]);

        const fetchedIngresos = ingresosSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          tipo: 'Alquiler',
          monto: doc.data().monto,
          detalle: doc.data().concepto,
        }));

        const fetchedVentas = ventasSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          tipo: 'Venta',
          monto: doc.data().total,
          detalle: `Venta a cancha ${doc.data().cancha}`,
        }));
        
        const fetchedComandas = comandasSnapshot.docs.map(doc => ({
            ...doc.data(),
            id: doc.id,
            tipo: 'Comanda',
            monto: doc.data().total,
            detalle: `Comanda en ${doc.data().ubicacion}`,
        }));

        const fetchedEgresos = egresosSnapshot.docs.map(doc => ({
          ...doc.data(),
          id: doc.id,
          tipo: 'Egreso',
          monto: doc.data().monto * -1,
          detalle: `Egreso: ${doc.data().concepto}`,
        }));

        setIngresos(fetchedIngresos);
        setVentas(fetchedVentas);
        setComandas(fetchedComandas);
        setEgresos(egresosSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id })));

        const all = [...fetchedIngresos, ...fetchedVentas, ...fetchedComandas, ...fetchedEgresos];
        all.sort((a, b) => {
          const dateA = a.fecha && a.fecha.toDate ? a.fecha.toDate() : new Date(a.fecha);
          const dateB = b.fecha && b.fecha.toDate ? b.fecha.toDate() : new Date(b.fecha);
          return dateB - dateA;
        });
        setAllTransactions(all);
        setFilteredTransactions(all);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data: ", error);
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  useEffect(() => {
    let newFiltered = [];
    if (filterType === 'all') {
      newFiltered = allTransactions;
    } else if (filterType === 'ingresos') {
      newFiltered = allTransactions.filter(t => t.monto > 0);
    } else if (filterType === 'egresos') {
      newFiltered = allTransactions.filter(t => t.monto < 0);
    } else if (filterType === 'comandas') {
      newFiltered = allTransactions.filter(t => t.tipo === 'Comanda');
    }
    setFilteredTransactions(newFiltered);
  }, [filterType, allTransactions]);

  const totalIngresos = ingresos.reduce((acc, i) => acc + i.monto, 0);
  const totalVentas = ventas.reduce((acc, v) => acc + v.monto, 0);
  const totalComandas = comandas.reduce((acc, c) => acc + c.monto, 0);
  const totalGeneralIngresos = totalIngresos + totalVentas + totalComandas;
  const totalGeneralEgresos = egresos.reduce((acc, e) => acc + e.monto, 0);
  const balanceNeto = totalGeneralIngresos - totalGeneralEgresos;
  
  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('es-ES', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    }
    return new Date(timestamp).toLocaleDateString('es-ES');
  };

  const generatePDF = async () => {
    // Corregido: Importación dinámica para asegurar que el plugin se cargue correctamente
    await import('jspdf-autotable'); 
    
    const doc = new jsPDF();
    doc.text("Reporte de Transacciones", 14, 20);
  
    const tableColumn = ["Fecha", "Tipo", "Detalle", "Monto (Bs.)"];
    const tableRows = filteredTransactions.map(transaction => [
      formatDate(transaction.fecha),
      transaction.tipo,
      transaction.detalle,
      `Bs. ${transaction.monto.toFixed(2)}`
    ]);
  
    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 30,
      styles: {
        fontSize: 10,
        cellPadding: 2
      },
      headStyles: {
        fillColor: [41, 128, 185],
        textColor: 255
      }
    });
  
    doc.save(`reporte-transacciones-${filterType}.pdf`);
  };

  return (
    <div className="ingresos-dashboard">
      <h1 className="dashboard-title">
        <FaChartLine className="title-icon" /> Reporte Financiero Completo
      </h1>

      <div className="summary-cards-container">
        <div className="summary-card total-general-card">
          <FaMoneyBillWave className="card-icon" />
          <div className="card-content">
            <span className="card-label">Total Ingresos Generales</span>
            <span className="card-value">Bs. {totalGeneralIngresos.toFixed(2)}</span>
          </div>
        </div>
        <div className="summary-card egresos-card">
          <FaFileInvoiceDollar className="card-icon" />
          <div className="card-content">
            <span className="card-label">Total Egresos</span>
            <span className="card-value">Bs. {totalGeneralEgresos.toFixed(2)}</span>
          </div>
        </div>
        <div className={`summary-card balance-card ${balanceNeto >= 0 ? 'balance-positivo' : 'balance-negativo'}`}>
          <FaMoneyBillWave className="card-icon" />
          <div className="card-content">
            <span className="card-label">Balance Neto</span>
            <span className="card-value">Bs. {balanceNeto.toFixed(2)}</span>
          </div>
        </div>
      </div>

      <div className="transactions-table-container">
        <h2 className="table-title">
          <FaTable /> Historial de Transacciones
        </h2>
        <div className="filter-container">
          <FaFilter className="filter-icon" />
          <button 
            className={`filter-btn ${filterType === 'all' ? 'active' : ''}`}
            onClick={() => setFilterType('all')}
          >
            Todas las Transacciones
          </button>
          <button 
            className={`filter-btn ${filterType === 'ingresos' ? 'active' : ''}`}
            onClick={() => setFilterType('ingresos')}
          >
            Ingresos
          </button>
          <button 
            className={`filter-btn ${filterType === 'egresos' ? 'active' : ''}`}
            onClick={() => setFilterType('egresos')}
          >
            Egresos
          </button>
          <button 
            className={`filter-btn ${filterType === 'comandas' ? 'active' : ''}`}
            onClick={() => setFilterType('comandas')}
          >
            Comandas
          </button>
          <button className="download-btn" onClick={generatePDF}>
            <FaDownload /> Descargar PDF
          </button>
        </div>
        {loading ? (
          <p className="loading-status">
            <FaSpinner className="spinner" /> Cargando historial de transacciones...
          </p>
        ) : (
          <>
            {filteredTransactions.length === 0 ? (
              <p className="no-data-message">No hay transacciones registradas para este filtro.</p>
            ) : (
              <div className="table-responsive">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Fecha</th>
                      <th>Tipo</th>
                      <th>Detalle</th>
                      <th>Monto (Bs.)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map((transaction, index) => (
                      <tr key={index} className={transaction.monto < 0 ? 'egreso-row' : 'ingreso-row'}>
                        <td>{formatDate(transaction.fecha)}</td>
                        <td>{transaction.tipo}</td>
                        <td>{transaction.detalle}</td>
                        <td className="monto-cell">Bs. {transaction.monto.toFixed(2)}</td>
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

export default ReporteTotales;