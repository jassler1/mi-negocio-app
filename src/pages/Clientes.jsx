import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, runTransaction } from 'firebase/firestore';
import './Clientes.css'; // ¡Importa el nuevo archivo CSS!

function Clientes({ onClientAdded, onCancel }) {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    numeroCi: '',
    telefono: '',
    instagram: '',
    correoElectronico: '',
    descuento: '',
  });
  const [status, setStatus] = useState('');

  const clearStatus = () => {
    setTimeout(() => setStatus(''), 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === 'nombreCompleto') {
      sanitizedValue = value.toUpperCase().replace(/[^A-Z\s]/g, '');
    } else if (name === 'instagram') {
      sanitizedValue = value.toUpperCase().replace(/\s/g, '');
    } else if (['numeroCi', 'telefono', 'descuento'].includes(name)) {
      sanitizedValue = value.replace(/[^0-9]/g, '');
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: sanitizedValue,
    }));
  };

  const getNextClientId = async () => {
    try {
      const counterRef = doc(db, 'contadores', 'clientesCounter');

      const newClientId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);

        if (!counterDoc.exists()) {
          throw new Error('El documento de contador no existe!');
        }

        const newId = counterDoc.data().lastClientId + 1;
        transaction.update(counterRef, { lastClientId: newId });
        return newId;
      });

      return String(newClientId).padStart(4, '0');
    } catch (e) {
      console.error('Transacción fallida:', e);
      setStatus('❌ Error al obtener el código de cliente. Inténtalo de nuevo.');
      clearStatus();
      return null;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Guardando cliente...');

    const trimmedData = {
      ...formData,
      nombreCompleto: formData.nombreCompleto.trim(),
      instagram: formData.instagram.trim(),
      correoElectronico: formData.correoElectronico.trim(),
    };
    
    const descuentoValue = parseInt(trimmedData.descuento, 10);
    if (trimmedData.descuento !== '' && (descuentoValue < 0 || descuentoValue > 100)) {
      setStatus('❌ El descuento debe ser un valor entre 0 y 100.');
      clearStatus();
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmedData.correoElectronico && !emailRegex.test(trimmedData.correoElectronico)) {
      setStatus('❌ El formato del correo electrónico es inválido.');
      clearStatus();
      return;
    }

    const newCode = await getNextClientId();
    if (!newCode) {
      return;
    }

    try {
      const clientData = {
        ...trimmedData,
        codigoCliente: newCode,
        descuento: descuentoValue || 0,
        totalCompras: 0, // Añade este campo si no lo tienes
      };

      await addDoc(collection(db, 'clientes'), clientData);
      setStatus('✅ Cliente agregado con éxito.');
      clearStatus();

      setFormData({
        nombreCompleto: '',
        numeroCi: '',
        telefono: '',
        instagram: '',
        correoElectronico: '',
        descuento: '',
      });

      if (onClientAdded) {
        onClientAdded();
      }
    } catch (e) {
      console.error('Error al agregar cliente:', e);
      setStatus('❌ Error al agregar cliente. Inténtalo de nuevo.');
      clearStatus();
    }
  };

  return (
    <div className="form-container">
      <h2>Registrar nuevo cliente</h2>
      <form onSubmit={handleSubmit} className="client-form">
        <div className="form-group">
          <label htmlFor="nombreCompleto">Nombre completo:</label>
          <input
            id="nombreCompleto"
            type="text"
            name="nombreCompleto"
            value={formData.nombreCompleto}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="numeroCi">Número de CI:</label>
          <input
            id="numeroCi"
            type="text"
            name="numeroCi"
            value={formData.numeroCi}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="telefono">Teléfono:</label>
          <input
            id="telefono"
            type="tel"
            name="telefono"
            value={formData.telefono}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="instagram">Instagram:</label>
          <input
            id="instagram"
            type="text"
            name="instagram"
            value={formData.instagram}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="correoElectronico">Correo electrónico:</label>
          <input
            id="correoElectronico"
            type="email"
            name="correoElectronico"
            value={formData.correoElectronico}
            onChange={handleChange}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="descuento">Descuento (%):</label>
          <input
            id="descuento"
            type="number"
            name="descuento"
            value={formData.descuento}
            onChange={handleChange}
            min="0"
            max="100"
          />
        </div>
        <div className="form-actions">
          <button type="submit" className="submit-btn">Agregar cliente</button>
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancelar</button>
        </div>
      </form>
      {status && (
        <p className={`status-message ${status.includes('✅') ? 'success' : 'error'}`}>
          {status}
        </p>
      )}
    </div>
  );
}

export default Clientes;