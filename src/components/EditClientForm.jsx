import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';
import './EditClientForm.css'; // Asegúrate de crear este archivo para los estilos

function EditClientForm({ client, onEditComplete, onCancel }) {
  const [formData, setFormData] = useState(client);
  const [status, setStatus] = useState('');

  // Sincroniza el estado del formulario si la prop 'client' cambia
  useEffect(() => {
    setFormData(client);
  }, [client]);

  // Función para borrar el mensaje de estado después de 5 segundos
  const clearStatus = () => {
    setTimeout(() => setStatus(''), 5000);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === 'nombreCompleto') {
      sanitizedValue = value.toUpperCase().replace(/[^A-Z\s]/g, '');
    } else if (name === 'instagram') {
      // Elimina todos los espacios
      sanitizedValue = value.toUpperCase().replace(/\s/g, ''); 
    } else if (['numeroCi', 'telefono', 'descuento'].includes(name)) {
      // Solo permite números
      sanitizedValue = value.replace(/[^0-9]/g, '');
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: sanitizedValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Actualizando cliente...');

    // Recorta los espacios en blanco de los campos de texto
    const trimmedData = {
        ...formData,
        nombreCompleto: formData.nombreCompleto.trim(),
        instagram: formData.instagram.trim(),
        correoElectronico: formData.correoElectronico.trim(),
    };
    
    // Validación del rango de descuento (0-100)
    const descuentoValue = parseInt(trimmedData.descuento, 10);
    if (trimmedData.descuento !== '' && (descuentoValue < 0 || descuentoValue > 100)) {
        setStatus('❌ El descuento debe ser un valor entre 0 y 100.');
        clearStatus();
        return;
    }

    // Validación de formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmedData.correoElectronico && !emailRegex.test(trimmedData.correoElectronico)) {
        setStatus('❌ El formato del correo electrónico es inválido.');
        clearStatus();
        return;
    }

    try {
      const clientRef = doc(db, 'clientes', client.id);
      await updateDoc(clientRef, {
        nombreCompleto: trimmedData.nombreCompleto,
        numeroCi: trimmedData.numeroCi,
        telefono: trimmedData.telefono,
        instagram: trimmedData.instagram,
        correoElectronico: trimmedData.correoElectronico,
        descuento: descuentoValue || 0,
      });
      setStatus('✅ Cliente actualizado con éxito.');
      clearStatus();
      // Llama a la función de finalización para volver a la lista
      onEditComplete();
    } catch (e) {
      console.error('Error al actualizar documento: ', e);
      setStatus('❌ Error al actualizar cliente. Inténtalo de nuevo.');
      clearStatus();
    }
  };

  return (
    <div className="form-container">
      <h2>Editar cliente</h2>
      <form onSubmit={handleSubmit} className="client-form">
        {/* Campo de Código de Cliente (solo lectura) */}
        <div className="form-group">
          <label htmlFor="codigoCliente">Código de Cliente:</label>
          <input 
            id="codigoCliente"
            type="text" 
            name="codigoCliente" 
            value={formData.codigoCliente} 
            disabled 
          />
        </div>
        {/* Campo de Nombre Completo */}
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
        {/* Campo de Número de CI */}
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
        {/* Campo de Teléfono */}
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
        {/* Campo de Instagram */}
        <div className="form-group">
          <label htmlFor="instagram">Instagram:</label>
          <input 
            id="instagram"
            type="text" 
            name="instagram" 
            value={formData.instagram} 
            onChange={handleChange} 
          />
        </div>
        {/* Campo de Correo Electrónico */}
        <div className="form-group">
          <label htmlFor="correoElectronico">Correo electrónico:</label>
          <input 
            id="correoElectronico"
            type="email" 
            name="correoElectronico" 
            value={formData.correoElectronico} 
            onChange={handleChange} 
          />
        </div>
        {/* Campo de Descuento */}
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
        {/* Campo de Total de Compras (solo lectura) */}
        <div className="form-group">
          <label htmlFor="totalCompras">Total Compras:</label>
          <input 
            id="totalCompras"
            type="text" 
            name="totalCompras" 
            value={formData.totalCompras || 0} 
            disabled 
          />
        </div>

        {/* Botones de acción del formulario */}
        <div className="form-actions">
          <button type="submit" className="submit-btn">Actualizar cliente</button>
          <button type="button" className="cancel-btn" onClick={onCancel}>Cancelar</button>
        </div>
      </form>

      {/* Mensaje de estado */}
      {status && (
        <p className={`status-message ${status.includes('✅') ? 'success' : 'error'}`}>
          {status}
        </p>
      )}
    </div>
  );
}

export default EditClientForm;