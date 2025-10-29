import React, { useState, useRef, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, runTransaction } from 'firebase/firestore';
import './Clientes.css';

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const nombreInputRef = useRef(null);

  useEffect(() => {
    // Autofocus en el primer input
    if (nombreInputRef.current) {
      nombreInputRef.current.focus();
    }
  }, []);

  const clearStatus = () => {
    setTimeout(() => setStatus(''), 5000);
  };

  const handleInputChange = ({ target: { name, value } }) => {
    let sanitized = value;

    switch (name) {
      case 'nombreCompleto':
        sanitized = value.toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ\s]/gi, '');
        break;
      case 'instagram':
        sanitized = value.toUpperCase().replace(/\s/g, '');
        break;
      case 'numeroCi':
      case 'telefono':
      case 'descuento':
        sanitized = value.replace(/\D/g, '');
        break;
      default:
        break;
    }

    setFormData((prev) => ({ ...prev, [name]: sanitized }));
  };

  const getNextClientCode = async () => {
    const counterRef = doc(db, 'contadores', 'clientesCounter');

    try {
      const newCode = await runTransaction(db, async (transaction) => {
        const docSnap = await transaction.get(counterRef);
        if (!docSnap.exists()) throw new Error('Contador no encontrado');

        const newId = docSnap.data().lastClientId + 1;
        transaction.update(counterRef, { lastClientId: newId });

        return String(newId).padStart(4, '0');
      });

      return newCode;
    } catch (err) {
      console.error('Error al generar código de cliente:', err);
      setStatus('❌ Error generando el código de cliente.');
      clearStatus();
      return null;
    }
  };

  const validateForm = () => {
    const { nombreCompleto, numeroCi, telefono, correoElectronico, descuento } = formData;

    if (!nombreCompleto || !numeroCi || !telefono) {
      setStatus('❌ Los campos nombre completo, CI y teléfono son obligatorios.');
      clearStatus();
      return false;
    }

    // Validar solo si el correo electrónico es proporcionado
    if (correoElectronico) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(correoElectronico)) {
        setStatus('❌ Formato de correo inválido.');
        clearStatus();
        return false;
      }
    }

    const desc = parseInt(descuento, 10);
    if (descuento && (isNaN(desc) || desc < 0 || desc > 100)) {
      setStatus('❌ El descuento debe ser un número entre 0 y 100.');
      clearStatus();
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isSubmitting) return; // Previene doble clic

    if (!validateForm()) return;

    setIsSubmitting(true);
    setStatus('⏳ Guardando cliente...');

    const newCode = await getNextClientCode();
    if (!newCode) {
      setIsSubmitting(false);
      return;
    }

    const cliente = {
      ...formData,
      codigoCliente: newCode,
      nombreCompleto: formData.nombreCompleto.trim(),
      instagram: formData.instagram.trim(),
      correoElectronico: formData.correoElectronico.trim(),
      descuento: parseInt(formData.descuento, 10) || 0,
      totalCompras: 0,
    };

    try {
      await addDoc(collection(db, 'clientes'), cliente);
      setStatus('✅ Cliente registrado con éxito.');
      setFormData({
        nombreCompleto: '',
        numeroCi: '',
        telefono: '',
        instagram: '',
        correoElectronico: '',
        descuento: '',
      });
      onClientAdded?.();
    } catch (error) {
      console.error('Error al registrar cliente:', error);
      setStatus('❌ No se pudo guardar el cliente.');
    } finally {
      setIsSubmitting(false);
      clearStatus();
    }
  };

  return (
    <div className="form-container">
      <h2>Registrar nuevo cliente</h2>
      <form onSubmit={handleSubmit} className="client-form" noValidate>
        {[
          { label: 'Nombre completo', name: 'nombreCompleto', type: 'text', ref: nombreInputRef },
          { label: 'Número de CI', name: 'numeroCi', type: 'text' },
          { label: 'Teléfono', name: 'telefono', type: 'tel' },
          { label: 'Instagram', name: 'instagram', type: 'text' },
          { label: 'Correo electrónico', name: 'correoElectronico', type: 'email' },
          { label: 'Descuento (%)', name: 'descuento', type: 'number', min: 0, max: 100 },
        ].map(({ label, name, type, ...rest }) => (
          <div className="form-group" key={name}>
            <label htmlFor={name}>{label}:</label>
            <input
              id={name}
              type={type}
              name={name}
              value={formData[name]}
              onChange={handleInputChange}
              required={name !== 'descuento' && name !== 'instagram' && name !== 'correoElectronico'} // Los campos 'instagram' y 'correoElectronico' no son obligatorios
              disabled={isSubmitting}
              {...rest}
            />
          </div>
        ))}

        <div className="form-actions">
          <button type="submit" className="submit-btn" disabled={isSubmitting}>
            {isSubmitting ? 'Guardando...' : 'Agregar cliente'}
          </button>
          <button type="button" className="cancel-btn" onClick={onCancel} disabled={isSubmitting}>
            Cancelar
          </button>
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