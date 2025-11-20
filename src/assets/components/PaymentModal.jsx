import React, { useState } from 'react';
import { db } from '../../firebaseConfig';
import { doc, runTransaction, Timestamp } from 'firebase/firestore';
import './PaymentModal.css';

function PaymentModal({ totalAmount, products, onProcessPayment, onClose }) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [qrCodeData, setQrCodeData] = useState('');
  const [cardDetails, setCardDetails] = useState({ number: '', name: '', expiry: '' });
  const [cashAmount, setCashAmount] = useState('');
  const [multiPayment, setMultiPayment] = useState({ qr: '', card: '', cash: '' });

  const handlePaymentMethodChange = method => {
    setPaymentMethod(method);
    setQrCodeData('');
    setCardDetails({ number: '', name: '', expiry: '' });
    setCashAmount('');
    setMultiPayment({ qr: '', card: '', cash: '' });
  };

  const handleMultiPaymentChange = e => {
    const { name, value } = e.target;
    const sanitizedValue = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setMultiPayment(prev => ({ ...prev, [name]: sanitizedValue }));
  };

  const handleCardDetailsChange = e => {
    const { name, value } = e.target;
    setCardDetails(prev => ({ ...prev, [name]: value }));
  };

  const calculateMultiPaymentTotal = () => {
    const qr = parseFloat(multiPayment.qr) || 0;
    const card = parseFloat(multiPayment.card) || 0;
    const cash = parseFloat(multiPayment.cash) || 0;
    return qr + card + cash;
  };

  const handleSubmit = async e => {
    e.preventDefault();
    let paymentData;

    const safeTotalAmount = typeof totalAmount === 'number' ? totalAmount : 0;

    switch (paymentMethod) {
      case 'qr':
        paymentData = {
          method: 'QR',
          amount: safeTotalAmount,
          details: qrCodeData,
          timestamp: Timestamp.fromDate(new Date()),
        };
        break;

      case 'card':
        if (!cardDetails.number || !cardDetails.name || !cardDetails.expiry) {
          alert('Por favor, complete todos los campos de la tarjeta.');
          return;
        }
        paymentData = {
          method: 'Tarjeta',
          amount: safeTotalAmount,
          details: cardDetails,
          timestamp: Timestamp.fromDate(new Date()),
        };
        break;

      case 'cash':
        const cashValue = parseFloat(cashAmount) || 0;
        if (cashValue < safeTotalAmount) {
          alert('El monto recibido es menor al total.');
          return;
        }
        paymentData = {
          method: 'Efectivo',
          amount: safeTotalAmount,
          cashReceived: cashValue,
          cambio: (cashValue - safeTotalAmount).toFixed(2),
          timestamp: Timestamp.fromDate(new Date()),
        };
        break;

      case 'multi':
        const total = calculateMultiPaymentTotal();
        if (total < safeTotalAmount) {
          alert('El multipago no alcanza el total.');
          return;
        }
        paymentData = {
          method: 'Multipago',
          totalAmount: safeTotalAmount,
          details: multiPayment,
          timestamp: Timestamp.fromDate(new Date()),
        };
        break;

      default:
        alert('Seleccione un método de pago.');
        return;
    }

    if (!Array.isArray(products)) {
      alert('Error interno: productos inválidos.');
      return;
    }

    try {
      for (const product of products) {
        const productRef = doc(db, 'inventario', product.id);

        await runTransaction(db, async transaction => {
          const productDoc = await transaction.get(productRef);
          if (!productDoc.exists()) throw 'Producto inexistente en inventario.';

          const currentQty = productDoc.data().cantidad;
          const newQty = currentQty - product.cantidad;

          if (newQty < 0)
            throw `Stock insuficiente para ${product.nombre}. Disponible: ${currentQty}`;

          transaction.update(productRef, { cantidad: newQty });
        });
      }

      // ✔ YA NO CERRAMOS AQUÍ
      await onProcessPayment(paymentData);

    } catch (err) {
      console.error('Error al descontar inventario:', err);
      alert(err);
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

        <h4 className="section-title">Método de Pago:</h4>

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
            Tarjeta
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
            <p>Escanee el código QR para pagar Bs. {safeTotalAmount.toFixed(2)}</p>
          )}

          {paymentMethod === 'card' && (
            <div className="payment-form-section">
              <label>Número de Tarjeta</label>
              <input name="number" value={cardDetails.number} onChange={handleCardDetailsChange} required />

              <label>Nombre</label>
              <input name="name" value={cardDetails.name} onChange={handleCardDetailsChange} required />

              <label>Vencimiento</label>
              <input name="expiry" value={cardDetails.expiry} onChange={handleCardDetailsChange} required />
            </div>
          )}

          {paymentMethod === 'cash' && (
            <div className="payment-form-section">
              <label>Monto recibido:</label>
              <input
                value={cashAmount}
                onChange={e => setCashAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <p>Cambio: Bs. {cambio}</p>
            </div>
          )}

          {paymentMethod === 'multi' && (
            <div className="payment-form-section">
              <label>Efectivo:</label>
              <input name="cash" value={multiPayment.cash} onChange={handleMultiPaymentChange} />

              <label>Tarjeta:</label>
              <input name="card" value={multiPayment.card} onChange={handleMultiPaymentChange} />

              <label>QR:</label>
              <input name="qr" value={multiPayment.qr} onChange={handleMultiPaymentChange} />

              <p>Total Parcial: Bs. {calculateMultiPaymentTotal().toFixed(2)}</p>
            </div>
          )}

          {paymentMethod && (
            <button type="submit" className="confirm-btn">Confirmar Pago</button>
          )}
        </form>

        <button className="payment-btn" onClick={onClose} style={{ backgroundColor: '#dc3545', color: '#fff' }}>
          Cancelar
        </button>

      </div>
    </div>
  );
}

export default PaymentModal;