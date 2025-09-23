import React, { useState } from 'react';
import ProductSelectionModal from '../assets/components/ProductSelectionModal';
import PaymentModal from '../assets/components/PaymentModal';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, runTransaction } from 'firebase/firestore';
import './VentaAccesorios.css';

function VentaAccesorios() {
  const [canchas] = useState([
    { id: 1, nombre: 'Cancha 1' },
    { id: 2, nombre: 'Cancha 2' },
    { id: 3, nombre: 'Cancha 3' },
    { id: 4, nombre: 'Cancha 4' },
  ]);
  const [selectedCancha, setSelectedCancha] = useState(null);
  const [canchaProducts, setCanchaProducts] = useState({});
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  // Simulación: Obtener el nombre del usuario de la sesión
  const nombreUsuario = "Jassler"; 

  const ventasCollectionRef = collection(db, 'ventas');

  const handleOpenProductModal = () => {
    if (!selectedCancha) {
      alert("Por favor, selecciona una cancha primero.");
      return;
    }
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
  };

  const handleSelectProduct = (newProduct) => {
    setCanchaProducts(prevCanchaProducts => {
      const currentProducts = prevCanchaProducts[selectedCancha.id] || [];
      const existingProduct = currentProducts.find(p => p.id === newProduct.id);

      let updatedProducts;
      if (existingProduct) {
        updatedProducts = currentProducts.map(p =>
          p.id === newProduct.id ? { ...p, cantidad: p.cantidad + newProduct.cantidad } : p
        );
      } else {
        updatedProducts = [...currentProducts, newProduct];
      }

      return {
        ...prevCanchaProducts,
        [selectedCancha.id]: updatedProducts,
      };
    });
    handleCloseProductModal();
  };
  
  const handleUpdateProductQuantity = (productId, change) => {
    setCanchaProducts(prevCanchaProducts => {
      const currentProducts = prevCanchaProducts[selectedCancha.id] || [];
      const updatedProducts = currentProducts.map(product => {
        if (product.id === productId) {
          const newQuantity = product.cantidad + change;
          if (newQuantity <= 0) {
            return null;
          }
          return { ...product, cantidad: newQuantity };
        }
        return product;
      }).filter(Boolean);

      return {
        ...prevCanchaProducts,
        [selectedCancha.id]: updatedProducts,
      };
    });
  };

  const calculateTotal = () => {
    if (!selectedCancha) return 0;
    const products = canchaProducts[selectedCancha.id] || [];
    return products.reduce((acc, product) => acc + (product.precio * product.cantidad), 0);
  };

  const handleOpenPaymentModal = () => {
    const productsToPay = canchaProducts[selectedCancha.id] || [];
    if (productsToPay.length === 0) {
      alert("No hay accesorios en la lista para procesar el pago.");
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const handleProcessPayment = async (paymentData) => {
    const productsToPay = canchaProducts[selectedCancha.id] || [];
    const totalVenta = calculateTotal();

    const nuevaVenta = {
      cancha: selectedCancha.nombre,
      productos: productsToPay.map(p => ({
        id: p.id,
        nombre: p.nombre,
        cantidad: p.cantidad,
        precio: p.precio
      })),
      total: totalVenta,
      metodoPago: paymentData.method,
      fecha: new Date().toISOString().slice(0, 10),
      usuario: nombreUsuario, // <-- ¡Aquí se agrega el nombre de usuario!
    };

    try {
      for (const product of productsToPay) {
        const productRef = doc(db, 'inventario', product.id);
        await runTransaction(db, async (transaction) => {
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) {
            throw `El documento del producto ${product.nombre} no existe!`;
          }
          const currentQuantity = productDoc.data().cantidad;
          const newQuantity = currentQuantity - product.cantidad;
          if (newQuantity < 0) {
            throw `No hay suficiente stock para ${product.nombre}. Cantidad disponible: ${currentQuantity}`;
          }
          transaction.update(productRef, { cantidad: newQuantity });
        });
      }

      await addDoc(ventasCollectionRef, nuevaVenta);
      console.log("Venta registrada en Firebase:", nuevaVenta);
      alert("Venta procesada y guardada.");

      setCanchaProducts(prevCanchaProducts => {
        const newCanchaProducts = { ...prevCanchaProducts };
        delete newCanchaProducts[selectedCancha.id];
        return newCanchaProducts;
      });
      setSelectedCancha(null);
      handleClosePaymentModal();
      
    } catch (e) {
      console.error("Error al procesar la venta: ", e);
      alert(e.message || "Ocurrió un error al procesar la venta.");
    }
  };

  const handleSelectCancha = (cancha) => {
    setSelectedCancha(cancha);
  };
  
  const productsToShow = selectedCancha ? (canchaProducts[selectedCancha.id] || []) : [];

  return (
    <div className="ventas-container">
      <h1 className="main-title">Venta de Accesorios</h1>
      
      <div className="section-canchas">
        <h3 className="section-title">Seleccionar Cancha</h3>
        <div className="cancha-buttons-container">
          {canchas.map(cancha => (
            <button
              key={cancha.id}
              onClick={() => handleSelectCancha(cancha)}
              className={`cancha-btn ${selectedCancha && selectedCancha.id === cancha.id ? 'active' : ''}`}
            >
              {cancha.nombre}
            </button>
          ))}
        </div>
      </div>
      
      {selectedCancha && (
        <div className="selected-cancha-info">
          <h4>Cancha seleccionada: {selectedCancha.nombre}</h4>
        </div>
      )}

      <button onClick={handleOpenProductModal} className="add-accessory-btn">
        Añadir Accesorio
      </button>
      
      <div className="products-list-container">
        <h2 className="list-title">Productos en la Venta</h2>
        <ul className="product-list">
          {productsToShow.length === 0 ? (
            <p className="no-products-msg">No hay accesorios en la lista para esta cancha.</p>
          ) : (
            productsToShow.map(product => (
              <li key={product.id} className="product-item">
                <div className="product-info">
                  <span className="product-name">{product.nombre}</span>
                  <span className="product-price">Bs. {(product.precio * product.cantidad).toFixed(2)}</span>
                </div>
                <div className="product-quantity-controls">
                  <button onClick={() => handleUpdateProductQuantity(product.id, -1)} className="quantity-btn">-</button>
                  <span className="product-quantity">{product.cantidad}</span>
                  <button onClick={() => handleUpdateProductQuantity(product.id, 1)} className="quantity-btn">+</button>
                </div>
              </li>
            ))
          )}
        </ul>
      </div>

      <div className="total-container">
        <h3 className="total-amount">Total: Bs. {calculateTotal().toFixed(2)}</h3>
      </div>
      
      {productsToShow.length > 0 && (
        <button
          onClick={handleOpenPaymentModal}
          className="pay-btn"
          disabled={productsToShow.length === 0}
        >
          Pagar
        </button>
      )}

      {isProductModalOpen && (
        <ProductSelectionModal
          onSelectProduct={handleSelectProduct}
          onClose={handleCloseProductModal}
          filtroDeSeccion="accesorios"
        />
      )}

      {isPaymentModalOpen && (
        <PaymentModal
          totalAmount={calculateTotal()}
          products={productsToShow}
          onProcessPayment={handleProcessPayment}
          onClose={handleClosePaymentModal}
        />
      )}
    </div>
  );
}

export default VentaAccesorios;