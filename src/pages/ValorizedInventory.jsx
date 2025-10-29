import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';
import { FaBoxes, FaMoneyBillWave, FaDollarSign, FaChartLine } from 'react-icons/fa';
import './ValorizedInventory.css';

// Crucial Helper Function: Guarantees input values are treated as numbers (not strings/nulls)
const ensureNumber = (value) => {
    if (value === null || value === undefined || value === '') {
        return 0;
    }
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
};

function ValorizedInventory() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const inventoryCollectionRef = collection(db, 'inventario'); 

    const fetchInventory = useCallback(async () => {
        setLoading(true);
        try {
            const querySnapshot = await getDocs(inventoryCollectionRef);
            
            const productsList = querySnapshot.docs.map(doc => {
                const data = doc.data();
                
                // === CAMBIO CRÍTICO: USANDO LAS CLAVES REALES DE FIRESTORE ===
                const stock = ensureNumber(data.cantidad);
                const cost = ensureNumber(data.costoCompra); // <--- CORREGIDO: Usando 'costoCompra'
                const price = ensureNumber(data.costoVenta);  // <--- CORREGIDO: Usando 'costoVenta'
                
                // Calculations
                const totalCost = stock * cost;
                const totalValue = stock * price;
                const potentialProfit = totalValue - totalCost;

                return {
                    id: doc.id,
                    ...data,
                    stock,
                    // Mantenemos los nombres en camelCase para la tabla y los cálculos
                    costoUnitario: cost, 
                    precioVenta: price, 
                    totalCost: totalCost,
                    totalValue: totalValue,
                    potentialProfit: potentialProfit,
                };
            });
            
            setProducts(productsList);
        } catch (e) {
            console.error('Error al obtener el inventario valorizado:', e);
            setProducts([]); 
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchInventory();
    }, [fetchInventory]);

    // Cálculo de Totales Globales
    const totalInventoryCost = products.reduce((sum, p) => sum + p.totalCost, 0);
    const totalInventoryValue = products.reduce((sum, p) => sum + p.totalValue, 0);
    const totalPotentialProfit = totalInventoryValue - totalInventoryCost;

    return (
        <div className="inventory-container">
            <h1 className="main-title">
                <FaBoxes className="title-icon" /> Inventario Valorizado (Ganancia Potencial)
            </h1>

            {/* --- Sección de Resumen Global --- */}
            <div className="summary-grid">
                <div className="summary-card cost-card">
                    <FaDollarSign />
                    <h4>Costo Total del Stock</h4>
                    <p className="summary-value">Bs. {totalInventoryCost.toFixed(2)}</p>
                </div>
                <div className="summary-card value-card">
                    <FaMoneyBillWave />
                    <h4>Valor Total de Venta</h4>
                    <p className="summary-value">Bs. {totalInventoryValue.toFixed(2)}</p>
                </div>
                <div className="summary-card profit-card">
                    <FaChartLine />
                    <h4>Ganancia Potencial TOTAL</h4>
                    <p className="summary-value">Bs. {totalPotentialProfit.toFixed(2)}</p>
                </div>
            </div>
            
            {/* --- Detalles por Producto --- */}
            <h2 className="section-subtitle">Detalles por Producto</h2>
            
            {loading ? (
                <div className="loading-message">Cargando inventario...</div>
            ) : (
                <div className="table-container">
                    <table className="inventory-table">
                        <thead>
                            <tr>
                                <th>Producto</th>
                                <th>Stock</th>
                                <th>Costo Unitario</th>
                                <th>Precio Venta</th>
                                <th>Costo Total Stock</th>
                                <th>Valor Total Venta</th>
                                <th>Ganancia Potencial</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.length > 0 ? (
                                products.map((p) => (
                                    <tr key={p.id}>
                                        <td>{p.nombre}</td>
                                        <td>{p.stock}</td>
                                        <td>Bs. {p.costoUnitario.toFixed(2)}</td>
                                        <td>Bs. {p.precioVenta.toFixed(2)}</td>
                                        <td><strong className="cost-amount">Bs. {p.totalCost.toFixed(2)}</strong></td>
                                        <td>Bs. {p.totalValue.toFixed(2)}</td>
                                        <td><strong className="profit-amount">Bs. {p.potentialProfit.toFixed(2)}</strong></td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="7" className="no-data-message">No hay productos en el inventario.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default ValorizedInventory;