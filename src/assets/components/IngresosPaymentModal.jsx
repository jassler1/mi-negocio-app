import React, { useState } from 'react';
import './IngresosPaymentModal.css';
import { FaMoneyBillWave, FaExchangeAlt, FaTimesCircle, FaCheckCircle } from 'react-icons/fa';

function IngresosPaymentModal({ totalAmount, onClose, onProcessPayment }) {
  const [paymentMethod, setPaymentMethod] = useState('efectivo');
  const [amountReceived, setAmountReceived] = useState('');

  const handleProcessPayment = () => {
    if (parseFloat(amountReceived) < totalAmount) {
      alert("El monto recibido no puede ser menor al total.");
      return;
    }

    const change = parseFloat(amountReceived) - totalAmount;

    onProcessPayment({
      paymentMethod,
      amountReceived: parseFloat(amountReceived),
      change: change,
      totalAmount: totalAmount,
    });
    onClose();
  };

  const cambio = parseFloat(amountReceived) - totalAmount;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="close-btn" onClick={onClose}>
          <FaTimesCircle />
        </button>
        <h2>
          <FaMoneyBillWave className="modal-icon" /> Pagar Ingreso
        </h2>
        
        <div className="payment-summary">
          <h3>Total a Pagar: <span className="total-amount">Bs. {totalAmount.toFixed(2)}</span></h3>
        </div>

        <div className="form-group">
          <label className="label">Método de Pago:</label>
          <select 
            className="select-field" 
            value={paymentMethod} 
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            <option value="efectivo">Efectivo</option>
            <option value="transferencia">Transferencia</option>
            <option value="tarjeta">Tarjeta</option>
          </select>
        </div>

        {paymentMethod === 'efectivo' && (
          <div className="form-group">
            <label className="label">Monto Recibido:</label>
            <input
              type="number"
              className="input-field"
              value={amountReceived}
              onChange={(e) => setAmountReceived(e.target.value)}
              placeholder="Monto recibido"
            />
          </div>
        )}

        <div className="change-info">
          <p>
            <FaExchangeAlt /> Cambio: <span className="change-amount">Bs. {cambio.toFixed(2)}</span>
          </p>
        </div>

        <div className="modal-actions">
          <button onClick={handleProcessPayment} className="confirm-btn">
            <FaCheckCircle /> Confirmar Pago
          </button>
        </div>
      </div>
    </div>
  );
}

export default IngresosPaymentModal;