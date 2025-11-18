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
// === FUNCIÓN AUXILIAR DE CÁLCULO DE COSTO (CORREGIDA)
// =======================================================================
const calculateProductCost = (productos) => {
    if (!productos || productos.length === 0) return 0;

    return productos.reduce((sum, p) => {
        // ✅ CORRECCIÓN: Usamos directamente costoCompra, que es el campo del inventario
        // Se asume que este campo se copia al documento de venta/comanda
        const costoUnitario = Number(p.costoCompra) || 0; 
        const cantidad = Number(p.cantidad) || 0;
        return sum + costoUnitario * cantidad;
    }, 0);
};


// =======================================================================
// === PARSER GENERAL PARA CADA COLECCIÓN
// =======================================================================
const parseData = {
  ingresos: (doc) => {
    const data = doc.data();
    const monto = Number(data.monto) || 0;
    return {
      ...data,
      id: doc.id,
      tipo: TRANSACTION_TYPES.ALQUILER,
      monto,
      metodoPago: data.metodoPago || 'N/A',
      fecha: data.fechaHora || data.fecha,
      detalle: `${data.concepto} (Cat: ${data.categoria}) | Cliente: ${data.clienteNombre || 'Anónimo'}`,
      costoTotal: 0,
      ganancia: monto,
    };
  },

  ventas: (doc) => {
    const data = doc.data();
    const productos = data.productos?.map(p => `${p.cantidad}x${p.nombre}`).join(', ') || 'Sin productos';
    
    const costoTotal = calculateProductCost(data.productos);
    const montoVenta = Number(data.total) || 0;
    const ganancia = montoVenta - costoTotal;

    return {
      ...data,
      id: doc.id,
      tipo: TRANSACTION_TYPES.ACCESORIOS,
      monto: montoVenta,
      costoTotal, 
      ganancia,   
      metodoPago: data.metodoPago || 'N/A',
      fecha: data.fechaHora || data.fecha,
      detalle: `Venta Accesorios (${data.clienteNombre || 'Anónimo'} / ${data.ubicacion}) | Productos: ${productos}`,
    };
  },

  comandas: (doc) => {
    const data = doc.data();
    const productos = data.productos?.map(p => `${p.cantidad}x${p.nombre}`).join(', ') || 'Sin productos';

    const costoTotal = calculateProductCost(data.productos);
    const montoComanda = Number(data.total) || 0;
    const ganancia = montoComanda - costoTotal;

    return {
      ...data,
      id: doc.id,
      tipo: TRANSACTION_TYPES.COMANDA,
      monto: montoComanda,
      costoTotal, 
      ganancia,   
      metodoPago: data.metodoPago || 'N/A',
      fecha: data.fechaHora || data.fechaComanda || data.fecha,
      detalle: `Comanda - ${data.ubicacion} (${data.clienteNombre || 'Anónimo'}) | Productos: ${productos}`,
    };
  },

  egresos: (doc) => {
    const data = doc.data();
    const montoEgreso = (Number(data.monto) || 0);
    return {
      ...data,
      id: doc.id,
      tipo: TRANSACTION_TYPES.EGRESO,
      monto: montoEgreso * -1, 
      metodoPago: data.fuentePago || 'N/A',
      fecha: data.fechaHora || data.fecha,
      detalle: `Egreso: ${data.concepto} (${data.categoria})${data.numeroRecibo ? ` | Recibo ${data.numeroRecibo}` : ''}`,
      costoTotal: 0,
      ganancia: montoEgreso * -1,
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

  // Totales (incluyendo Ganancia Bruta y Costo)
  const totals = useMemo(() => {
    const ingresos = filteredTransactions.filter(t => t.monto > 0);
    const egresos = filteredTransactions.filter(t => t.monto < 0);

    const sumarMonto = (arr) => arr.reduce((acc, t) => acc + t.monto, 0);
    const sumarGanancia = (arr) => arr.reduce((acc, t) => acc + (t.ganancia || 0), 0);
    const sumarCosto = (arr) => arr.reduce((acc, t) => acc + (t.costoTotal || 0), 0);

    const totalIngresos = sumarMonto(ingresos);
    const totalEgresos = Math.abs(sumarMonto(egresos));
    const totalGananciaBruta = sumarGanancia(ingresos);
    const totalCostoMercancia = sumarCosto(ingresos);

    return {
      ingresosAlquiler: sumarMonto(ingresos.filter(t => t.tipo === TRANSACTION_TYPES.ALQUILER)),
      ventasAccesorios: sumarMonto(ingresos.filter(t => t.tipo === TRANSACTION_TYPES.ACCESORIOS)),
      comandasPagadas: sumarMonto(ingresos.filter(t => t.tipo === TRANSACTION_TYPES.COMANDA)),
      generalIngresos: totalIngresos,
      generalEgresos: totalEgresos,
      balanceNeto: totalIngresos - totalEgresos,
      gananciaBruta: totalGananciaBruta,
      costoMercancia: totalCostoMercancia,
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
  // === FILTRADO
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
      'Monto Venta': t.monto.toFixed(2),
      'Costo Mercancía': (t.costoTotal || 0).toFixed(2), 
      'Ganancia Bruta': (t.ganancia || 0).toFixed(2),
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
      <h2>Reporte Totales y Ganancias</h2>

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
          <div className="table-responsive-wrapper">
          <table className="table-report">
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Tipo</th>
                <th>Método</th>
                <th>Detalle</th>
                <th>Monto Venta (Bs.)</th>
                <th>Costo Mercancía (Bs.)</th>
                <th>Ganancia Bruta (Bs.)</th>
              </tr>
            </thead>

            <tbody>
              {filteredTransactions.length === 0 ? (
                <tr><td colSpan="7">No hay transacciones para mostrar.</td></tr>
              ) : (
                filteredTransactions.map(t => (
                  <tr key={t.id}>
                    <td>{formatDate(t.fecha)}</td>
                    <td>{t.tipo}</td>
                    <td>{t.metodoPago}</td>
                    <td>{t.detalle}</td>
                    {/* Monto Venta */}
                    <td>
                      <span style={{ color: t.monto < 0 ? 'red' : 'green' }}>
                        Bs. {t.monto.toFixed(2)}
                      </span>
                    </td>
                    {/* Costo Mercancía */}
                    <td>
                      {(t.tipo === TRANSACTION_TYPES.ACCESORIOS || t.tipo === TRANSACTION_TYPES.COMANDA)
                        ? `Bs. ${t.costoTotal.toFixed(2)}`
                        : 'N/A'
                      }
                    </td>
                    {/* Ganancia Bruta */}
                    <td>
                      <span style={{ color: (t.ganancia || 0) < 0 ? 'red' : 'green' }}>
                        {(t.tipo === TRANSACTION_TYPES.ACCESORIOS || t.tipo === TRANSACTION_TYPES.COMANDA || t.tipo === TRANSACTION_TYPES.ALQUILER)
                          ? `Bs. ${t.ganancia.toFixed(2)}`
                          : 'N/A'
                        }
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>

          {/* ===================== TOTALES ===================== */}
          <div className="totals-summary">
              <p><FaChartLine /> Total Ingresos Alquiler/Clases: Bs. {totals.ingresosAlquiler.toFixed(2)}</p>
              <p><FaMoneyBillWave /> Total Ventas Accesorios: Bs. {totals.ventasAccesorios.toFixed(2)}</p>
              <p><FaTable /> Total Comandas Pagadas: Bs. {totals.comandasPagadas.toFixed(2)}</p>
              <hr style={{width: '100%', borderTop: '1px dotted #ccc'}} /> 
              <p style={{fontWeight: 700, color: 'darkorange'}}><FaMoneyBillWave /> Costo Total de Mercancía Vendida (CMV): Bs. {totals.costoMercancia.toFixed(2)}</p>
              <p style={{fontWeight: 700, color: 'blue'}}><FaChartLine /> Ganancia Bruta (Mercancía + Alquiler): Bs. {totals.gananciaBruta.toFixed(2)}</p>
              <hr style={{width: '100%', borderTop: '1px dotted #ccc'}} /> 
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