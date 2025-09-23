import React, { useState } from 'react';
import { db } from '../../firebaseConfig';
import { doc, runTransaction } from 'firebase/firestore';
import './PaymentModal.css';

function PaymentModal({ totalAmount, products, onProcessPayment, onClose }) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', name: '', expiry: '' });
  const [cashAmount, setCashAmount] = useState('');
  const [multiPayment, setMultiPayment] = useState({
    qr: '',
    card: '',
    cash: '',
  });

  const handlePaymentMethodChange = (method) => {
    setPaymentMethod(method);
    // Reinicia los campos al cambiar el método de pago
    setQrCodeData('');
    setCardDetails({ number: '', name: '', expiry: '' });
    setCashAmount('');
    setMultiPayment({ qr: '', card: '', cash: '' });
  };

  const handleMultiPaymentChange = (e) => {
    const { name, value } = e.target;
    // Permite números y un solo punto decimal
    const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setMultiPayment(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleCardDetailsChange = (e) => {
    const { name, value } = e.target;
    setCardDetails(prev => ({ ...prev, [name]: value }));
  };

  const calculateMultiPaymentTotal = () => {
    const qr = parseFloat(multiPayment.qr) || 0;
    const card = parseFloat(multiPayment.card) || 0;
    const cash = parseFloat(multiPayment.cash) || 0;
    return qr + card + cash;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let paymentData;

    switch (paymentMethod) {
      case 'qr':
        paymentData = { method: 'QR', amount: totalAmount, details: qrCodeData };
        break;
      case 'card':
        // Validación básica para tarjeta
        if (!cardDetails.number || !cardDetails.name || !cardDetails.expiry) {
          alert("Por favor, complete todos los campos de la tarjeta.");
          return;
        }
        paymentData = { method: 'Tarjeta', amount: totalAmount, details: cardDetails };
        break;
      case 'cash':
        const cashValue = parseFloat(cashAmount) || 0;
        if (cashValue < totalAmount) {
          alert("El monto recibido en efectivo es menor al total de la comanda.");
          return;
        }
        const cambio = cashValue - totalAmount;
        paymentData = { method: 'Efectivo', amount: totalAmount, cashReceived: cashValue, cambio: cambio.toFixed(2) };
        break;
      case 'multi':
        const multiTotal = calculateMultiPaymentTotal();
        if (multiTotal < totalAmount) {
          alert(`El total pagado (${multiTotal.toFixed(2)}) es menor que el monto total de la comanda (${totalAmount.toFixed(2)}).`);
          return;
        }
        paymentData = { method: 'Multipago', totalAmount, details: multiPayment };
        break;
      default:
        alert('Por favor, seleccione un método de pago.');
        return;
    }

    if (!Array.isArray(products)) {
      console.error("Error: products no es un array iterable.", products);
      alert("Error interno. Por favor, recargue la página.");
      return;
    }

    try {
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

          transaction.update(productRef, { cantidad: newQuantity });
        });
      }

      onProcessPayment(paymentData);

    } catch (e) {
      console.error("Error al descontar del inventario: ", e);
      alert(e);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Finalizar Comanda</h2>
        <h3 className="total-amount">Monto Total: Bs. {totalAmount.toFixed(2)}</h3>

        <h4 className="section-title">Seleccionar Método de Pago:</h4>
        <div className="payment-method-buttons">
          <button
            type="button"
            className={`payment-btn ${paymentMethod === 'qr' ? 'active' : ''}`}
            onClick={() => handlePaymentMethodChange('qr')}
          >
            QR
          </button>
          <button
            type="button"
            className={`payment-btn ${paymentMethod === 'card' ? 'active' : ''}`}
            onClick={() => handlePaymentMethodChange('card')}
          >
            Tarjeta de Débito
          </button>
          <button
            type="button"
            className={`payment-btn ${paymentMethod === 'cash' ? 'active' : ''}`}
            onClick={() => handlePaymentMethodChange('cash')}
          >
            Efectivo
          </button>
          <button
            type="button"
            className={`payment-btn ${paymentMethod === 'multi' ? 'active' : ''}`}
            onClick={() => handlePaymentMethodChange('multi')}
          >
            Multipago
          </button>
        </div>

        <form onSubmit={handleSubmit} className="payment-form">
          {paymentMethod === 'qr' && (
            <div className="payment-form-section">
              <p>Escanee el código QR para realizar el pago de **Bs. {totalAmount.toFixed(2)}**</p>
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
              <p>Cambio a entregar: **Bs. {((parseFloat(cashAmount) || 0) - totalAmount).toFixed(2)}**</p>
            </div>
          )}

          {paymentMethod === 'multi' && (
            <div className="payment-form-section">
              <h4 className="section-title">Detalle del Multipago</h4>
              <p>Total a pagar: **Bs. {totalAmount.toFixed(2)}**</p>
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
              <p>Total Parcial: **Bs. {calculateMultiPaymentTotal().toFixed(2)}**</p>
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