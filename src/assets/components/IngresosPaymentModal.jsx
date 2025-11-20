import React, { useState } from 'react';
import './PaymentModal.css'; // ¡Reutilizamos el mismo CSS!
import { FaTimesCircle } from 'react-icons/fa';

function IngresosPaymentModal({ totalAmount, onClose, onProcessPayment }) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cashAmount, setCashAmount] = useState('');
  const [multiPayment, setMultiPayment] = useState({ cash: '', card: '', qr: '' });

  const handleMultiPaymentChange = (e) => {
    const { name, value } = e.target;
    const sanitized = value.replace(/[^0-9.]/g, '').replace(/(\..*)\./g, '$1');
    setMultiPayment((prev) => ({ ...prev, [name]: sanitized }));
  };

  const calculateMultiTotal = () => {
    const cash = parseFloat(multiPayment.cash) || 0;
    const card = parseFloat(multiPayment.card) || 0;
    const qr = parseFloat(multiPayment.qr) || 0;
    return cash + card + qr;
  };

  const handleSubmit = () => {
    let paymentData;
    const safeTotal = typeof totalAmount === 'number' ? totalAmount : 0;

    switch (paymentMethod) {
      case 'efectivo':
        const cashValue = parseFloat(cashAmount);
        if (cashValue < safeTotal) {
          alert("El monto recibido no puede ser menor al total.");
          return;
        }
        paymentData = {
          method: 'Efectivo', // Clave 'method'
          amountReceived: cashValue,
          change: cashValue - safeTotal,
        };
        break;

      case 'tarjeta':
      case 'transferencia':
        paymentData = {
          method: paymentMethod.charAt(0).toUpperCase() + paymentMethod.slice(1), // Clave 'method'
          amountReceived: safeTotal,
          change: 0,
        };
        break;

      case 'multipago':
        const total = calculateMultiTotal();
        if (total < safeTotal) {
          alert(`El total del multipago (Bs. ${total.toFixed(2)}) es menor que el total a pagar (Bs. ${safeTotal.toFixed(2)}).`);
          return;
        }
        paymentData = {
          method: 'Multipago', // Clave 'method'
          amountReceived: total,
          details: multiPayment,
          change: total - safeTotal,
        };
        break;

      default:
        alert("Selecciona un método de pago.");
        return;
    }

    onProcessPayment(paymentData);
    onClose();
  };

  const safeTotalAmount = typeof totalAmount === 'number' ? totalAmount : 0;
  const parsedCash = parseFloat(cashAmount) || 0;
  const cambio = (parsedCash - safeTotalAmount).toFixed(2);
  const multiCambio = (calculateMultiTotal() - safeTotalAmount).toFixed(2);

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h2 className="modal-title">Pagar Ingreso</h2>
        <h3 className="total-amount">Monto Total: Bs. {safeTotalAmount.toFixed(2)}</h3>

        <h4 className="section-title">Seleccionar Método de Pago:</h4>
        <div className="payment-method-buttons">
          <button type="button" className={`payment-btn ${paymentMethod === 'efectivo' ? 'active' : ''}`} onClick={() => setPaymentMethod('efectivo')}>Efectivo</button>
          <button type="button" className={`payment-btn ${paymentMethod === 'tarjeta' ? 'active' : ''}`} onClick={() => setPaymentMethod('tarjeta')}>Tarjeta</button>
          <button type="button" className={`payment-btn ${paymentMethod === 'transferencia' ? 'active' : ''}`} onClick={() => setPaymentMethod('transferencia')}>Transferencia</button>
          <button type="button" className={`payment-btn ${paymentMethod === 'multipago' ? 'active' : ''}`} onClick={() => setPaymentMethod('multipago')}>Multipago</button>
        </div>

        <form className="payment-form" onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
          {paymentMethod === 'efectivo' && (
            <div className="payment-form-section">
              <label htmlFor="cash-amount">Monto recibido (Bs.):</label>
              <input
                type="text"
                id="cash-amount"
                value={cashAmount}
                onChange={(e) => setCashAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              />
              <p>Cambio a entregar: <strong>Bs. {cambio}</strong></p>
            </div>
          )}

          {paymentMethod === 'multipago' && (
            <div className="payment-form-section">
              <h4 className="section-title">Detalle del Multipago</h4>
              <div className="input-group">
                <label>Monto en Efectivo:</label>
                <input type="text" name="cash" value={multiPayment.cash} onChange={handleMultiPaymentChange} />
              </div>
              <div className="input-group">
                <label>Monto en Tarjeta:</label>
                <input type="text" name="card" value={multiPayment.card} onChange={handleMultiPaymentChange} />
              </div>
              <div className="input-group">
                <label>Monto en QR:</label>
                <input type="text" name="qr" value={multiPayment.qr} onChange={handleMultiPaymentChange} />
              </div>
              <p>Total Parcial: <strong>Bs. {calculateMultiTotal().toFixed(2)}</strong></p>
              <p>Cambio: <strong>Bs. {multiCambio}</strong></p>
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
            style={{ backgroundColor: 'var(--color-brand-alert)', color: 'white' }}
          >
            <FaTimesCircle /> Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

export default IngresosPaymentModal;