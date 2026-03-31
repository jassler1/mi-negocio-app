import React, { useState, useEffect, useMemo } from 'react';
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
  Timestamp,
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

  const productsCollectionRef = collection(db, 'inventario');
  const comandasPagadasCollectionRef = collection(db, 'comandas_pagadas');

  // Cargar productos del inventario
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snapshot = await getDocs(productsCollectionRef);
        const allProducts = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
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
      tipo: 'cancha',
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
      tipo: 'abierta',
    };

    setOpenOrders(prev => [...prev, nueva]);
    handleSelectComanda(newId, false);
  };

  const handleDeleteOpenOrder = comandaId => {
    if (window.confirm('¿Eliminar comanda abierta?')) {
      setOpenOrders(prev => prev.filter(o => o.id !== comandaId));
      if (selectedComandaId === comandaId && !isCanchaSelected) {
        setSelectedComandaId(null);
      }
    }
  };

  // CLIENTES
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

    if (isCanchaSelected) updateIn(canchas, setCanchas);
    else updateIn(openOrders, setOpenOrders);

    closeClientModal();
  };

  // PRODUCTOS
  const openProductModal = () => setIsProductModalOpen(true);
  const closeProductModal = () => setIsProductModalOpen(false);

  const handleSelectProduct = productToAdd => {
    if (!selectedItem) return;

    const productData = products.find(p => p.id === productToAdd.id);

    const newProd = {
      ...productToAdd,
      costoCompra: Number(productData?.costoCompra) || 0,
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
                ),
              };
            } else {
              return {
                ...item,
                productosEnComanda: [...item.productosEnComanda, newProd],
              };
            }
          }
          return item;
        })
      );
    };

    if (isCanchaSelected) updateIn(canchas, setCanchas);
    else updateIn(openOrders, setOpenOrders);

    closeProductModal();
  };

  const handleUpdateProductQuantity = (productId, delta) => {
    if (!selectedItem) return;

    const updateIn = (items, setter) => {
      setter(
        items.map(item => {
          if (item.id === selectedComandaId) {
            const updated = item.productosEnComanda
              .map(prod => {
                if (prod.id === productId) {
                  const newQty = (prod.cantidad || 0) + delta;
                  if (newQty <= 0) return null;
                  return { ...prod, cantidad: newQty };
                }
                return prod;
              })
              .filter(Boolean);
            return { ...item, productosEnComanda: updated };
          }
          return item;
        })
      );
    };

    if (isCanchaSelected) updateIn(canchas, setCanchas);
    else updateIn(openOrders, setOpenOrders);
  };

  // ABRIR MODAL DE PAGO
  const openPaymentModal = (comandaId, isCancha) => {
    const itemToPay =
      comandaId != null
        ? isCancha
          ? canchas.find(c => c.id === comandaId)
          : openOrders.find(o => o.id === comandaId)
        : selectedItem;

    if (!itemToPay || !itemToPay.productosEnComanda.length) {
      alert('La comanda debe tener productos.');
      return;
    }

    if (itemToPay.id !== selectedComandaId || isCancha !== isCanchaSelected) {
      handleSelectComanda(itemToPay.id, isCancha);
    }

    setIsPaymentModalOpen(true);
  };

  const closePaymentModal = () => {
    if (!isSubmittingPayment) setIsPaymentModalOpen(false);
  };

  // PROCESAR PAGO FINAL
  const handleProcessPayment = async paymentData => {
    if (!selectedItem) return;

    setIsSubmittingPayment(true);

    const ventaTotal = selectedItem.productosEnComanda.reduce(
      (sum, p) => sum + p.precio * p.cantidad,
      0
    );

    const nuevaComanda = {
      tipoComanda: selectedItem.tipo,
      ubicacion: selectedItem.nombre,
      productos: selectedItem.productosEnComanda.map(p => ({
        id: p.id,
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio,
        costoCompra: p.costoCompra || 0,
      })),
      clienteId: selectedItem.clienteSeleccionado
        ? selectedItem.clienteSeleccionado.id
        : null,
      clienteNombre: selectedItem.clienteSeleccionado
        ? selectedItem.clienteSeleccionado.nombreCompleto
        : 'Anónimo',
      total: ventaTotal,
      metodoPago: paymentData.method || 'Desconocido',
      fecha: Timestamp.fromDate(new Date()),
    };

    try {
      await addDoc(comandasPagadasCollectionRef, nuevaComanda);

      // Actualiza historial del cliente
      if (
        selectedItem.clienteSeleccionado &&
        selectedItem.clienteSeleccionado.id
      ) {
        const clientRef = doc(
          db,
          'clientes',
          selectedItem.clienteSeleccionado.id
        );
        await runTransaction(db, async tx => {
          const clientSnap = await tx.get(clientRef);
          if (clientSnap.exists()) {
            const curr = clientSnap.data().totalCompras || 0;
            tx.update(clientRef, { totalCompras: curr + ventaTotal });
          }
        });
      }

      // Eliminar comanda pagada
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

    } catch (err) {
      console.error('Error procesando pago:', err);
      alert('Error al procesar el pago.');
    } finally {
      setIsSubmittingPayment(false);
    }
  };

  // 💾 GUARDAR COMANDA PENDIENTE
  const handleSaveComandaPendiente = () => {
    if (!selectedItem) return;

    if (!isCanchaSelected) {
      alert("Solo las canchas pueden guardarse como pendiente.");
      return;
    }

    if (!selectedItem.productosEnComanda.length) {
      alert("No hay productos para guardar.");
      return;
    }

    const nuevaComandaAbierta = {
      id:
        openOrders.length > 0
          ? Math.max(...openOrders.map(o => o.id)) + 1
          : 1,
      nombre: selectedItem.nombre,
      productosEnComanda: [...selectedItem.productosEnComanda],
      clienteSeleccionado: selectedItem.clienteSeleccionado || null,
      tipo: "abierta",
    };

    setOpenOrders(prev => [...prev, nuevaComandaAbierta]);

    // Limpia la cancha original
    setCanchas(prev =>
      prev.map(c =>
        c.id === selectedComandaId
          ? { ...c, productosEnComanda: [], clienteSeleccionado: null }
          : c
      )
    );

    setSelectedComandaId(null);
    alert("✅ Comanda guardada como pendiente.");
  };

  return (
    <div className="comandas-container">
      <h2 className="main-title">Sistema de Comandas</h2>

      <div className="main-content-panels">
        {/* PANEL IZQUIERDO */}
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

          <hr />

          <div className="section-comandas-abiertas">
            <h3 className="section-title">Comandas Guardadas / Abiertas</h3>

            <button
              onClick={handleCreateOpenOrder}
              className="create-open-order-btn"
            >
              + Abrir Comanda
            </button>

            <div className="open-orders-list-cards">
              {openOrders.length > 0 ? (
                openOrders.map(o => (
                  <div key={o.id} className="pending-order-card">

                    <button
                      onClick={() => handleDeleteOpenOrder(o.id)}
                      className="delete-open-order-btn-card"
                      title="Eliminar Comanda Guardada"
                    >
                      🗑️
                    </button>

                    <span className="pending-cancha-name">{o.nombre}</span>

                    <p className="pending-client">
                      Cliente: {o.clienteSeleccionado?.nombreCompleto || 'Anónimo'}
                    </p>

                    <ul className="pending-products-list">
                      {o.productosEnComanda.map(p => (
                        <li key={p.id}>
                          {p.nombre} x {p.cantidad}
                        </li>
                      ))}
                    </ul>

                    <div className="pending-total-area">
                      <p className="pending-total">
                        Total: Bs.{' '}
                        {o.productosEnComanda
                          .reduce((sum, prod) => sum + prod.precio * (prod.cantidad || 0), 0)
                          .toFixed(2)}
                      </p>
                    </div>

                    <div className="pending-actions">
                      <button
                        onClick={() => handleSelectComanda(o.id, false)}
                        className="edit-btn"
                      >
                        EDITAR
                      </button>

                      <button
                        onClick={() => openPaymentModal(o.id, false)}
                        className="pay-btn-small"
                      >
                        PAGAR
                      </button>
                    </div>

                  </div>
                ))
              ) : (
                <p className="no-open-orders-msg">No hay comandas guardadas</p>
              )}
            </div>
          </div>

        </div>
        {/* FIN PANEL IZQUIERDO */}

        {/* PANEL DERECHO */}
        <div className="details-panel">
          {selectedItem ? (
            <div className="comanda-details-container">
              <h3 className="details-title">Comanda: {selectedItem.nombre}</h3>

              {/* CLIENTE */}
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

              {/* PRODUCTOS */}
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
                            Bs. {(prod.precio * prod.cantidad).toFixed(2)}
                            <small>(Bs. {prod.precio.toFixed(2)} c/u)</small>
                          </span>
                        </div>

                        <div className="quantity-controls">
                          <button
                            className="quantity-btn"
                            onClick={() => handleUpdateProductQuantity(prod.id, -1)}
                          >
                            −
                          </button>

                          <span className="product-quantity">{prod.cantidad}</span>

                          <button
                            className="quantity-btn"
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
                    {/* GUARDAR PENDIENTE SOLO PARA CANCHA */}
                    {isCanchaSelected && (
                      <button
                        onClick={handleSaveComandaPendiente}
                        className="save-btn"
                      >
                        Guardar Comanda Pendiente
                      </button>
                    )}

                    <button
                      onClick={() => openPaymentModal(null, null)}
                      className="pay-btn"
                      disabled={isSubmittingPayment}
                    >
                      {isSubmittingPayment ? 'Procesando...' : 'Pagar Venta'}
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
        {/* FIN PANEL DERECHO */}

      </div>

      {/* MODALES */}
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

      {isPaymentModalOpen && (
        <PaymentModal
          totalAmount={totalAmount}
          products={selectedItem?.productosEnComanda || []}
          onProcessPayment={handleProcessPayment}
          onClose={closePaymentModal}
        />
      )}

    </div>
  );
};

export default Comandas;
