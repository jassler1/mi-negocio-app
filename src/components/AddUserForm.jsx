import React, { useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { FaUser, FaEnvelope, FaPhone, FaKey, FaEye, FaEyeSlash, FaUserTag, FaPlusCircle, FaTimes, FaCheckCircle, FaTimesCircle, FaUserPlus } from 'react-icons/fa';
import './AddUserForm.css';

function AddUserForm({ onAddComplete }) {
  const [formData, setFormData] = useState({
    nombreCompleto: '',
    correoElectronico: '',
    numeroCelular: '',
    usuario: '',
    contrasena: '',
    rol: 'cajero',
  });

  const [status, setStatus] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === 'nombreCompleto') {
      sanitizedValue = value.toUpperCase();
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
    setStatus('Guardando usuario...');
    
    if (formData.contrasena.length < 6) {
      setStatus('❌ La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, formData.correoElectronico, formData.contrasena);
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: formData.nombreCompleto
      });

      await setDoc(doc(db, 'usuarios', user.uid), {
        uid: user.uid,
        nombreCompleto: formData.nombreCompleto,
        correoElectronico: formData.correoElectronico,
        numeroCelular: formData.numeroCelular,
        username: formData.usuario,
        role: formData.rol,
      });

      setStatus('✅ Usuario agregado con éxito.');
      setTimeout(() => {
        setFormData({
          nombreCompleto: '',
          correoElectronico: '',
          numeroCelular: '',
          usuario: '',
          contrasena: '',
          rol: 'cajero',
        });
        if (onAddComplete) {
          onAddComplete();
        }
      }, 1500);
    } catch (e) {
      console.error('Error al agregar documento: ', e);
      let errorMessage = '❌ Error al agregar usuario. Inténtalo de nuevo.';
      if (e.code === 'auth/email-already-in-use') {
        errorMessage = '❌ El correo electrónico ya está en uso.';
      } else if (e.code === 'auth/invalid-email') {
        errorMessage = '❌ El formato del correo electrónico es inválido.';
      }
      setStatus(errorMessage);
    }
  };

  return (
    <div className="add-user-container">
      <h2 className="form-title">
        <FaUserPlus className="title-icon" /> Agregar Nuevo Usuario
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="nombreCompleto">Nombre Completo:</label>
            <div className="input-with-icon">
              <FaUser />
              <input type="text" id="nombreCompleto" name="nombreCompleto" value={formData.nombreCompleto} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="correoElectronico">Correo Electrónico:</label>
            <div className="input-with-icon">
              <FaEnvelope />
              <input type="email" id="correoElectronico" name="correoElectronico" value={formData.correoElectronico} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="numeroCelular">Número de Celular:</label>
            <div className="input-with-icon">
              <FaPhone />
              <input type="tel" id="numeroCelular" name="numeroCelular" value={formData.numeroCelular} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="usuario">Usuario:</label>
            <div className="input-with-icon">
              <FaUser />
              <input type="text" id="usuario" name="usuario" value={formData.usuario} onChange={handleChange} required />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="contrasena">Contraseña:</label>
            <div className="password-input-container">
              <FaKey className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                id="contrasena"
                name="contrasena"
                value={formData.contrasena}
                onChange={handleChange}
                required
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="toggle-password-btn">
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="rol">Rol:</label>
            <div className="input-with-icon">
              <FaUserTag />
              <select id="rol" name="rol" value={formData.rol} onChange={handleChange} required>
                <option value="cajero">Cajero</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
        </div>

        {status && (
          <p className={`status-message ${status.includes('éxito') ? 'success' : 'error'}`}>
            {status.includes('éxito') ? <FaCheckCircle /> : <FaTimesCircle />} {status}
          </p>
        )}

        <div className="form-actions">
          <button type="submit" className="submit-btn">
            <FaPlusCircle /> Agregar Usuario
          </button>
          <button type="button" onClick={onAddComplete} className="cancel-btn">
            <FaTimes /> Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddUserForm;