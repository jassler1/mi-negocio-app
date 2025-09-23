import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

function EditUserForm({ user, onEditComplete }) {
  const [formData, setFormData] = useState(user);
  const [status, setStatus] = useState('');

  useEffect(() => {
    setFormData(user);
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === 'nombreCompleto') {
      sanitizedValue = value.toUpperCase().replace(/[^A-Z\s]/g, '');
    } else if (name === 'numeroCelular') {
      sanitizedValue = value.replace(/[^0-9]/g, '');
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: sanitizedValue,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Actualizando usuario...');
    try {
      const userRef = doc(db, 'usuarios', user.id);
      await updateDoc(userRef, {
        nombreCompleto: formData.nombreCompleto,
        correoElectronico: formData.correoElectronico,
        numeroCelular: formData.numeroCelular,
        username: formData.username,
        password: formData.password,
        role: formData.role,
      });
      setStatus('✅ Usuario actualizado con éxito.');
      onEditComplete();
    } catch (e) {
      console.error('Error al actualizar documento: ', e);
      setStatus('❌ Error al actualizar usuario. Inténtalo de nuevo.');
    }
  };

  return (
    <div>
      <h2>Editar usuario</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nombre completo:</label>
          <input
            type="text"
            name="nombreCompleto"
            value={formData.nombreCompleto}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Correo electrónico:</label>
          <input type="email" name="correoElectronico" value={formData.correoElectronico} onChange={handleChange} required />
        </div>
        <div>
          <label>Número de celular:</label>
          <input
            type="tel"
            name="numeroCelular"
            value={formData.numeroCelular}
            onChange={handleChange}
            required
          />
        </div>
        <div>
          <label>Usuario:</label>
          <input type="text" name="username" value={formData.username} onChange={handleChange} required />
        </div>
        <div>
          <label>Contraseña:</label>
          <input type="password" name="password" value={formData.password} onChange={handleChange} required />
        </div>
        <div>
          <label>Rol:</label>
          <select name="role" value={formData.role} onChange={handleChange} required>
            <option value="cajero">Cajero</option>
            <option value="admin">Administrador</option>
          </select>
        </div>
        <button type="submit">Actualizar usuario</button>
        <button type="button" onClick={onEditComplete}>Cancelar</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}

export default EditUserForm;