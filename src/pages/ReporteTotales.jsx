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

    const [filterType, setFilterType] = useState(UI_FILTER_OPTIONS.ALL);
    const [filterPaymentMethod, setFilterPaymentMethod] = useState(PAYMENT_METHODS[0]);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

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

    useEffect(() => { fetchAllData(); }, [fetchAllData]);

    useEffect(() => {
        let data = [...allTransactions];

        if (filterType !== UI_FILTER_OPTIONS.ALL) {
            if (filterType === UI_FILTER_OPTIONS.INGRESOS_GENERAL) data = data.filter(t => t.monto > 0);
            else data = data.filter(t => t.tipo === filterType);
        }

        if (filterPaymentMethod !== PAYMENT_METHODS[0]) data = data.filter(t => t.metodoPago === filterPaymentMethod);

        const start = startDate ? new Date(startDate) : null;
        const end = endDate ? new Date(endDate) : null;
        if (start || end) {
            if (start) start.setHours(0, 0, 0, 0);
            if (end) end.setHours(23, 59, 59, 999);
            data = data.filter(t => {
                const d = extractDate(t);
                if (start && d.getTime() < start.getTime()) return false;
                if (end && d.getTime() > end.getTime()) return false;
                return true;
            });
        }
        setFilteredTransactions(data);
    }, [filterType, filterPaymentMethod, startDate, endDate, allTransactions]);

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

    return (
        <div className="ReporteTotales-container">
            <h2>📊 Reporte Totales y Ganancias</h2>

            {/* FILTROS */}
            <div className="filtros-container">
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