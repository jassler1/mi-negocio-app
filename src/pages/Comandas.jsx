import React, { useState, useEffect } from 'react';
import ClientSelectionModal from '../assets/components/ClientSelectionModal';
import ProductSelectionModal from '../assets/components/ProductSelectionModal';
import PaymentModal from '../assets/components/PaymentModal';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, runTransaction, getDocs } from 'firebase/firestore';
import './Comandas.css';

// El componente ahora recibe las props de App.jsx
const Comandas = ({ canchas, setCanchas, openOrders, setOpenOrders }) => {
  const [selectedComandaId, setSelectedComandaId] = useState(null);
  const [isCanchaSelected, setIsCanchaSelected] = useState(null);

  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const productsCollectionRef = collection(db, 'productos');
  const comandasPagadasCollectionRef = collection(db, 'comandas_pagadas');

  useEffect(() => {
    const getProducts = async () => {
      try {
        const data = await getDocs(productsCollectionRef);
        const productsData = data.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id
        }));
        setProducts(productsData);
      } catch (error) {
        console.error("Error al obtener los productos:", error);
      }
    };
    getProducts();
  }, []);

  const selectedItem = selectedComandaId
    ? (isCanchaSelected
        ? canchas.find(c => c.id === selectedComandaId)
        : openOrders.find(o => o.id === selectedComandaId)
      )
    : null;

  const handleSelectComanda = (id, isCancha) => {
    setSelectedComandaId(id);
    setIsCanchaSelected(isCancha);
  };

  const handleAddCancha = () => {
    const newCanchaId = canchas.length > 0 ? Math.max(...canchas.map(c => c.id)) + 1 : 1;
    const newCancha = {
      id: newCanchaId,
      nombre: `Cancha ${newCanchaId}`,
      productosEnComanda: [],
      clienteSeleccionado: null,
      tipo: 'cancha'
    };
    setCanchas(prevCanchas => [...prevCanchas, newCancha]);
    handleSelectComanda(newCanchaId, true);
  };

  const handleCreateOpenOrder = () => {
    const newOrderId = openOrders.length > 0 ? Math.max(...openOrders.map(o => o.id)) + 1 : 1;
    const newOrder = {
      id: newOrderId,
      nombre: `Comanda #${newOrderId}`,
      productosEnComanda: [],
      clienteSeleccionado: null,
      tipo: 'abierta'
    };
    setOpenOrders(prevOrders => [...prevOrders, newOrder]);
    handleSelectComanda(newOrderId, false);
  };
  
  const handleOpenClientModal = () => setIsClientModalOpen(true);
  const handleSelectClient = (client) => {
    const updateState = (items, setItems) =>
      setItems(items.map(item =>
        item.id === selectedComandaId ? { ...item, clienteSeleccionado: client } : item
      ));

    if (isCanchaSelected) {
      updateState(canchas, setCanchas);
    } else {
      updateState(openOrders, setOpenOrders);
    }
    setIsClientModalOpen(false);
  };
  const handleCloseClientModal = () => setIsClientModalOpen(false);

  const handleOpenProductModal = () => setIsProductModalOpen(true);
  const handleSelectProduct = (newProduct) => {
    const updateState = (items, setItems) =>
      setItems(items.map(item => {
        if (item.id === selectedComandaId) {
          const existingProduct = item.productosEnComanda.find(p => p.id === newProduct.id);
          if (existingProduct) {
            return {
              ...item,
              productosEnComanda: item.productosEnComanda.map(p =>
                p.id === newProduct.id ? { ...p, cantidad: p.cantidad + newProduct.cantidad } : p
              ),
            };
          } else {
            return {
              ...item,
              productosEnComanda: [...item.productosEnComanda, newProduct],
            };
          }
        }
        return item;
      }));
  
    if (isCanchaSelected) {
      updateState(canchas, setCanchas);
    } else {
      updateState(openOrders, setOpenOrders);
    }
    setIsProductModalOpen(false);
  };
  const handleCloseProductModal = () => setIsProductModalOpen(false);

  const handleUpdateProductQuantity = (productId, change) => {
    const updateState = (items, setItems) =>
      setItems(items.map(item => {
        if (item.id === selectedComandaId) {
          const updatedProducts = item.productosEnComanda.map(product => {
            if (product.id === productId) {
              const newQuantity = product.cantidad + change;
              return newQuantity > 0 ? { ...product, cantidad: newQuantity } : null;
            }
            return product;
          }).filter(Boolean);
          return { ...item, productosEnComanda: updatedProducts };
        }
        return item;
      }));
  
    if (isCanchaSelected) {
      updateState(canchas, setCanchas);
    } else {
      updateState(openOrders, setOpenOrders);
    }
  };

  const handleOpenPaymentModal = () => {
    if (selectedItem && selectedItem.productosEnComanda.length > 0) {
      setIsPaymentModalOpen(true);
    } else {
      alert("La comanda debe tener al menos un producto para ser pagada.");
    }
  };
  
  const handleClosePaymentModal = () => setIsPaymentModalOpen(false);

  const handleProcessPayment = async (paymentData) => {
    const totalVenta = selectedItem.productosEnComanda.reduce((sum, product) => sum + (product.precio * product.cantidad), 0);
    const tipoComanda = selectedItem.tipo;
    const ubicacion = selectedItem.nombre;
    const cliente = selectedItem.clienteSeleccionado;

    const nuevaComanda = {
      tipoComanda,
      ubicacion,
      productos: selectedItem.productosEnComanda.map(p => ({
        id: p.id,
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio,
      })),
      clienteId: cliente ? cliente.id : null,
      clienteNombre: cliente ? cliente.nombreCompleto : 'Anónimo',
      total: totalVenta,
      metodoPago: paymentData.method,
      fecha: new Date().toISOString().slice(0, 10),
    };

    try {
      await addDoc(comandasPagadasCollectionRef, nuevaComanda);
      
      if (cliente && cliente.id) {
        const clientRef = doc(db, 'clientes', cliente.id);
        await runTransaction(db, async (transaction) => {
          const clientDoc = await transaction.get(clientRef);
          if (clientDoc.exists()) {
            const currentTotal = clientDoc.data().totalCompras || 0;
            const newTotal = currentTotal + totalVenta;
            transaction.update(clientRef, { totalCompras: newTotal });
          }
        });
      }

      // Logic to close the command
      if (isCanchaSelected) {
        setCanchas(prevCanchas => prevCanchas.map(c => 
          c.id === selectedComandaId ? { ...c, productosEnComanda: [], clienteSeleccionado: null } : c
        ));
      } else {
        setOpenOrders(prevOrders => prevOrders.filter(o => o.id !== selectedComandaId));
      }
      
      setSelectedComandaId(null);
      setIsPaymentModalOpen(false);
      alert('Pago procesado y comanda cerrada.');

    } catch (e) {
      console.error('Error al procesar el pago o actualizar cliente:', e);
      alert('Ocurrió un error al procesar el pago.');
    }
  };

  const totalAmount = selectedItem?.productosEnComanda.reduce((sum, product) =>
    sum + (product.precio * product.cantidad || 0), 0) || 0;

  const allOpenOrders = [
    ...canchas.filter(c => c.productosEnComanda.length > 0),
    ...openOrders
  ];

  return (
    <div className="comandas-container">
      <h2 className="main-title">Sistema de Comandas</h2>
      
      <div className="main-content-panels">
        {/* Panel Izquierdo: Canchas y Comandas Abiertas */}
        <div className="side-panel">
          <div className="section-canchas">
            <h3 className="section-title">Comandas por Cancha</h3>
            <div className="button-list">
              {canchas.map(cancha => (
                <button
                  key={cancha.id}
                  onClick={() => handleSelectComanda(cancha.id, true)}
                  className={`comanda-btn ${isCanchaSelected && selectedComandaId === cancha.id ? 'active' : ''}`}
                >
                  {cancha.nombre}
                </button>
              ))}
              <button onClick={handleAddCancha} className="add-btn-cancha">
                Agregar Cancha
              </button>
            </div>
          </div>
          
          <div className="section-comandas-abiertas">
            <div className="open-orders-header">
              <h3 className="section-title">Comandas Abiertas</h3>
              <button onClick={handleCreateOpenOrder} className="create-open-order-btn">
                Crear +
              </button>
            </div>
            <div className="button-list open-orders-list">
              {openOrders.length > 0 ? (
                openOrders.map(order => (
                  <button
                    key={order.id}
                    onClick={() => handleSelectComanda(order.id, false)}
                    className={`comanda-btn ${!isCanchaSelected && selectedComandaId === order.id ? 'active' : ''}`}
                  >
                    {order.nombre}
                  </button>
                ))
              ) : (
                <p>No hay comandas abiertas.</p>
              )}
            </div>
          </div>
        </div>

        {/* Panel Central: Detalles de la Comanda Seleccionada */}
        <div className="details-panel">
          {selectedItem ? (
            <div className="comanda-details-container">
              <h3 className="details-title">Comanda de {selectedItem.nombre}</h3>
              
              <div className="details-section">
                <button onClick={handleOpenClientModal} className="add-client-btn">
                  {selectedItem.clienteSeleccionado ? 'Cambiar Cliente' : 'Agregar Cliente'}
                </button>
                {selectedItem.clienteSeleccionado && (
                  <div className="client-info">
                    <h4>Cliente seleccionado:</h4>
                    <p><strong>Nombre:</strong> {selectedItem.clienteSeleccionado.nombreCompleto}</p>
                    <p><strong>Número de CI:</strong> {selectedItem.clienteSeleccionado.numeroCi}</p>
                  </div>
                )}
              </div>
              
              <div className="details-section">
                <button onClick={handleOpenProductModal} className="add-product-btn">Agregar Producto</button>
                <h3 className="products-list-title">Productos en la Comanda</h3>
                {selectedItem.productosEnComanda.length > 0 ? (
                  <ul className="products-list">
                    {selectedItem.productosEnComanda.map((product) => (
                      <li key={product.id} className="product-item">
                        <div className="product-info">
                          {product.nombre} - Bs. {(product.precio * product.cantidad).toFixed(2)}
                          <br />
                          <small>Precio unitario: Bs. {product.precio.toFixed(2)}</small>
                        </div>
                        <div className="quantity-controls">
                          <button onClick={() => handleUpdateProductQuantity(product.id, -1)} className="quantity-btn decrease-btn">-</button>
                          <span className="product-quantity">{product.cantidad}</span>
                          <button onClick={() => handleUpdateProductQuantity(product.id, 1)} className="quantity-btn increase-btn">+</button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="empty-products-msg">No hay productos en esta comanda. Selecciona uno para empezar.</p>
                )}
                
                <div className="total-amount-container">
                  <p className="total-amount-text">Precio Total: Bs. {totalAmount.toFixed(2)}</p>
                </div>
                
                {selectedItem.productosEnComanda.length > 0 && (
                  <button onClick={handleOpenPaymentModal} className="pay-btn">
                    Pagar
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="no-selection-message">
              <p>Selecciona una cancha o comanda abierta para ver los detalles.</p>
            </div>
          )}
        </div>
      </div>

      {/* Panel Inferior: Comandas Abiertas visibles */}
      <div className="open-orders-display-panel">
        <h3 className="panel-title">Comandas Abiertas</h3>
        <div className="open-orders-list-cards">
          {allOpenOrders.length > 0 ? (
            allOpenOrders.map(order => (
              <div key={order.tipo === 'cancha' ? `cancha-${order.id}` : `orden-${order.id}`} className="order-card">
                <div className="card-header">
                  <h4>{order.nombre}</h4>
                </div>
                <div className="card-body">
                  {order.clienteSeleccionado && (
                    <p>Cliente: {order.clienteSeleccionado.nombreCompleto}</p>
                  )}
                  {order.productosEnComanda.map(prod => (
                    <p key={prod.id}>{prod.nombre} x {prod.cantidad} ({prod.precio.toFixed(2)} Bs.)</p>
                  ))}
                  <div className="total-card">
                    <strong>Total: {order.productosEnComanda.reduce((sum, p) => sum + (p.precio * p.cantidad), 0).toFixed(2)} Bs.</strong>
                  </div>
                </div>
                <div className="card-actions">
                  <button className="btn-edit" onClick={() => handleSelectComanda(order.id, order.tipo === 'cancha')}>
                    Editar
                  </button>
                  <button className="btn-pay" onClick={() => handleOpenPaymentModal()}>
                    Pagar
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="no-open-orders-msg">No hay comandas abiertas en este momento.</p>
          )}
        </div>
      </div>

      {isClientModalOpen && (
        <ClientSelectionModal
          onSelectClient={handleSelectClient}
          onClose={handleCloseClientModal}
        />
      )}
      {isProductModalOpen && (
        <ProductSelectionModal
          products={products}
          onSelectProduct={handleSelectProduct}
          onClose={handleCloseProductModal}
          filtroDeSeccion="comandas"
        />
      )}
      {isPaymentModalOpen && selectedItem && (
        <PaymentModal
          totalAmount={totalAmount}
          products={selectedItem.productosEnComanda}
          onProcessPayment={handleProcessPayment}
          onClose={handleClosePaymentModal}
        />
      )}
    </div>
  );
};

export default Comandas;