import React, { useState } from 'react';
import { db } from '../../firebaseConfig';
import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import './PaymentModal.css';

function PaymentModal({ totalAmount, products, onProcessPayment, onClose }) {
  const [paymentMethod, setPaymentMethod] = useState(''); // Método de pago seleccionado
  const [qrCodeData, setQrCodeData] = useState(''); // Datos del código QR
  const [cardDetails, setCardDetails] = useState({ number: '', name: '', expiry: '' }); // Datos de la tarjeta
  const [cashAmount, setCashAmount] = useState(''); // Monto recibido en efectivo
  const [multiPayment, setMultiPayment] = useState({ qr: '', card: '', cash: '' }); // Detalles del multipago

  // Maneja la selección del método de pago
  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    // Limpia los campos relacionados con otros métodos de pago
    setQrCodeData('');
    setCardDetails({ number: '', name: '', expiry: '' });
    setCashAmount('');
    setMultiPayment({ qr: '', card: '', cash: '' });
  };

  // Maneja los cambios en los montos de multipago
  const handleMultiPaymentChange = (e) => {
    const { name, value } = e.target;
    const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1'); // Sanitiza la entrada numérica
    setMultiPayment(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  // Maneja los cambios en los datos de la tarjeta
  const handleCardDetailsChange = (e) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({ ...prev, [name]: value }));
  };

  // Calcula el total de un multipago (efectivo + tarjeta + QR)
  const calculateMultiPaymentTotal = () => {
    const qr = parseFloat(multiPayment.qr) || 0;
    const card = parseFloat(multiPayment.card) || 0;
    const cash = parseFloat(multiPayment.cash) || 0;
    return qr + card + cash;
  };

  // Maneja el envío del formulario de pago
  const handleSubmit = async (e) => {
    e.preventDefault();
    let paymentData;

    const safeTotalAmount = typeof totalAmount === 'number' ? totalAmount : 0;

    // Crear el objeto de datos del pago según el método seleccionado
    switch (paymentMethod) {
      case 'qr':
        paymentData = { method: 'QR', amount: safeTotalAmount, details: qrCodeData, timestamp: Timestamp.fromDate(new Date()) };
        break;
      case 'card':
        if (!cardDetails.number || !cardDetails.name || !cardDetails.expiry) {
          alert("Por favor, complete todos los campos de la tarjeta.");
          return;
        }
        paymentData = { method: 'Tarjeta', amount: safeTotalAmount, details: cardDetails, timestamp: Timestamp.fromDate(new Date()) };
        break;
      case 'cash':
        const cashValue = parseFloat(cashAmount) || 0;
        if (cashValue < safeTotalAmount) {
          alert("El monto recibido en efectivo es menor al total de la comanda.");
          return;
        }
        const cambio = cashValue - safeTotalAmount;
        paymentData = {
          method: 'Efectivo',
          amount: safeTotalAmount,
          cashReceived: cashValue,
          cambio: cambio.toFixed(2),
          timestamp: Timestamp.fromDate(new Date())
        };
        break;
      case 'multi':
        const multiTotal = calculateMultiPaymentTotal();
        if (multiTotal < safeTotalAmount) {
          alert(`El total pagado (${multiTotal.toFixed(2)}) es menor que el monto total de la comanda (${safeTotalAmount.toFixed(2)}).`);
          return;
        }
        paymentData = { method: 'Multipago', totalAmount: safeTotalAmount, details: multiPayment, timestamp: Timestamp.fromDate(new Date()) };
        break;
      default:
        alert('Por favor, seleccione un método de pago.');
        return;
    }

    // Asegurarse de que `products` sea un array
    if (!Array.isArray(products)) {
      console.error("Error: products no es un array iterable.", products);
      alert("Error interno. Por favor, recargue la página.");
      return;
    }

    try {
      // Procesar cada producto y descontar el stock
      for (const product of products) {
        const productRef = doc(db, 'inventario', product.id);
        await runTransaction(db, async (transaction) => {
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) {
            throw "El documento del producto no existe!";
          }

          const currentQuantity = productDoc.data().cantidad;
          const newQuantity = currentQuantity - product.cantidad;

          if (newQuantity < 0) {
            throw `No hay suficiente stock para ${product.nombre}. Cantidad disponible: ${currentQuantity}`;
          }

          // Actualiza la cantidad del producto en la base de datos
          transaction.update(productRef, { cantidad: newQuantity });
        });
      }

      // Llamada a la función que maneja el pago exitoso
      onProcessPayment(paymentData);

    } catch (e) {
      console.error("Error al descontar del inventario: ", e);
      alert(e);
    }
  };

  const safeTotalAmount = typeof totalAmount === 'number' ? totalAmount : 0;
  const parsedCash = parseFloat(cashAmount) || 0;
  const cambio = (parsedCash - safeTotalAmount).toFixed(2);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Finalizar Comanda</h2>
        <h3 className="total-amount">Monto Total: Bs. {safeTotalAmount.toFixed(2)}</h3>

        <h4 className="section-title">Seleccionar Método de Pago:</h4>
        <div className="payment-method-buttons">
          <button type="button" className={`payment-btn ${paymentMethod === 'qr' ? 'active' : ''}`} onClick={() => handlePaymentMethodChange('qr')}>QR</button>
          <button type="button" className={`payment-btn ${paymentMethod === 'card' ? 'active' : ''}`} onClick={() => handlePaymentMethodChange('card')}>Tarjeta de Débito</button>
          <button type="button" className={`payment-btn ${paymentMethod === 'cash' ? 'active' : ''}`} onClick={() => handlePaymentMethodChange('cash')}>Efectivo</button>
          <button type="button" className={`payment-btn ${paymentMethod === 'multi' ? 'active' : ''}`} onClick={() => handlePaymentMethodChange('multi')}>Multipago</button>
        </div>

        <form onSubmit={handleSubmit} className="payment-form">
          {paymentMethod === 'qr' && (
            <div className="payment-form-section">
              <p>Escanee el código QR para realizar el pago de <strong>Bs. {safeTotalAmount.toFixed(2)}</strong></p>
            </div>
          )}

          {paymentMethod === 'card' && (
            <div className="payment-form-section">
              <label htmlFor="card-number">Número de Tarjeta:</label>
              <input type="text" id="card-number" name="number" value={cardDetails.number} onChange={handleCardDetailsChange} required />
              <label htmlFor="card-name">Nombre en la Tarjeta:</label>
              <input type="text" id="card-name" name="name" value={cardDetails.name} onChange={handleCardDetailsChange} required />
              <label htmlFor="card-expiry">Fecha de Vencimiento (MM/AA):</label>
              <input type="text" id="card-expiry" name="expiry" value={cardDetails.expiry} onChange={handleCardDetailsChange} required />
            </div>
          )}

          {paymentMethod === 'cash' && (
            <div className="payment-form-section">
              <label htmlFor="cash-amount">Monto recibido (Bs.):</label>
              <input
                type="text"
                id="cash-amount"
                name="cashAmount"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value.replace(/[^0-9.]/g, ''))}
                required
              />
              <p>Cambio a entregar: <strong>Bs. {cambio}</strong></p>
            </div>
          )}

          {paymentMethod === 'multi' && (
            <div className="payment-form-section">
              <h4 className="section-title">Detalle del Multipago</h4>
              <p>Total a pagar: <strong>Bs. {safeTotalAmount.toFixed(2)}</strong></p>
              <div className="input-group">
                <label htmlFor="multi-cash">Monto en Efectivo:</label>
                <input type="text" id="multi-cash" name="cash" value={multiPayment.cash} onChange={handleMultiPaymentChange} />
              </div>
              <div className="input-group">
                <label htmlFor="multi-card">Monto en Tarjeta:</label>
                <input type="text" id="multi-card" name="card" value={multiPayment.card} onChange={handleMultiPaymentChange} />
              </div>
              <div className="input-group">
                <label htmlFor="multi-qr">Monto en QR:</label>
                <input type="text" id="multi-qr" name="qr" value={multiPayment.qr} onChange={handleMultiPaymentChange} />
              </div>
              <p>Total Parcial: <strong>Bs. {calculateMultiPaymentTotal().toFixed(2)}</strong></p>
            </div>
          )}

          {paymentMethod && (
            <div className="form-actions">
              <button type="submit" className="confirm-btn">Confirmar Pago</button>
            </div>
          )}
        </form>

        <div className="modal-footer">
          <button 
            onClick={onClose} 
            className="payment-btn" 
            type="button"
            style={{ backgroundColor: '#dc3545', color: 'white' }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

export default PaymentModal;