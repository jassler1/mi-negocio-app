import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import './ReporteTotales.css';
import {
    FaChartLine, FaMoneyBillWave, FaSpinner, FaTable,
    FaFileExcel, FaFilter, FaCalendarAlt, FaRedoAlt, FaDollarSign
} from 'react-icons/fa';
import { format } from 'date-fns';
import * as XLSX from 'xlsx';

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

const UI_FILTER_OPTIONS = {
    ALL: 'all',
    INGRESOS_ALQUILER: TRANSACTION_TYPES.ALQUILER,
    VENTAS_ACCESORIOS: TRANSACTION_TYPES.ACCESORIOS,
    COMANDAS: TRANSACTION_TYPES.COMANDA,
    EGRESOS: TRANSACTION_TYPES.EGRESO,
    INGRESOS_GENERAL: 'ingresos-general',
};

const PAYMENT_METHODS = ['all', 'Efectivo', 'Tarjeta', 'QR', 'Transferencia', 'Crédito'];
const NUMBER_FORMAT = 'es-BO';

// =======================================================================
// === FUNCIONES AUXILIARES
// =======================================================================
const formatDate = (dateValue) => {
    if (!dateValue) return 'N/A';
    const dateObj = dateValue?.toDate?.() || (typeof dateValue === 'string' ? new Date(dateValue) : dateValue);
    if (isNaN(dateObj.getTime())) return 'N/A';
    return format(dateObj, 'dd/MM/yy HH:mm:ss');
};

const formatNumber = (value) => {
    if (value === null || value === undefined || isNaN(value)) return '0.00';
    return value.toLocaleString(NUMBER_FORMAT, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const extractDate = (t) => {
    const dateValue = t.fechaHora || t.fechaComanda || t.fecha;
    if (!dateValue) return new Date(0);
    return dateValue?.toDate?.() || new Date(dateValue);
};
// Se añadió
const EXPORT_MODES = {
  HOY: 'hoy',
  TURNO_1: 'turno_1', // 05:00-16:00
  TURNO_2: 'turno_2', // 16:00-03:00
};

const computeTotals = (transactions) => {
  const ingresos = transactions.filter(t => t.monto > 0);
  const egresos = transactions.filter(t => t.monto < 0);

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
};

const getExportRange = (mode) => {
  const now = new Date();

  if (mode === EXPORT_MODES.HOY) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return { start, end: now, label: 'Hoy (00:00 → ahora)' };
  }

  if (mode === EXPORT_MODES.TURNO_1) {
    const start = new Date(now);
    start.setHours(5, 0, 0, 0);

    const plannedEnd = new Date(now);
    plannedEnd.setHours(16, 0, 0, 0);

    const end = new Date(Math.min(now.getTime(), plannedEnd.getTime()));
    return { start, end, label: 'Turno 1 (05:00 → 16:00)' };
  }

  if (mode === EXPORT_MODES.TURNO_2) {
    const hour = now.getHours();

    // 00:00-02:59 => extensión del turno 2 del día anterior
    if (hour >= 0 && hour < 3) {
      const start = new Date(now);
      start.setDate(start.getDate() - 1);
      start.setHours(16, 0, 0, 0);

      const plannedEnd = new Date(now);
      plannedEnd.setHours(3, 0, 0, 0);

      const end = new Date(Math.min(now.getTime(), plannedEnd.getTime()));
      return {
        start,
        end,
        label: 'Turno 2 (extensión: ayer 16:00 → hoy 03:00)',
        note: 'Cierre extendido del turno 2 del día anterior (00:00-03:00).',
      };
    }

    // 16:00-23:59 => turno 2 normal hoy
    if (hour >= 16) {
      const start = new Date(now);
      start.setHours(16, 0, 0, 0);
      return { start, end: now, label: 'Turno 2 (16:00 → 03:00)' };
    }

    return null; // 03:00-15:59
  }

  return null;
};

const filterByRange = (txs, start, end) =>
  txs.filter(t => {
    const d = extractDate(t);
    return d.getTime() >= start.getTime() && d.getTime() <= end.getTime();
  });
// Hasta aqui

const calculateProductCost = (productos) => {
    if (!productos || productos.length === 0) return 0;
    return productos.reduce((sum, p) => {
        const costoUnitario = Number(p.costoCompra) || 0;
        const cantidad = Number(p.cantidad) || 0;
        return sum + costoUnitario * cantidad;
    }, 0);
};

// =======================================================================
// === PARSER GENERAL CON DETALLE HTML MEJORADO (CORREGIDO)
// =======================================================================
const parseData = {
    ingresos: (doc) => {
        const data = doc.data();
        const monto = Number(data.monto) || 0;
        const concepto = data.concepto || 'N/A';
        const categoria = data.categoria || 'N/A';
        const cliente = data.clienteNombre || 'Anónimo';
        // CORRECCIÓN: Leer la descripción de la base de datos
        const descripcion = data.descripcion || ''; 

        const detalleHtml = `
            <div class="detalle-ingreso">
                <div><strong>Concepto:</strong> ${concepto}</div>
                <div><strong>Categoría:</strong> ${categoria}</div>
                <div><strong>Cliente:</strong> ${cliente}</div>
                ${descripcion ? `<div><strong>Descripción:</strong> ${descripcion}</div>` : ''} 
            </div>
        `;

        return {
            ...data,
            id: doc.id,
            tipo: TRANSACTION_TYPES.ALQUILER,
            monto,
            metodoPago: data.metodoPago || 'N/A',
            fecha: data.fechaHora || data.fecha,
            costoTotal: 0,
            ganancia: monto,
            detalle: detalleHtml, 
            // CORRECCIÓN: Asegurar que las propiedades planas se conserven para la exportación
            concepto, 
            categoria,
            cliente,
            descripcion,
        };
    },

    ventas: (doc) => {
        const data = doc.data();
        const productosList = data.productos?.map(p => `<li>${p.cantidad} x ${p.nombre}</li>`).join('') || '<li>Sin productos</li>';
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
            detalle: `
                <div class="detalle-venta">
                    <div><strong>Cliente:</strong> ${data.clienteNombre || 'Anónimo'}</div>
                    <div><strong>Ubicación:</strong> ${data.ubicacion}</div>
                    <div><strong>Productos:</strong></div>
                    <ul>${productosList}</ul>
                </div>
            `,
        };
    },

    comandas: (doc) => {
        const data = doc.data();
        const productosList = data.productos?.map(p => `<li>${p.cantidad} x ${p.nombre}</li>`).join('') || '<li>Sin productos</li>';
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
            detalle: `
                <div class="detalle-comanda">
                    <div><strong>Ubicación:</strong> ${data.ubicacion}</div>
                    <div><strong>Cliente:</strong> ${data.clienteNombre || 'Anónimo'}</div>
                    <div><strong>Productos:</strong></div>
                    <ul>${productosList}</ul>
                </div>
            `,
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
            costoTotal: 0,
            ganancia: montoEgreso * -1,
            detalle: `
                <div class="detalle-egreso">
                    <div><strong>Concepto:</strong> ${data.concepto}</div>
                    <div><strong>Categoría:</strong> ${data.categoria}</div>
                    ${data.numeroRecibo ? `<div><strong>Recibo:</strong> ${data.numeroRecibo}</div>` : ''}
                </div>
            `,
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
    const [error, setError] = useState(null);

//nuevo
    const [exportMode, setExportMode] = useState(EXPORT_MODES.HOY);
const [printMode, setPrintMode] = useState(false);
const [printData, setPrintData] = useState(null); 
// { start, end, label, note, usuario, txs, totals }

const nombreUsuario = localStorage.getItem('nombreUsuario') || '';
    // añadido

    

    const [filterType, setFilterType] = useState(UI_FILTER_OPTIONS.ALL);
    const [filterPaymentMethod, setFilterPaymentMethod] = useState(PAYMENT_METHODS[0]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

   const totals = useMemo(() => computeTotals(filteredTransactions), [filteredTransactions]);

    const fetchAllData = useCallback(async () => {
        setLoading(true);
        setError(null);
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
            setError('Error al cargar datos de Firebase. Por favor, revisa tu conexión o permisos.');
        } finally {
            setLoading(false);
        }
    }, []);

    const parseLocalDateInput = (yyyyMmDd, endOfDay = false) => {
  if (!yyyyMmDd) return null;
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  if (!y || !m || !d) return null;

  // new Date(y, m-1, d, ...) crea la fecha en zona horaria LOCAL (Bolivia)
  return endOfDay
    ? new Date(y, m - 1, d, 23, 59, 59, 999)
    : new Date(y, m - 1, d, 0, 0, 0, 0);
};

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    useEffect(() => {
        let data = [...allTransactions];

        if (filterType !== UI_FILTER_OPTIONS.ALL) {
            if (filterType === UI_FILTER_OPTIONS.INGRESOS_GENERAL) data = data.filter(t => t.monto > 0);
            else data = data.filter(t => t.tipo === filterType);
        }

        if (filterPaymentMethod !== PAYMENT_METHODS[0]) data = data.filter(t => t.metodoPago === filterPaymentMethod);

        const start = parseLocalDateInput(startDate, false);
        const end = parseLocalDateInput(endDate, true);

            if (start || end) {
          data = data.filter(t => {
        const d = extractDate(t);
            if (start && d < start) return false;
            if (end && d > end) return false;
        return true;
  });
}
        setFilteredTransactions(data);
    }, [filterType, filterPaymentMethod, startDate, endDate, allTransactions]);

    //Nuevo 

    const exportToPdfSimple = async () => {
  let user = (localStorage.getItem('nombreUsuario') || '').trim();

if (user.length < 2) {
  user = (window.prompt('Ingresa tu nombre para el cierre:') || '').trim();
}

if (user.length < 2) {
  alert('Debes ingresar un nombre para generar el cierre.');
  return;
}

  const range = getExportRange(exportMode);
  if (!range) {
    alert('El Turno 2 aún no inicia (solo disponible desde las 16:00 o en extensión 00:00-03:00).');
    return;
  }

  const { start, end, label, note } = range;

  // aplicar filtros actuales (tipo y método) solo para el cierre
  let base = [...allTransactions];

  if (filterType !== UI_FILTER_OPTIONS.ALL) {
    if (filterType === UI_FILTER_OPTIONS.INGRESOS_GENERAL) base = base.filter(t => t.monto > 0);
    else base = base.filter(t => t.tipo === filterType);
  }

  if (filterPaymentMethod !== PAYMENT_METHODS[0]) {
    base = base.filter(t => t.metodoPago === filterPaymentMethod);
  }

  const txs = filterByRange(base, start, end);

  if (txs.length === 0) {
    alert('No hay transacciones para exportar en el rango seleccionado.');
    return;
  }

  const msg1 =
    `Exportar PDF (imprimir/guardar como PDF)\n\n` +
    `Usuario cierre: ${user}\n` +
    `Modo: ${label}\n` +
    `Desde: ${format(start, 'dd/MM/yy HH:mm:ss')}\n` +
    `Hasta: ${format(end, 'dd/MM/yy HH:mm:ss')}\n` +
    (note ? `\nNota: ${note}\n` : '') +
    `\n¿Confirmas que el turno/rango es correcto?`;
  if (!window.confirm(msg1)) return;

  const msg2 =
    `SEGUNDA CONFIRMACIÓN\n` +
    `Esto se usará como CIERRE del personal.\n` +
    `¿Seguro que deseas continuar?`;
  if (!window.confirm(msg2)) return;

  const totalsForPrint = computeTotals(txs);

  setPrintData({
    start, end, label, note,
    usuario: user,
    txs,
    totals: totalsForPrint
  });

  // activar modo impresión (mostramos solo el reporte)
  setPrintMode(true);

  // esperar render
  await new Promise(r => setTimeout(r, 100));

  // abrir diálogo imprimir
  window.print();

  // al cerrar el diálogo, volvemos a modo normal
  // (se ejecuta cuando el navegador termina la impresión)
  setPrintMode(false);
  setPrintData(null);
};
    // Hasta aqui

    const clearFilters = () => {
        setFilterType(UI_FILTER_OPTIONS.ALL);
        setFilterPaymentMethod(PAYMENT_METHODS[0]);
        setStartDate('');
        setEndDate('');
    };

    const exportToExcel = () => {
        const data = filteredTransactions.map(t => {
            // CORRECCIÓN: Usar la descripción junto con el concepto para el detalle de Ingresos en Excel
            const detalleLimpio = t.tipo === TRANSACTION_TYPES.ALQUILER
                ? `Concepto: ${t.concepto || 'N/A'}, Categoría: ${t.categoria || 'N/A'}, Cliente: ${t.cliente || 'Anónimo'}` + 
                  (t.descripcion ? `, Descripción: ${t.descripcion}` : '')
                : t.detalle.replace(/<[^>]*>?/gm, ''); // Limpia el HTML para el resto

            return {
                'Fecha y Hora': formatDate(t.fecha),
                'Tipo': t.tipo,
                'Método de Pago': t.metodoPago,
                'Detalle': detalleLimpio,
                'Monto Venta (Bs.)': formatNumber(t.monto),
                'Costo Mercancía (Bs.)': formatNumber(t.costoTotal || 0),
                'Ganancia Bruta (Bs.)': formatNumber(t.ganancia || 0),
            };
        });

        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Reporte');
        XLSX.writeFile(workbook, `reporte-transacciones-${filterType}.xlsx`);
    };
// Nuevo Agregado
    if (printMode && printData) {
  return (
    <div className="ReporteTotales-container">
      <h2>📄 Cierre de Turno</h2>
      <div style={{ marginBottom: 10 }}>
        <div><strong>Usuario cierre:</strong> {printData.usuario}</div>
        <div><strong>Modo:</strong> {printData.label}</div>
        <div><strong>Rango:</strong> {format(printData.start, 'dd/MM/yy HH:mm:ss')} - {format(printData.end, 'dd/MM/yy HH:mm:ss')}</div>
        {printData.note && <div><strong>Nota:</strong> {printData.note}</div>}
        <div><strong>Total registros:</strong> {printData.txs.length}</div>
      </div>

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
          {printData.txs.map(t => (
            <tr key={`print-${t.id}`}>
              <td>{formatDate(t.fecha)}</td>
              <td>{t.tipo}</td>
              <td>{t.metodoPago}</td>
              <td className="detalle-cell" dangerouslySetInnerHTML={{ __html: t.detalle }} />
              <td>Bs. {formatNumber(t.monto)}</td>
              <td>
                {(t.tipo === TRANSACTION_TYPES.ACCESORIOS || t.tipo === TRANSACTION_TYPES.COMANDA)
                  ? `Bs. ${formatNumber(t.costoTotal)}`
                  : 'N/A'
                }
              </td>
              <td>
                {(t.tipo === TRANSACTION_TYPES.ACCESORIOS || t.tipo === TRANSACTION_TYPES.COMANDA || t.tipo === TRANSACTION_TYPES.ALQUILER)
                  ? `Bs. ${formatNumber(t.ganancia)}`
                  : 'N/A'
                }
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="totals-summary">
        <h3>Resumen de Totales</h3>
        <div className="totals-grid">
          <div className="total-card"><span>Ingresos Alquiler/Clases</span><strong>Bs. {formatNumber(printData.totals.ingresosAlquiler)}</strong></div>
          <div className="total-card"><span>Ventas Accesorios</span><strong>Bs. {formatNumber(printData.totals.ventasAccesorios)}</strong></div>
          <div className="total-card"><span>Comandas Pagadas</span><strong>Bs. {formatNumber(printData.totals.comandasPagadas)}</strong></div>
          <div className="total-card highlight-orange"><span>Costo Total Mercancía (CMV)</span><strong>Bs. {formatNumber(printData.totals.costoMercancia)}</strong></div>
          <div className="total-card highlight-blue"><span>Ganancia Bruta</span><strong>Bs. {formatNumber(printData.totals.gananciaBruta)}</strong></div>
          <div className="total-card highlight-green"><span>Ingresos Totales</span><strong>Bs. {formatNumber(printData.totals.generalIngresos)}</strong></div>
          <div className="total-card highlight-red"><span>Egresos Totales</span><strong>Bs. {formatNumber(printData.totals.generalEgresos)}</strong></div>
          <div className="total-card highlight-purple"><span>Balance Neto</span><strong>Bs. {formatNumber(printData.totals.balanceNeto)}</strong></div>
        </div>
      </div>

      <p style={{ marginTop: 12, fontSize: 12 }}>
        Instrucción: en el cuadro de impresión selecciona “Guardar como PDF”.
      </p>
    </div>
  );
}

    return (
        <div className="ReporteTotales-container">
            <h2>📊 Reporte Totales y Ganancias</h2>

            {/* FILTROS */}
            <div className="filtros-container">
                <label>
                      Exportar:
                      <select value={exportMode} onChange={(e) => setExportMode(e.target.value)}>
                        <option value={EXPORT_MODES.HOY}>Hoy (00:00 → ahora)</option>
                        <option value={EXPORT_MODES.TURNO_1}>Turno 1 (05:00 → 16:00)</option>
                        <option value={EXPORT_MODES.TURNO_2}>Turno 2 (16:00 → 03:00)</option>
                      </select>
                    </label>
                    
                    <button onClick={exportToPdfSimple} className="export-btn">
                      Exportar PDF
                    </button>
                <label>
                    <FaFilter /> Tipo:
                    <select value={filterType} onChange={e => setFilterType(e.target.value)}>
                        <option value={UI_FILTER_OPTIONS.ALL}>Todos</option>
                        <option value={UI_FILTER_OPTIONS.INGRESOS_ALQUILER}>Ingresos Alquiler/Clases</option>
                        <option value={UI_FILTER_OPTIONS.VENTAS_ACCESORIOS}>Ventas Accesorios</option>
                        <option value={UI_FILTER_OPTIONS.COMANDAS}>Comandas</option>
                        <option value={UI_FILTER_OPTIONS.EGRESOS}>Egresos</option>
                        <option value={UI_FILTER_OPTIONS.INGRESOS_GENERAL}>Ingresos Generales</option>
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

                <button onClick={clearFilters} className="clear-btn">
                    <FaRedoAlt /> Limpiar Filtros
                </button>

                <button onClick={exportToExcel} className="export-btn">
                    <FaFileExcel /> Exportar Excel
                </button>
            </div>

            {error && <div className="error-message">❌ {error}</div>}

            {/* TABLA */}
            {loading ? (
                <div className="loading"><FaSpinner className="spin" /> Cargando datos...</div>
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
                                    <tr><td colSpan="7">No hay transacciones para mostrar con los filtros aplicados.</td></tr>
                                ) : (
                                    filteredTransactions.map(t => (
                                        <tr key={t.id}>
                                            <td>{formatDate(t.fecha)}</td>
                                            <td>{t.tipo}</td>
                                            <td>{t.metodoPago}</td>
                                            <td className="detalle-cell" dangerouslySetInnerHTML={{ __html: t.detalle }} />
                                            <td>
                                                <span style={{ color: t.monto < 0 ? 'red' : 'green' }}>
                                                    Bs. {formatNumber(t.monto)}
                                                </span>
                                            </td>
                                            <td>
                                                {(t.tipo === TRANSACTION_TYPES.ACCESORIOS || t.tipo === TRANSACTION_TYPES.COMANDA)
                                                    ? `Bs. ${formatNumber(t.costoTotal)}`
                                                    : 'N/A'
                                                }
                                            </td>
                                            <td>
                                                <span style={{ color: (t.ganancia || 0) < 0 ? 'red' : 'green' }}>
                                                    {(t.tipo === TRANSACTION_TYPES.ACCESORIOS || t.tipo === TRANSACTION_TYPES.COMANDA || t.tipo === TRANSACTION_TYPES.ALQUILER)
                                                        ? `Bs. ${formatNumber(t.ganancia)}`
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

                    {/* TOTALES */}
                    <div className="totals-summary">
                        <h3>Resumen de Totales</h3>
                        <div className="totals-grid">
                            <div className="total-card">
                                <FaChartLine className="icon" />
                                <span>Ingresos Alquiler/Clases</span>
                                <strong>Bs. {formatNumber(totals.ingresosAlquiler)}</strong>
                            </div>

                            <div className="total-card">
                                <FaMoneyBillWave className="icon" />
                                <span>Ventas Accesorios</span>
                                <strong>Bs. {formatNumber(totals.ventasAccesorios)}</strong>
                            </div>

                            <div className="total-card">
                                <FaTable className="icon" />
                                <span>Comandas Pagadas</span>
                                <strong>Bs. {formatNumber(totals.comandasPagadas)}</strong>
                            </div>

                            <div className="total-card highlight-orange">
                                <FaMoneyBillWave className="icon" />
                                <span>Costo Total Mercancía (CMV)</span>
                                <strong>Bs. {formatNumber(totals.costoMercancia)}</strong>
                            </div>

                            <div className="total-card highlight-blue">
                                <FaChartLine className="icon" />
                                <span>Ganancia Bruta (Ventas - CMV + Ingresos)</span>
                                <strong>Bs. {formatNumber(totals.gananciaBruta)}</strong>
                            </div>

                            <div className="total-card highlight-green">
                                <FaMoneyBillWave className="icon" />
                                <span>Ingresos Totales</span>
                                <strong>Bs. {formatNumber(totals.generalIngresos)}</strong>
                            </div>

                            <div className="total-card highlight-red">
                                <FaMoneyBillWave className="icon" />
                                <span>Egresos Totales</span>
                                <strong>Bs. {formatNumber(totals.generalEgresos)}</strong>
                            </div>

                            <div className="total-card highlight-purple">
                                <FaDollarSign className="icon" />
                                <span>Balance Neto (Ingresos - Egresos)</span>
                                <strong>Bs. {formatNumber(totals.balanceNeto)}</strong>
                            </div>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}

export default ReporteTotales;
