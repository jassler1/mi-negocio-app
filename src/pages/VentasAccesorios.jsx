import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ClientSelectionModal from '../assets/components/ClientSelectionModal';
import ProductSelectionModal from '../assets/components/ProductSelectionModal';
import PaymentModal from '../assets/components/PaymentModal';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, runTransaction, getDocs, serverTimestamp } from 'firebase/firestore'; 
import { registrarEventoAuditoria } from '../utils/auditoria';
import './VentaAccesorios.css';

const canchasData = [
  { id: 1, nombre: 'Cancha 1' },
  { id: 2, nombre: 'Cancha 2' },
  { id: 3, nombre: 'Cancha 3' },
  { id: 4, nombre: 'Cancha 4' },
];

const nombreUsuario = "Jassler";
const ventasCollectionRef = collection(db, 'ventas');
const productosCollectionRef = collection(db, 'inventario'); // ✅ Usar 'inventario'
const reportesTotalesCollectionRef = collection(db, 'reportesTotales'); 

// 🔑 CAMBIO CLAVE: Aceptar los estados y setters del componente padre para persistencia
function VentaAccesorios({ canchas, setCanchas, openVentas, setOpenVentas }) {

  // 1. Inicialización de Canchas (Se ejecuta solo la primera vez que canchas está vacío)
  useEffect(() => {
    if (canchas.length === 0) {
      const initialCanchas = canchasData.map(c => ({
        ...c,
        productosEnVenta: [],
        clienteSeleccionado: null,
        tipo: 'cancha'
      }));
      setCanchas(initialCanchas); 
    }
  }, [canchas.length, setCanchas]);


  // Estados locales
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [isCanchaSelected, setIsCanchaSelected] = useState(true);

  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Cargar productos (Sin cambios)
  const [products, setProducts] = useState([]);
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(productosCollectionRef);
        const all = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(all);
      } catch (err) {
        console.error("Error al cargar productos:", err);
      }
    };
    fetchProducts();
  }, []);

  // Memorización de item seleccionado (Sin cambios)
  const selectedItem = useMemo(() => {
    if (selectedItemId == null) return null;
    return isCanchaSelected
      ? canchas.find(c => c.id === selectedItemId)
      : openVentas.find(v => v.id === selectedItemId);
  }, [selectedItemId, isCanchaSelected, canchas, openVentas]);

  // Cálculo del total (Sin cambios)
  const totalAmount = useMemo(() => {
    if (!selectedItem) return 0;
    return (selectedItem.productosEnVenta || []).reduce((sum, p) => sum + (p.precio * (p.cantidad || 0)), 0);
  }, [selectedItem]);

  // Combinar ventas abiertas de canchas y ventas pendientes (Sin cambios)
  const allOpenVentas = useMemo(() => {
    const fromCanchas = canchas.filter(c => c.productosEnVenta && c.productosEnVenta.length > 0);
    return [...fromCanchas, ...openVentas];
  }, [canchas, openVentas]);

  // Manejo de selección (Sin cambios)
  const handleSelectItem = useCallback((id, isCancha) => {
    setSelectedItemId(id);
    setIsCanchaSelected(isCancha);
  }, []);

  // Crear venta pendiente desde cancha
  const handleSaveVentaPendiente = useCallback(() => {
    if (!selectedItem) return;
    if (!selectedItem.productosEnVenta || selectedItem.productosEnVenta.length === 0) {
      alert("No hay accesorios para guardar.");
      return;
    }

    if (isCanchaSelected) {
      const newId = openVentas.length > 0 ? Math.max(...openVentas.map(v => v.id)) + 1 : 1;
      const nuevaVentaPendiente = {
        id: newId,
        nombre: `Venta #${newId}`,
        productosEnVenta: [...selectedItem.productosEnVenta],
        clienteSeleccionado: selectedItem.clienteSeleccionado,
        tipo: 'pendiente',
      };
      setOpenVentas(prev => [...prev, nuevaVentaPendiente]);
      // limpiar cancha
      setCanchas(prev => prev.map(c =>
        c.id === selectedItemId
          ? { ...c, productosEnVenta: [], clienteSeleccionado: null }
          : c
      ));
      setSelectedItemId(null);
      alert("✅ Venta guardada como pendiente.");
    } else {
      alert("La venta ya está en pendientes.");
    }
  }, [selectedItem, isCanchaSelected, openVentas, canchas, selectedItemId, setOpenVentas, setCanchas]);

  // Manejo cliente, producto (Sin cambios importantes, usan los setters de props)
  const openClientModal = useCallback(() => {
    if (!selectedItem) {
      alert("Selecciona primero una cancha o venta pendiente.");
      return;
    }
    setIsClientModalOpen(true);
  }, [selectedItem]);

  const handleSelectClient = useCallback((client) => {
    if (!selectedItem) return;
    const updateIn = (items, setter) => {
      setter(items.map(item =>
        item.id === selectedItemId
          ? { ...item, clienteSeleccionado: client }
          : item
      ));
    };
    if (isCanchaSelected) {
      updateIn(canchas, setCanchas);
    } else {
      updateIn(openVentas, setOpenVentas);
    }
    setIsClientModalOpen(false);
  }, [selectedItemId, isCanchaSelected, canchas, openVentas, setCanchas, setOpenVentas]);

  const openProductModal = () => {
    if (!selectedItem) {
      alert("Selecciona primero una cancha o venta pendiente.");
      return;
    }
    setIsProductModalOpen(true);
  };

  const handleSelectProduct = useCallback((productFromModal) => {
    if (!selectedItem) return;

    // 1. Obtener los datos completos del producto del inventario para extraer el costo
    const productData = products.find(p => p.id === productFromModal.id);

    // 2. Crear el objeto de producto de la venta con el campo costoCompra copiado
    const newProd = {
        ...productFromModal,
        // ⬅️ CORRECCIÓN CLAVE: Copiamos el costoCompra del inventario al objeto de venta
        costoCompra: Number(productData?.costoCompra) || 0,
        // Usar costoVenta del inventario como precio, si está disponible
        precio: Number(productData?.costoVenta) || productFromModal.precio || 0,
    };

    const updateIn = (items, setter) => {
      setter(items.map(item => {
        if (item.id === selectedItemId) {
          const existing = (item.productosEnVenta || []).find(p => p.id === newProd.id);
          if (existing) {
            return {
              ...item,
              productosEnVenta: item.productosEnVenta.map(p =>
                p.id === newProd.id
                  ? { ...p, cantidad: p.cantidad + newProd.cantidad }
                  : p
              )
            };
          } else {
            return {
              ...item,
              productosEnVenta: [...(item.productosEnVenta || []), newProd]
            };
          }
        }
        return item;
      }));
    };
    if (isCanchaSelected) {
      updateIn(canchas, setCanchas);
    } else {
      updateIn(openVentas, setOpenVentas);
    }
    setIsProductModalOpen(false);
  }, [selectedItemId, isCanchaSelected, canchas, openVentas, setCanchas, setOpenVentas, products]); // ✅ products agregado como dependencia

  const updateProductQuantity = useCallback((prodId, delta) => {
    if (!selectedItem) return;
    const updateIn = (items, setter) => {
      setter(items.map(item => {
        if (item.id === selectedItemId) {
          const newList = (item.productosEnVenta || []).map(p => {
            if (p.id === prodId) {
              const newQty = (p.cantidad || 0) + delta;
              return newQty > 0 ? { ...p, cantidad: newQty } : null;
            }
            return p;
          }).filter(Boolean);
          return { ...item, productosEnVenta: newList };
        }
        return item;
      }));
    };
    if (isCanchaSelected) {
      updateIn(canchas, setCanchas);
    } else {
      updateIn(openVentas, setOpenVentas);
    }
  }, [selectedItemId, isCanchaSelected, canchas, openVentas, setCanchas, setOpenVentas]);

  const openPaymentModal = () => {
    if (!selectedItem || !(selectedItem.productosEnVenta && selectedItem.productosEnVenta.length > 0)) {
      alert("Debe haber al menos un accesorio para pagar.");
      return;
    }
    setIsPaymentModalOpen(true);
  };

  // Procesar pago (con corrección para guardar costoCompra)
  const handleProcessPayment = useCallback(async (paymentData) => {
    if (!selectedItem) return;
    const ventaTotal = (selectedItem.productosEnVenta || []).reduce((sum, p) => sum + (p.precio * p.cantidad), 0);
    const metodoPagoFinal = paymentData.method || 'Desconocido';

    const nuevaVenta = {
      tipoVenta: 'Accesorio', 
      ubicacion: selectedItem.nombre,
      productos: (selectedItem.productosEnVenta || []).map(p => ({
        id: p.id,
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio,
         costoCompra: p.costoCompra, // ⬅️ CORRECCIÓN CLAVE: Guardamos el costo en Firestore
      })),
      clienteId: selectedItem.clienteSeleccionado?.id || null,
      clienteNombre: selectedItem.clienteSeleccionado?.nombreCompleto || 'Anónimo',
      total: ventaTotal,
      metodoPago: metodoPagoFinal, 
      fecha: new Date().toISOString().slice(0,10),
      fechaHora: serverTimestamp(), 
      usuario: nombreUsuario
    };

    try {
      await registrarEventoAuditoria({
        usuario: nombreUsuario,
        tipo: 'VentaAccesorio',
        detalles: `Venta de accesorios a ${selectedItem.clienteSeleccionado?.nombreCompleto || 'Anónimo'} por Bs. ${ventaTotal.toFixed(2)} - Origen: ${selectedItem.nombre}`
      });

      // ajustar inventario
      for (const p of selectedItem.productosEnVenta) {
        const productRef = doc(db, 'inventario', p.id);
        await runTransaction(db, async tx => {
          const snap = await tx.get(productRef);
          if (!snap.exists()) throw new Error(`Producto ${p.nombre} no existe.`);
          const stock = snap.data().cantidad;
          if (stock < p.cantidad) {
            throw new Error(`Stock insuficiente para ${p.nombre}. Disponible: ${stock}`);
          }
          tx.update(productRef, { cantidad: stock - p.cantidad });
        });
      }

      // 1. Guardar en la colección 'ventas'
      await addDoc(ventasCollectionRef, nuevaVenta);

      // 2. Guardar en la colección 'reportesTotales'
      const reporteRegistro = {
          ...nuevaVenta,
          tipoRegistro: 'VENTA_ACCESORIO',
          esVenta: true,
          esAlquiler: false,
          esAccesorio: true,
      };
      await addDoc(reportesTotalesCollectionRef, reporteRegistro);


      if (selectedItem.clienteSeleccionado?.id) {
        const clientRef = doc(db, 'clientes', selectedItem.clienteSeleccionado.id);
        await runTransaction(db, async tx => {
          const clientSnap = await tx.get(clientRef);
          if (clientSnap.exists()) {
            const curr = clientSnap.data().totalCompras || 0;
            tx.update(clientRef, { totalCompras: curr + ventaTotal });
          }
        });
      }

      alert("✅ Venta procesada y cerrada.");

      // limpiar el item (usan los setters de props)
      if (isCanchaSelected) {
        setCanchas(prev => prev.map(c =>
          c.id === selectedItemId
            ? { ...c, productosEnVenta: [], clienteSeleccionado: null }
            : c
        ));
      } else {
        setOpenVentas(prev => prev.filter(v => v.id !== selectedItemId));
      }

      setSelectedItemId(null);
      setIsPaymentModalOpen(false);

    } catch (err) {
      console.error("Error procesando venta:", err);
      alert(err.message || "Error al procesar la venta.");
    }
  }, [selectedItem, isCanchaSelected, selectedItemId, canchas, openVentas, setCanchas, setOpenVentas]);


  // UI (Sin cambios)
  return (
    <div className="ventas-container">
      <h1 className="main-title">Venta de Accesorios</h1>

      <div className="main-content-panels">
        <div className="side-panel">
          <h3 className="section-title">Seleccionar Cancha</h3>
          <div className="button-list">
            {canchas.map(c => (
              <button
                key={c.id}
                className={`comanda-btn ${isCanchaSelected && selectedItemId === c.id ? 'active' : ''}`}
                onClick={() => handleSelectItem(c.id, true)}
              >
                {c.nombre}
              </button>
            ))}
            <h3 className="section-title">Ventas Pendientes</h3>
            <div className="button-list open-orders-list">
              {openVentas.length > 0 ? openVentas.map(v => (
                <button
                  key={v.id}
                  className={`comanda-btn ${!isCanchaSelected && selectedItemId === v.id ? 'active' : ''}`}
                  onClick={() => handleSelectItem(v.id, false)}
                >
                  {v.nombre}
                </button>
              )) : (
                <p className="no-open-orders-msg">No hay ventas pendientes</p>
              )}
            </div>
          </div>
        </div>

        <div className="details-panel">
          {selectedItem ? (
            <div className="venta-details-container">
              <h3 className="details-title">
                {selectedItem.nombre}
              </h3>

              <div className="details-section">
                <button onClick={openClientModal} className="add-client-btn">
                  {selectedItem.clienteSeleccionado ? 'Cambiar Cliente' : 'Agregar Cliente'}
                </button>
              </div>
              {selectedItem.clienteSeleccionado && (
                <div className="client-info">
                  <p><strong>Cliente:</strong> {selectedItem.clienteSeleccionado.nombreCompleto}</p>
                  <p><strong>CI:</strong> {selectedItem.clienteSeleccionado.numeroCi}</p>
                </div>
              )}

              <div className="details-section product-section">
                <button onClick={openProductModal} className="add-product-btn">Añadir Accesorio</button>
                <h4 className="products-list-title">Accesorios en la venta</h4>
                {selectedItem.productosEnVenta && selectedItem.productosEnVenta.length > 0 ? (
                  <ul className="products-list">
                    {selectedItem.productosEnVenta.map(p => (
                      <li key={p.id} className="product-item">
                        <div className="product-info">
                          <span className="product-name">{p.nombre}</span>
                          <span className="product-price-display">
                            Bs. {(p.precio * p.cantidad).toFixed(2)} <small>(Bs. {p.precio.toFixed(2)} c/u)</small>
                          </span>
                        </div>
                        <div className="quantity-controls">
                          <button className="quantity-btn" onClick={() => updateProductQuantity(p.id, -1)} aria-label="Reducir cantidad">−</button>
                          <span className="product-quantity">{p.cantidad}</span>
                          <button className="quantity-btn" onClick={() => updateProductQuantity(p.id, 1)} aria-label="Aumentar cantidad">+</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-products-msg">No hay accesorios aún.</p>
                )}
                <div className="total-amount-container">
                  <p className="total-amount-text">Total: Bs. {totalAmount.toFixed(2)}</p>
                </div>
                {selectedItem.productosEnVenta && selectedItem.productosEnVenta.length > 0 && (
                  <>
                    <button onClick={handleSaveVentaPendiente} className="save-btn">Guardar Venta Pendiente</button>
                    <button onClick={openPaymentModal} className="pay-btn">Pagar Venta</button>
                  </>
                )}
              </div>

            </div>
          ) : (
            <p className="no-selection-message">Selecciona una cancha o venta pendiente para ver detalles.</p>
          )}
        </div>
      </div>

      <div className="open-orders-display-panel">
        <h3 className="section-title">Ventas con Accesorios Pendientes</h3>
        <div className="open-orders-list-cards">
          {allOpenVentas.length > 0 ? allOpenVentas.map(item => (
            <div 
                key={`venta-${item.tipo}-${item.id}`} 
                className={`order-card ${selectedItemId === item.id ? 'active-card' : ''}`}
                onClick={() => handleSelectItem(item.id, item.tipo === 'cancha')} // Añadir onClick a la tarjeta
            >
              <div className="card-header"><h4>{item.nombre}</h4></div>
              <div className="card-body">
                {item.clienteSeleccionado && <p>Cliente: {item.clienteSeleccionado.nombreCompleto}</p>}
                {item.productosEnVenta.slice(0,3).map(p => <p key={p.id}>{p.nombre} x {p.cantidad}</p>)}
                {item.productosEnVenta.length > 3 && <p>+ {item.productosEnVenta.length - 3} más</p>}
                <div className="total-card"><strong>Total: Bs. {item.productosEnVenta.reduce((s, p) => s + (p.precio * p.cantidad), 0).toFixed(2)}</strong></div>
              </div>
              <div className="card-actions">
                <button className="btn-edit" onClick={(e) => { e.stopPropagation(); handleSelectItem(item.id, item.tipo === 'cancha'); }}>Editar</button>
                <button className="btn-pay" onClick={(e) => { e.stopPropagation(); openPaymentModal(); }}>Pagar</button>
              </div>
            </div>
          )) : (
            <p className="no-open-orders-msg">No hay ventas pendientes.</p>
          )}
        </div>
      </div>

      {isClientModalOpen && (
        <ClientSelectionModal onSelectClient={handleSelectClient} onClose={() => setIsClientModalOpen(false)} />
      )}
      {isProductModalOpen && (
        <ProductSelectionModal products={products} filtroDeSeccion="ACCESORIOS" onSelectProduct={handleSelectProduct} onClose={() => setIsProductModalOpen(false)} />
      )}
      {isPaymentModalOpen && selectedItem && (
        <PaymentModal totalAmount={totalAmount} products={selectedItem.productosEnVenta} onProcessPayment={handleProcessPayment} onClose={() => setIsPaymentModalOpen(false)} />
      )}
    </div>
  );
}

export default VentaAccesorios;