import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore'; 
import './ReporteTotales.css';
import {
  FaChartLine, FaMoneyBillWave, FaSpinner, FaTable,
  FaFileExcel, FaFilter, FaCalendarAlt
} from 'react-icons/fa';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

// =======================================================================
// === FUNCIÓN CORREGIDA: Formatea el Timestamp/Date a DD/MM/YY HH:MM:SS
// =======================================================================
const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';
  
  // Si es un Timestamp de Firestore (como el que guardamos con serverTimestamp)
  const dateObj = dateValue.toDate 
    ? dateValue.toDate() 
    : new Date(dateValue); // Si es un string de fecha simple

  // Si la conversión resulta en una fecha inválida, devolver N/A
  if (isNaN(dateObj.getTime())) return 'N/A';
  
  // El formato 'HH:mm:ss' es clave para mostrar la hora
  return format(dateObj, 'dd/MM/yy HH:mm:ss');
};
// =======================================================================

function ReporteTotales() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);

  // ✅ NUEVOS ESTADOS para guardar los totales filtrados
  const [totalIngresosAlquiler, setTotalIngresosAlquiler] = useState(0);
  const [totalVentasAccesorios, setTotalVentasAccesorios] = useState(0);
  const [totalComandasPagadas, setTotalComandasPagadas] = useState(0);
  const [totalGeneralIngresos, setTotalGeneralIngresos] = useState(0);
  const [totalGeneralEgresos, setTotalGeneralEgresos] = useState(0);
  const [balanceNeto, setBalanceNeto] = useState(0);

  const [filterType, setFilterType] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [loading, setLoading] = useState(true);

  const ingresosCollectionRef = collection(db, 'ingresos');
  const ventasCollectionRef = collection(db, 'ventas');
  const comandasCollectionRef = collection(db, 'comandas_pagadas');
  const egresosCollectionRef = collection(db, 'egresos');

  const paymentMethodsOptions = ['all', 'Efectivo', 'Tarjeta', 'QR', 'Transferencia', 'Crédito'];

  const fetchAllData = async () => {
    setLoading(true);
    try {
      // Usamos 'fecha' en Firestore query para la ordenación inicial.
      const [ingresosSnapshot, ventasSnapshot, comandasSnapshot, egresosSnapshot] = await Promise.all([
        getDocs(query(ingresosCollectionRef, orderBy('fecha', 'desc'))),
        getDocs(query(ventasCollectionRef, orderBy('fecha', 'desc'))),
        getDocs(query(comandasCollectionRef, orderBy('fecha', 'desc'))),
        getDocs(query(egresosCollectionRef, orderBy('fecha', 'desc'))),
      ]);

      const fetchedIngresos = ingresosSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        tipo: 'Alquiler/Clases',
        monto: Number(doc.data().monto) || 0,
        detalle: `Ingreso - ${doc.data().concepto}`,
        metodoPago: doc.data().metodoPago || 'N/A',
        // ✅ Prioriza fechaHora
        fecha: doc.data().fechaHora || doc.data().fecha, 
        fechaHora: doc.data().fechaHora, // Mantener fechaHora para ordenación local
      }));

      const fetchedVentas = ventasSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        tipo: 'Venta Accesorios',
        monto: Number(doc.data().total) || 0,
        detalle: `Venta Accesorios para ${doc.data().clienteNombre || 'Anónimo'}`,
        metodoPago: doc.data().metodoPago || 'N/A',
        // ✅ Prioriza fechaHora
        fecha: doc.data().fechaHora || doc.data().fecha,
        fechaHora: doc.data().fechaHora, // Mantener fechaHora para ordenación local
      }));

      const fetchedComandas = comandasSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        tipo: 'Comanda',
        monto: Number(doc.data().total) || 0,
        detalle: `Comanda - ${doc.data().ubicacion} (${doc.data().clienteNombre || 'Anónimo'})`,
        metodoPago: doc.data().metodoPago || 'N/A',
        // ✅ Prioriza fechaHora
        fecha: doc.data().fechaHora || doc.data().fechaComanda || doc.data().fecha,
        fechaHora: doc.data().fechaHora, // Mantener fechaHora para ordenación local
      }));

      const fetchedEgresos = egresosSnapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
        tipo: 'Egreso',
        monto: (Number(doc.data().monto) || 0) * -1,
        detalle: `Egreso: ${doc.data().concepto} (${doc.data().categoria})`,
        metodoPago: doc.data().fuentePago || 'N/A',
        fecha: doc.data().fecha,
        fechaHora: doc.data().fechaHora, // Mantener fechaHora (aunque no siempre exista aquí)
      }));

      const all = [...fetchedIngresos, ...fetchedVentas, ...fetchedComandas, ...fetchedEgresos];
      
      // ✅ CORRECCIÓN: Ordenar localmente priorizando 'fechaHora' para la precisión
      all.sort((a, b) => {
        // Usa el Timestamp 'fechaHora' para ordenar si está disponible
        const dateA = a.fechaHora?.toDate?.() || a.fecha?.toDate?.() || new Date(a.fecha); 
        const dateB = b.fechaHora?.toDate?.() || b.fecha?.toDate?.() || new Date(b.fecha);
        return dateB - dateA; // Orden descendente (más reciente primero)
      });

      setAllTransactions(all);
    } catch (error) {
      console.error("Error fetching data: ", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  useEffect(() => {
    let newFiltered = allTransactions;

    // --- LÓGICA DE FILTRADO ---
    if (filterType === 'ingresos-alquiler') {
      newFiltered = newFiltered.filter(t => t.tipo === 'Alquiler/Clases');
    } else if (filterType === 'ventas-accesorios') {
      newFiltered = newFiltered.filter(t => t.tipo === 'Venta Accesorios');
    } else if (filterType === 'comandas') {
      newFiltered = newFiltered.filter(t => t.tipo === 'Comanda');
    } else if (filterType === 'egresos') {
      newFiltered = newFiltered.filter(t => t.monto < 0);
    } else if (filterType === 'ingresos-general') {
      // Filtrar todas las transacciones positivas (Ingresos, Ventas, Comandas)
      newFiltered = newFiltered.filter(t => t.monto > 0);
    }

    if (filterPaymentMethod !== 'all') {
      newFiltered = newFiltered.filter(t => (t.metodoPago || t.fuentePago) === filterPaymentMethod);
    }

    // Lógica de Filtro de Fechas
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start || end) {
      newFiltered = newFiltered.filter(t => {
        // Convierte la fecha del registro a objeto Date, priorizando fechaHora
        const recordDate = t.fechaHora?.toDate?.() || t.fecha?.toDate?.() || new Date(t.fecha);
        
        if (start && recordDate < start) return false;
        
        if (end) {
          const nextDay = new Date(end);
          nextDay.setDate(nextDay.getDate() + 1);
          if (recordDate >= nextDay) return false;
        }
        return true;
      });
    }

    setFilteredTransactions(newFiltered);

    // ✅ CÁLCULO DE TOTALES BASADO EN newFiltered
    
    // 1. Calcular subtotales
    const newTotalIngresosAlquiler = newFiltered
      .filter(t => t.tipo === 'Alquiler/Clases')
      .reduce((acc, i) => acc + i.monto, 0);

    const newTotalVentasAccesorios = newFiltered
      .filter(t => t.tipo === 'Venta Accesorios')
      .reduce((acc, v) => acc + v.monto, 0);

    const newTotalComandasPagadas = newFiltered
      .filter(t => t.tipo === 'Comanda')
      .reduce((acc, c) => acc + c.monto, 0);
      
    // 2. Calcular totales generales
    const newTotalGeneralIngresos = 
      newTotalIngresosAlquiler + newTotalVentasAccesorios + newTotalComandasPagadas;
      
    const newTotalGeneralEgresos = newFiltered
      .filter(t => t.tipo === 'Egreso')
      .reduce((acc, e) => acc + (e.monto * -1), 0); // Convertir a positivo

    const newBalanceNeto = newTotalGeneralIngresos - newTotalGeneralEgresos;

    // 3. Actualizar estados de totales
    setTotalIngresosAlquiler(newTotalIngresosAlquiler);
    setTotalVentasAccesorios(newTotalVentasAccesorios);
    setTotalComandasPagadas(newTotalComandasPagadas);
    setTotalGeneralIngresos(newTotalGeneralIngresos);
    setTotalGeneralEgresos(newTotalGeneralEgresos);
    setBalanceNeto(newBalanceNeto);

  }, [filterType, filterPaymentMethod, startDate, endDate, allTransactions]);


  const exportToExcel = () => {
    const data = filteredTransactions.map(t => ({
      'Fecha y Hora': formatDate(t.fechaHora || t.fecha), // Usar fechaHora para el Excel
      Tipo: t.tipo,
      'Método de Pago': t.metodoPago || t.fuentePago,
      Detalle: t.detalle,
      Monto: t.monto.toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Reporte");

    XLSX.writeFile(workbook, `reporte-transacciones-${filterType}.xlsx`);
  };

  return (
    <div className="ReporteTotales-container">
      <h2>Reporte Totales</h2>

      <div className="filtros-container">
        <label>
          <FaFilter /> Tipo:
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="all">Todos</option>
            <option value="ingresos-alquiler">Ingresos Alquiler/Clases</option>
            <option value="ventas-accesorios">Ventas Accesorios</option>
            <option value="comandas">Comandas</option>
            <option value="egresos">Egresos</option>
            <option value="ingresos-general">Ingresos Generales</option>
          </select>
        </label>

        <label>
          <FaMoneyBillWave /> Método Pago:
          <select value={filterPaymentMethod} onChange={e => setFilterPaymentMethod(e.target.value)}>
            {paymentMethodsOptions.map(m => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </label>

        <label>
          <FaCalendarAlt /> Fecha Inicio:
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
          />
        </label>

        <label>
          <FaCalendarAlt /> Fecha Fin:
          <input
            type="date"
            value={endDate}
            onChange={e => setEndDate(e.target.value)}
          />
        </label>

        <button onClick={exportToExcel} title="Exportar a Excel">
          <FaFileExcel /> Exportar Excel
        </button>
      </div>

      {loading ? (
        <div className="loading"><FaSpinner className="spin" /> Cargando...</div>
      ) : (
        <>
          <table className="table-report">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Tipo</th>
                <th>Método</th>
                <th>Detalle</th>
                <th>Monto (Bs.)</th>
              </tr>
            </thead>
            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr><td colSpan="5">No hay transacciones para mostrar.</td></tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id}>
                    {/* ✅ LÍNEA CLAVE: Usa fechaHora o fecha como respaldo */}
                    <td>{formatDate(t.fechaHora || t.fecha)}</td> 
                    
                    <td>{t.tipo}</td>
                    <td>{t.metodoPago || t.fuentePago}</td>
                    <td>{t.detalle}</td>
                    <td style={{ color: t.monto < 0 ? 'red' : 'green' }}>
                      Bs. {t.monto.toFixed(2)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* ✅ Totales actualizados por el filtro */}
          <div className="totals-summary">
            <p><FaChartLine /> Total Ingresos Alquiler/Clases: Bs. {totalIngresosAlquiler.toFixed(2)}</p>
            <p><FaMoneyBillWave /> Total Ventas Accesorios: Bs. {totalVentasAccesorios.toFixed(2)}</p>
            <p><FaTable /> Total Comandas Pagadas: Bs. {totalComandasPagadas.toFixed(2)}</p>
            <p><FaMoneyBillWave /> Total General Ingresos: **Bs. {totalGeneralIngresos.toFixed(2)}**</p>
            <p><FaMoneyBillWave /> Total General Egresos: Bs. {totalGeneralEgresos.toFixed(2)}</p>
            <p><strong>Balance Neto: Bs. {balanceNeto.toFixed(2)}</strong></p>
          </div>
        </>
      )}
    </div>
  );
}

export default ReporteTotales;