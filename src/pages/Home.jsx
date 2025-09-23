import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query } from 'firebase/firestore';
import './Home.css';

function Home() {
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Escuchador en tiempo real para alertas de stock.
        const q = query(collection(db, 'inventario'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const lowStockList = [];
            snapshot.docs.forEach((doc) => {
                const data = doc.data();
                // Verifica si la cantidad actual es igual o menor al stock mínimo.
                if (data.cantidad <= data.stockMinimo) {
                    lowStockList.push({ id: doc.id, ...data });
                }
            });
            setLowStockProducts(lowStockList);
            setLoading(false);
        }, (error) => {
            // Manejo de errores para el escuchador de Firestore.
            console.error("Error al obtener alertas de stock: ", error);
            setLoading(false);
        });

        // Limpieza del escuchador cuando el componente se desmonta.
        return () => unsubscribe();
    }, []); // La dependencia vacía asegura que el efecto se ejecute solo una vez.

    return (
        <div className="home-container">
            <h1 className="home-title">Bienvenido a PadelFlow</h1>
            {loading ? (
                <p>Cargando información del panel...</p>
            ) : (
                <div className="home-content">
                    {/* Sección de Alertas de Stock */}
                    <div className="home-alerts">
                        <div className="alert-card low-stock-alert">
                            <h2>Alertas de Stock 🚨</h2>
                            {lowStockProducts.length > 0 ? (
                                <ul>
                                    {lowStockProducts.map(product => (
                                        <li key={product.id}>
                                            El stock de {product.nombre} se está acabando. Quedan {product.cantidad} {product.unidad}.
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>No hay productos con stock bajo. ¡Todo en orden!</p>
                            )}
                        </div>
                    </div>

                    {/* Las características existentes */}
                    <div className="home-features">
                        <div className="feature-card">
                            <h2>Comandas</h2>
                            <p>Crea, edita y gestiona las órdenes de tus clientes.</p>
                        </div>
                        <div className="feature-card">
                            <h2>Inventario</h2>
                            <p>Controla tus productos y accesorios en stock.</p>
                        </div>
                        <div className="feature-card">
                            <h2>Historial</h2>
                            <p>Accede a reportes detallados de ventas, ingresos y egresos.</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default Home;