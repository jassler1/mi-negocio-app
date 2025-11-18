import React, { useState, useEffect, useMemo, useCallback } from 'react';
import ClientSelectionModal from '../assets/components/ClientSelectionModal';
import ProductSelectionModal from '../assets/components/ProductSelectionModal';
import PaymentModal from '../assets/components/PaymentModal';
import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  doc,
  runTransaction,
  getDocs,
  Timestamp
} from 'firebase/firestore';
import './Comandas.css';

const Comandas = ({ canchas, setCanchas, openOrders, setOpenOrders }) => {
  const [selectedComandaId, setSelectedComandaId] = useState(null);
  const [isCanchaSelected, setIsCanchaSelected] = useState(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [isSubmittingPayment, setIsSubmittingPayment] = useState(false);

  const productsCollectionRef = collection(db, 'inventario'); // ✅ Usamos 'inventario' para obtener el costo
  const comandasPagadasCollectionRef = collection(db, 'comandas_pagadas');

  // Cargar productos del inventario al inicio
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(productsCollectionRef);
        const allProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setProducts(allProducts);
      } catch (error) {
        console.error('Error al obtener productos:', error);
      }
    };
    fetchProducts();
  }, []);

  const selectedItem = useMemo(() => {
    if (selectedComandaId == null) return null;
    return isCanchaSelected
      ? canchas.find(c => c.id === selectedComandaId)
      : openOrders.find(o => o.id === selectedComandaId);
  }, [selectedComandaId, isCanchaSelected, canchas, openOrders]);

  const totalAmount = useMemo(() => {
    if (!selectedItem) return 0;
    return selectedItem.productosEnComanda.reduce(
      (sum, prod) => sum + prod.precio * (prod.cantidad || 0),
      0
    );
  }, [selectedItem]);

  const allOpenOrders = useMemo(() => {
    const fromCanchas = canchas.filter(
      c => c.productosEnComanda && c.productosEnComanda.length > 0
    );
    return [...fromCanchas, ...openOrders];
  }, [canchas, openOrders]);

  const handleSelectComanda = (id, isCancha) => {
    setSelectedComandaId(id);
    setIsCanchaSelected(isCancha);
  };

  const handleAddCancha = () => {
    const newId =
      canchas.length > 0 ? Math.max(...canchas.map(c => c.id)) + 1 : 1;
    const nueva = {
      id: newId,
      nombre: `Cancha ${newId}`,
      productosEnComanda: [],
      clienteSeleccionado: null,
      tipo: 'cancha'
    };
    setCanchas(prev => [...prev, nueva]);
    handleSelectComanda(newId, true);
  };

  const handleCreateOpenOrder = () => {
    const newId =
      openOrders.length > 0 ? Math.max(...openOrders.map(o => o.id)) + 1 : 1;
    const nueva = {
      id: newId,
      nombre: `Comanda #${newId}`,
      productosEnComanda: [],
      clienteSeleccionado: null,
      tipo: 'abierta'
    };
    setOpenOrders(prev => [...prev, nueva]);
    handleSelectComanda(newId, false);
  };

  // Cliente
  const openClientModal = () => setIsClientModalOpen(true);
  const closeClientModal = () => setIsClientModalOpen(false);

  const handleSelectClient = client => {
    if (!selectedItem) return;

    const updateIn = (items, setter) => {
      setter(
        items.map(item => {
          if (item.id === selectedComandaId) {
            return { ...item, clienteSeleccionado: client };
          }
          return item;
        })
      );
    };

    if (isCanchaSelected) {
      updateIn(canchas, setCanchas);
    } else {
      updateIn(openOrders, setOpenOrders);
    }
    closeClientModal();
  };

  // Productos
  const openProductModal = () => setIsProductModalOpen(true);
  const closeProductModal = () => setIsProductModalOpen(false);

  const handleSelectProduct = (productToAdd) => {
    if (!selectedItem) return;

    // 🚨 PASO CRÍTICO: Aseguramos que el objeto del producto tenga el costo de compra
    const productData = products.find(p => p.id === productToAdd.id);
    
    // Si no encontramos el producto o su costo, usamos 0. 
    const costoUnitario = Number(productData?.costoCompra) || 0;
    
    const newProd = {
        ...productToAdd,
        costoCompra: costoUnitario, // ⬅️ COPIAMOS EL CAMPO CLAVE A LA COMANDA
        // Nos aseguramos de que el precio sea el costoVenta del inventario (por si el modal solo da 'precio')
        precio: Number(productData?.costoVenta) || Number(productToAdd.precio), 
    };

    const updateIn = (items, setter) => {
      setter(
        items.map(item => {
          if (item.id === selectedComandaId) {
            const existing = item.productosEnComanda.find(
              p => p.id === newProd.id
            );
            if (existing) {
              return {
                ...item,
                productosEnComanda: item.productosEnComanda.map(p =>
                  p.id === newProd.id
                    ? { ...p, cantidad: p.cantidad + newProd.cantidad }
                    : p
                )
              };
            } else {
              return {
                ...item,
                productosEnComanda: [...item.productosEnComanda, newProd]
              };
            }
          }
          return item;
        })
      );
    };

    if (isCanchaSelected) {
      updateIn(canchas, setCanchas);
    } else {
      updateIn(openOrders, setOpenOrders);
    }
    closeProductModal();
  };

  const handleUpdateProductQuantity = (productId, delta) => {
    if (!selectedItem) return;

    const updateIn = (items, setter) => {
      setter(
        items.map(item => {
          if (item.id === selectedComandaId) {
            const updatedProducts = item.productosEnComanda
              .map(prod => {
                if (prod.id === productId) {
                  const newQty = (prod.cantidad || 0) + delta;
                  if (newQty <= 0) return null;
                  return { ...prod, cantidad: newQty };
                }
                return prod;
              })
              .filter(Boolean);
            return { ...item, productosEnComanda: updatedProducts };
          }
          return item;
        })
      );
    };

    if (isCanchaSelected) {
      updateIn(canchas, setCanchas);
    } else {
      updateIn(openOrders, setOpenOrders);
    }
  };

  // Pago
  const openPaymentModal = () => {
    if (!selectedItem || !selectedItem.productosEnComanda.length) {
      alert('La comanda debe tener al menos un producto para pagar.');
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    if (!isSubmittingPayment) setIsPaymentModalOpen(false);
  };

  const handleProcessPayment = async paymentData => {
    if (!selectedItem) return;
    if (isSubmittingPayment) return;
    setIsSubmittingPayment(true);

    const ventaTotal = selectedItem.productosEnComanda.reduce(
      (sum, p) => sum + p.precio * p.cantidad,
      0
    );

    const nuevaComanda = {
      tipoComanda: selectedItem.tipo,
      ubicacion: selectedItem.nombre,
      // 🚨 PASO CRÍTICO: Aseguramos que el objeto que se guarda tenga el costoCompra
      productos: selectedItem.productosEnComanda.map(p => ({
        id: p.id,
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio,
         costoCompra: p.costoCompra, // ⬅️ GUARDAMOS EL COSTO DE COMPRA EN FIREBASE
      })),
      clienteId: selectedItem.clienteSeleccionado
        ? selectedItem.clienteSeleccionado.id
        : null,
      clienteNombre: selectedItem.clienteSeleccionado
        ? selectedItem.clienteSeleccionado.nombreCompleto
        : 'Anónimo',
      total: ventaTotal,
      metodoPago: paymentData.method,
      fecha: Timestamp.fromDate(new Date())
    };

    try {
      await addDoc(comandasPagadasCollectionRef, nuevaComanda);

      if (selectedItem.clienteSeleccionado && selectedItem.clienteSeleccionado.id) {
        const clientRef = doc(db, 'clientes', selectedItem.clienteSeleccionado.id);
        await runTransaction(db, async tx => {
          const clientSnap = await tx.get(clientRef);
          if (clientSnap.exists()) {
            const curr = clientSnap.data().totalCompras || 0;
            tx.update(clientRef, { totalCompras: curr + ventaTotal });
          }
        });
      }

      if (isCanchaSelected) {
        setCanchas(prev =>
          prev.map(c =>
            c.id === selectedComandaId
              ? { ...c, productosEnComanda: [], clienteSeleccionado: null }
              : c
          )
        );
      } else {
        setOpenOrders(prev => prev.filter(o => o.id !== selectedComandaId));
      }

      setSelectedComandaId(null);
      setIsPaymentModalOpen(false);
      alert('✅ Pago procesado y comanda cerrada.');
    } catch (err) {
      console.error('Error procesando pago:', err);
      alert('❌ Error al procesar el pago.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  const handleSaveComandaPendiente = () => {
    if (!selectedItem) return;
    if (!selectedItem.productosEnComanda.length) {
      alert('No hay productos para guardar.');
      return;
    }

    if (isCanchaSelected) {
      const nuevaComandaAbierta = {
        id:
          openOrders.length > 0
            ? Math.max(...openOrders.map(o => o.id)) + 1
            : 1,
        nombre: `Comanda #${openOrders.length + 1}`,
        productosEnComanda: [...selectedItem.productosEnComanda],
        clienteSeleccionado: selectedItem.clienteSeleccionado || null,
        tipo: 'abierta'
      };

      setOpenOrders(prev => [...prev, nuevaComandaAbierta]);

      setCanchas(prev =>
        prev.map(c =>
          c.id === selectedComandaId
            ? { ...c, productosEnComanda: [], clienteSeleccionado: null }
            : c
        )
      );
    }

    setSelectedComandaId(null);
    alert('✅ Comanda guardada en pendientes.');
  };

  return (
    <div className="comandas-container">
      <h2 className="main-title">Sistema de Comandas</h2>

      <div className="main-content-panels">
        {/* Panel izquierdo */}
        <div className="side-panel">
          <div className="section-canchas">
            <h3 className="section-title">Comandas por Cancha</h3>
            <div className="button-list">
              {canchas.map(c => (
                <button
                  key={c.id}
                  onClick={() => handleSelectComanda(c.id, true)}
                  className={`comanda-btn ${
                    isCanchaSelected && selectedComandaId === c.id ? 'active' : ''
                  }`}
                >
                  {c.nombre}
                </button>
              ))}
              <button onClick={handleAddCancha} className="add-btn-cancha">
                + Cancha
              </button>
            </div>
          </div>

          <div className="section-comandas-abiertas">
            <h3 className="section-title">Comandas Abiertas</h3>
            <button onClick={handleCreateOpenOrder} className="create-open-order-btn">
              + Abrir Comanda
            </button>
            <div className="button-list open-orders-list">
              {openOrders.length > 0 ? (
                openOrders.map(o => (
                  <button
                    key={o.id}
                    onClick={() => handleSelectComanda(o.id, false)}
                    className={`comanda-btn ${
                      !isCanchaSelected && selectedComandaId === o.id ? 'active' : ''
                    }`}
                  >
                    {o.nombre}
                  </button>
                ))
              ) : (
                <p className="no-open-orders-msg">No hay comandas abiertas</p>
              )}
            </div>
          </div>
        </div>

        {/* Panel de detalles */}
        <div className="details-panel">
          {selectedItem ? (
            <div className="comanda-details-container">
              <h3 className="details-title">Comanda: {selectedItem.nombre}</h3>

              {/* Cliente */}
              <div className="details-section">
                <button onClick={openClientModal} className="add-client-btn">
                  {selectedItem.clienteSeleccionado
                    ? 'Cambiar Cliente'
                    : 'Agregar Cliente'}
                </button>
              </div>

              {selectedItem.clienteSeleccionado && (
                <div className="client-info">
                  <p>
                    <strong>Cliente:</strong>{' '}
                    {selectedItem.clienteSeleccionado.nombreCompleto}
                  </p>
                  <p>
                    <strong>CI:</strong>{' '}
                    {selectedItem.clienteSeleccionado.numeroCi}
                  </p>
                </div>
              )}

              {/* Productos */}
              <div className="details-section product-section">
                <button onClick={openProductModal} className="add-product-btn">
                  Agregar Producto
                </button>
                <h4 className="products-list-title">Productos en la comanda</h4>

                {selectedItem.productosEnComanda.length > 0 ? (
                  <ul className="products-list">
                    {selectedItem.productosEnComanda.map(prod => (
                      <li key={prod.id} className="product-item">
                        <div className="product-info">
                          <span className="product-name">{prod.nombre}</span>
                          <span className="product-price-display">
                            Bs. {(prod.precio * prod.cantidad).toFixed(2)}{' '}
                            <small>(Bs. {prod.precio.toFixed(2)} c/u)</small>
                          </span>
                             {/* Mostrar costo para debug/confianza - Opcional, borrar en producción */}
                             {prod.costoCompra !== undefined && <small> (Costo: {prod.costoCompra.toFixed(2)})</small>}
                        </div>
                        <div className="quantity-controls">
                          <button
                            className="quantity-btn"
                            aria-label="Reducir cantidad"
                            onClick={() => handleUpdateProductQuantity(prod.id, -1)}
                          >
                            −
                          </button>
                          <span className="product-quantity">{prod.cantidad}</span>
                          <button
                            className="quantity-btn"
                            aria-label="Aumentar cantidad"
                            onClick={() => handleUpdateProductQuantity(prod.id, 1)}
                          >
                            +
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-products-msg">No hay productos aún.</p>
                )}

                <div className="total-amount-container">
                  <p className="total-amount-text">
                    Total: Bs. {totalAmount.toFixed(2)}
                  </p>
                </div>

                {selectedItem.productosEnComanda.length > 0 && (
                  <>
                    <button
                      onClick={handleSaveComandaPendiente}
                      className="save-btn"
                    >
                      Guardar Comanda Pendiente
                    </button>

                    <button
                      onClick={openPaymentModal}
                      className="pay-btn"
                      disabled={isSubmittingPayment}
                    >
                      {isSubmittingPayment ? 'Procesando...' : 'Pagar'}
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="no-selection-message">
              <p>Selecciona una cancha o comanda abierta para ver detalles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modales */}
      {isClientModalOpen && (
        <ClientSelectionModal
          onSelectClient={handleSelectClient}
          onClose={closeClientModal}
        />
      )}
      {isProductModalOpen && (
        <ProductSelectionModal
          products={products}
          onSelectProduct={handleSelectProduct}
          onClose={closeProductModal}
          filtroDeSeccion="comandas"
        />
      )}
      {isPaymentModalOpen && selectedItem && (
        <PaymentModal
          totalAmount={totalAmount}
          products={selectedItem.productosEnComanda}
          onProcessPayment={handleProcessPayment}
          onClose={closePaymentModal}
        />
      )}
      </div>
  );
};

export default Comandas;