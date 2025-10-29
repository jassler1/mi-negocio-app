import React, { useState, useEffect, memo } from 'react';
import { Link } from 'react-router-dom';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query } from 'firebase/firestore';
import { 
    FaShoppingCart, 
    FaBoxes, 
    FaHistory, 
    FaMoneyBillWave, 
    FaCoins, 
    FaExclamationTriangle, 
    FaCheckCircle 
} from 'react-icons/fa';
import './Home.css';

// --- Función para obtener el rol del usuario ---
const getRole = () => localStorage.getItem('usuarioRol') || 'cajero'; 

// --- Tarjetas de Navegación con Roles ---
const HOME_CARDS = [
    { 
        title: '🧾 Comandas', 
        description: 'Crea, edita y gestiona las órdenes de tus clientes en tiempo real.', 
        icon: <FaShoppingCart />, 
        link: '/comandas', 
        roles: ['cajero', 'admin'] 
    },
    { 
        title: '💵 Ingresos', 
        description: 'Registra rápidamente pagos por canchas, clases y ventas.', 
        icon: <FaMoneyBillWave />, 
        link: '/ingresos', 
        roles: ['cajero', 'admin'] 
    },
    { 
        title: '📉 Egresos', 
        description: 'Registra los gastos operativos del día (servicios, insumos, sueldos).', 
        icon: <FaCoins />, 
        link: '/egresos', 
        roles: ['cajero', 'admin'] 
    },
    { 
        title: '📦 Inventario', 
        description: 'Controla tus productos, stock mínimo y movimientos de bodega.', 
        icon: <FaBoxes />, 
        link: '/inventario', 
        roles: ['admin'] 
    },
    { 
        title: '📈 Reportes y Historial', 
        description: 'Accede a reportes detallados de ventas, ingresos y egresos.', 
        icon: <FaHistory />, 
        link: '/reporte-totales', 
        roles: ['admin'] 
    },
];

function Home() {
    const [lowStockProducts, setLowStockProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const rolUsuario = getRole();

    useEffect(() => {
        const q = query(collection(db, 'inventario'));

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const lowStock = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter(product => product.cantidad <= product.stockMinimo);

                setLowStockProducts(lowStock);
                setLoading(false);
            },
            (error) => {
                console.error("Error al obtener alertas de stock:", error);
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    const allowedCards = HOME_CARDS.filter(card => card.roles.includes(rolUsuario));
    const hasLowStock = lowStockProducts.length > 0;
    
    // Función para mostrar el rol con el formato del CSS
    const getFormattedRole = () => {
        const displayRole = rolUsuario.charAt(0).toUpperCase() + rolUsuario.slice(1);
        return <span className="user-id-display">{displayRole}</span>;
    };

    return (
        <div className="home-container">
            <h1 className="home-title">
                Bienvenido a <span className="brand">PadelFlow</span>
            </h1>
            
            <div className="user-info">
                Tu rol actual es: {getFormattedRole()}
            </div>

            {loading ? (
                <p className="loading-text">Cargando información del panel... ⏳</p>
            ) : (
                <div className="home-content grid-layout">
                    
                    {/* Columna 1: ALERTAS (Ocupa 1/3 del espacio en escritorio) */}
                    <section className="home-alerts">
                        <div 
                            className="alert-card" 
                            data-has-alerts={hasLowStock ? "true" : "false"}
                        >
                            <h2 className="section-title">
                                {hasLowStock ? <FaExclamationTriangle /> : <FaCheckCircle />} 
                                Alertas de Stock
                            </h2>
                            
                            {hasLowStock ? (
                                <ul className="alert-list">
                                    {lowStockProducts.map(product => (
                                        <li key={product.id} className="alert-item">
                                            Producto: <strong>{product.nombre}</strong>. Quedan 
                                            <span className="stock-count"> {product.cantidad}</span> und. (Mín: {product.stockMinimo})
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="no-alert-message">
                                    No hay productos con stock bajo. ¡Todo en orden!
                                </p>
                            )}
                        </div>
                    </section>

                    {/* Columna 2: FUNCIONALIDADES (Ocupa 2/3 del espacio en escritorio) */}
                    <section className="home-features">
                        <div className="features-grid">
                            {allowedCards.map(card => (
                                <FeatureCard 
                                    key={card.link}
                                    title={card.title}
                                    description={card.description}
                                    icon={card.icon}
                                    link={card.link}
                                />
                            ))}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}

/**
 * Componente Tarjeta de Funcionalidad
 */
const FeatureCard = memo(({ title, description, icon, link }) => (
    <Link to={link} className="feature-card">
        <div className="card-icon">{icon}</div>
        <h2>{title}</h2>
        <p>{description}</p>
    </Link>
));

export default Home;