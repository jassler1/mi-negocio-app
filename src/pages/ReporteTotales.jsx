import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
// === FORMATEADOR DE FECHAS
// =======================================================================
const formatDate = (dateValue) => {
  if (!dateValue) return 'N/A';

  const dateObj = dateValue?.toDate?.() || new Date(dateValue);
  if (isNaN(dateObj.getTime())) return 'N/A';

  return format(dateObj, 'dd/MM/yy HH:mm:ss');
};

// =======================================================================
// === CONSTANTES
// =======================================================================
const COLLECTIONS = {
  INGRESOS: 'ingresos',
  VENTAS: 'ventas',
  COMANDAS: 'comandas_pagadas',
  EGRESOS: 'egresos',
};

const TRANSACTION_TYPES = {
  ALQUILER: 'Alquiler/Clases',
  ACCESORIOS: 'Venta Accesorios',
  COMANDA: 'Comanda',
  EGRESO: 'Egreso',
};

const PAYMENT_METHODS = ['all', 'Efectivo', 'Tarjeta', 'QR', 'Transferencia', 'Crédito'];

// =======================================================================
// === FUNCIÓN AUXILIAR PARA OBTENER FECHA CONSISTENTE
// =======================================================================
const extractDate = (t) =>
  t.fechaHora?.toDate?.() || t.fecha?.toDate?.() || new Date(t.fecha);

// =======================================================================
// === PARSER GENERAL PARA CADA COLECCIÓN
// =======================================================================
const parseData = {
  ingresos: (doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      tipo: TRANSACTION_TYPES.ALQUILER,
      monto: Number(data.monto) || 0,
      metodoPago: data.metodoPago || 'N/A',
      fecha: data.fechaHora || data.fecha,
      detalle: `${data.concepto} (Cat: ${data.categoria}) | Cliente: ${data.clienteNombre || 'Anónimo'}`,
    };
  },

  ventas: (doc) => {
    const data = doc.data();
    const productos = data.productos?.map(p => `${p.cantidad}x${p.nombre}`).join(', ') || 'Sin productos';
    return {
      ...data,
      id: doc.id,
      tipo: TRANSACTION_TYPES.ACCESORIOS,
      monto: Number(data.total) || 0,
      metodoPago: data.metodoPago || 'N/A',
      fecha: data.fechaHora || data.fecha,
      detalle: `Venta Accesorios (${data.clienteNombre || 'Anónimo'} / ${data.ubicacion}) | Productos: ${productos}`,
    };
  },

  comandas: (doc) => {
    const data = doc.data();
    const productos = data.productos?.map(p => `${p.cantidad}x${p.nombre}`).join(', ') || 'Sin productos';
    return {
      ...data,
      id: doc.id,
      tipo: TRANSACTION_TYPES.COMANDA,
      monto: Number(data.total) || 0,
      metodoPago: data.metodoPago || 'N/A',
      fecha: data.fechaHora || data.fechaComanda || data.fecha,
      detalle: `Comanda - ${data.ubicacion} (${data.clienteNombre || 'Anónimo'}) | Productos: ${productos}`,
    };
  },

  egresos: (doc) => {
    const data = doc.data();
    return {
      ...data,
      id: doc.id,
      tipo: TRANSACTION_TYPES.EGRESO,
      monto: (Number(data.monto) || 0) * -1,
      metodoPago: data.fuentePago || 'N/A',
      fecha: data.fechaHora || data.fecha,
      detalle: `Egreso: ${data.concepto} (${data.categoria})${data.numeroRecibo ? ` | Recibo ${data.numeroRecibo}` : ''}`,
    };
  }
};

// =======================================================================
// === COMPONENTE PRINCIPAL
// =======================================================================
function ReporteTotales() {
  const [allTransactions, setAllTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [filterType, setFilterType] = useState('all');
  const [filterPaymentMethod, setFilterPaymentMethod] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Totales
  const totals = useMemo(() => {
    const ingresos = filteredTransactions.filter(t => t.monto > 0);
    const egresos = filteredTransactions.filter(t => t.monto < 0);

    const sumar = (arr) => arr.reduce((acc, t) => acc + t.monto, 0);

    return {
      ingresosAlquiler: sumar(ingresos.filter(t => t.tipo === TRANSACTION_TYPES.ALQUILER)),
      ventasAccesorios: sumar(ingresos.filter(t => t.tipo === TRANSACTION_TYPES.ACCESORIOS)),
      comandasPagadas: sumar(ingresos.filter(t => t.tipo === TRANSACTION_TYPES.COMANDA)),
      generalIngresos: sumar(ingresos),
      generalEgresos: Math.abs(sumar(egresos)),
      balanceNeto: sumar(ingresos) + sumar(egresos),
    };
  }, [filteredTransactions]);

  // =======================================================================
  // === FETCH PRINCIPAL
  // =======================================================================
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const refs = [
        collection(db, COLLECTIONS.INGRESOS),
        collection(db, COLLECTIONS.VENTAS),
        collection(db, COLLECTIONS.COMANDAS),
        collection(db, COLLECTIONS.EGRESOS)
      ];

      const snapshots = await Promise.all(
        refs.map(ref => getDocs(query(ref, orderBy('fecha', 'desc'))))
      );

      const [ingresos, ventas, comandas, egresos] = snapshots;

      const parsed = [
        ...ingresos.docs.map(parseData.ingresos),
        ...ventas.docs.map(parseData.ventas),
        ...comandas.docs.map(parseData.comandas),
        ...egresos.docs.map(parseData.egresos),
      ];

      parsed.sort((a, b) => extractDate(b) - extractDate(a));

      setAllTransactions(parsed);
    } catch (err) {
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAllData(); }, [fetchAllData]);

  // =======================================================================
  // === FILTRADO (MEMOIZADO)
  // =======================================================================
  useEffect(() => {
    let data = [...allTransactions];

    // Tipo
    const typeMap = {
      'ingresos-alquiler': TRANSACTION_TYPES.ALQUILER,
      'ventas-accesorios': TRANSACTION_TYPES.ACCESORIOS,
      'comandas': TRANSACTION_TYPES.COMANDA,
      'egresos': TRANSACTION_TYPES.EGRESO,
    };
    if (filterType !== 'all') {
      const tipo = typeMap[filterType];
      data = tipo ? data.filter(t => t.tipo === tipo) : data;
      if (filterType === 'ingresos-general') data = data.filter(t => t.monto > 0);
    }

    // Método pago
    if (filterPaymentMethod !== 'all') {
      data = data.filter(t => t.metodoPago === filterPaymentMethod);
    }

    // Fechas
    const start = startDate ? new Date(startDate) : null;
    const end = endDate ? new Date(endDate) : null;

    if (start || end) {
      data = data.filter(t => {
        const d = extractDate(t);
        if (start && d < start) return false;
        if (end) {
          const endPlus = new Date(end);
          endPlus.setDate(endPlus.getDate() + 1);
          if (d >= endPlus) return false;
        }
        return true;
      });
    }

    setFilteredTransactions(data);
  }, [filterType, filterPaymentMethod, startDate, endDate, allTransactions]);

  // =======================================================================
  // === EXPORTAR A EXCEL
  // =======================================================================
  const exportToExcel = () => {
    const data = filteredTransactions.map(t => ({
      'Fecha y Hora': formatDate(t.fecha),
      'Tipo': t.tipo,
      'Método de Pago': t.metodoPago,
      'Detalle': t.detalle,
      'Monto': t.monto.toFixed(2),
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');

    XLSX.writeFile(workbook, `reporte-transacciones-${filterType}.xlsx`);
  };

  // =======================================================================
  // === RENDER
  // =======================================================================
  return (
    <div className="ReporteTotales-container">
      <h2>Reporte Totales</h2>

      {/* ===================== FILTROS ===================== */}
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
            {PAYMENT_METHODS.map(m => <option key={m}>{m}</option>)}
          </select>
        </label>

        <label>
          <FaCalendarAlt /> Fecha Inicio:
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
        </label>

        <label>
          <FaCalendarAlt /> Fecha Fin:
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} />
        </label>

        <button onClick={exportToExcel}>
          <FaFileExcel /> Exportar Excel
        </button>
      </div>

      {/* ===================== TABLA ===================== */}
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
                    <td>{formatDate(t.fecha)}</td>
                    <td>{t.tipo}</td>
                    <td>{t.metodoPago}</td>
                    <td>{t.detalle}</td>
                    <td>
                      <span style={{ color: t.monto < 0 ? 'red' : 'green' }}>
                        Bs. {t.monto.toFixed(2)}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>

          {/* ===================== TOTALES ===================== */}
          <div className="totals-summary">
            <p><FaChartLine /> Total Ingresos Alquiler/Clases: Bs. {totals.ingresosAlquiler.toFixed(2)}</p>
            <p><FaMoneyBillWave /> Total Ventas Accesorios: Bs. {totals.ventasAccesorios.toFixed(2)}</p>
            <p><FaTable /> Total Comandas Pagadas: Bs. {totals.comandasPagadas.toFixed(2)}</p>
            <p><FaMoneyBillWave /> Total General Ingresos: <strong>Bs. {totals.generalIngresos.toFixed(2)}</strong></p>
            <p><FaMoneyBillWave /> Total General Egresos: Bs. {totals.generalEgresos.toFixed(2)}</p>
            <p><strong>Balance Neto: Bs. {totals.balanceNeto.toFixed(2)}</strong></p>
          </div>
        </>
      )}
    </div>
  );
}

export default ReporteTotales;