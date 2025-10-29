import React, { useState, useEffect, useRef } from 'react';
import { db, auth } from '../firebaseConfig';
import { doc, setDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import {
  FaUser,
  FaEnvelope,
  FaPhone,
  FaKey,
  FaEye,
  FaEyeSlash,
  FaUserTag,
  FaPlusCircle,
  FaTimes,
  FaCheckCircle,
  FaTimesCircle,
  FaUserPlus,
} from 'react-icons/fa';
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

  const [status, setStatus] = useState({ message: '', type: '' }); // { message, type: 'error' | 'success' | 'info' }
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const capitalizeWords = (str) =>
    str.replace(/\b\w/g, (char) => char.toUpperCase());

  const handleChange = (e) => {
    const { name, value } = e.target;
    let sanitizedValue = value;

    if (name === 'nombreCompleto') {
      sanitizedValue = capitalizeWords(value);
    } else if (name === 'numeroCelular') {
      sanitizedValue = value.replace(/[^0-9]/g, '');
    }

    setFormData((prev) => ({ ...prev, [name]: sanitizedValue }));
  };

  const validateForm = () => {
    if (formData.contrasena.length < 6) {
      setStatus({ message: '❌ La contraseña debe tener al menos 6 caracteres.', type: 'error' });
      return false;
    }
    if (!formData.correoElectronico.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setStatus({ message: '❌ El formato del correo electrónico es inválido.', type: 'error' });
      return false;
    }
    // Puedes agregar más validaciones aquí si quieres
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return; // prevenir múltiples clicks

    if (!validateForm()) return;

    setStatus({ message: 'Guardando usuario...', type: 'info' });
    setLoading(true);

    try {
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        formData.correoElectronico,
        formData.contrasena
      );
      const user = userCredential.user;

      await updateProfile(user, {
        displayName: formData.nombreCompleto,
      });

      await setDoc(doc(db, 'usuarios', user.uid), {
        uid: user.uid,
        nombreCompleto: formData.nombreCompleto,
        correoElectronico: formData.correoElectronico,
        numeroCelular: formData.numeroCelular,
        username: formData.usuario,
        role: formData.rol,
      });

      setStatus({ message: '✅ Usuario agregado con éxito.', type: 'success' });

      timeoutRef.current = setTimeout(() => {
        setFormData({
          nombreCompleto: '',
          correoElectronico: '',
          numeroCelular: '',
          usuario: '',
          contrasena: '',
          rol: 'cajero',
        });
        setStatus({ message: '', type: '' });
        if (onAddComplete) onAddComplete();
        setLoading(false);
      }, 1500);
    } catch (error) {
      console.error('Error al agregar usuario: ', error);

      let errorMessage = '❌ Error al agregar usuario. Inténtalo de nuevo.';
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = '❌ El correo electrónico ya está en uso.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = '❌ El formato del correo electrónico es inválido.';
      } else if (error.code === 'auth/weak-password') {
        errorMessage = '❌ La contraseña es demasiado débil.';
      }

      setStatus({ message: errorMessage, type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="add-user-container" role="form" aria-labelledby="form-title">
      <h2 className="form-title" id="form-title">
        <FaUserPlus className="title-icon" aria-hidden="true" /> Agregar Nuevo Usuario
      </h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="nombreCompleto">Nombre Completo:</label>
            <div className="input-with-icon">
              <FaUser aria-hidden="true" />
              <input
                type="text"
                id="nombreCompleto"
                name="nombreCompleto"
                value={formData.nombreCompleto}
                onChange={handleChange}
                required
                aria-required="true"
                autoComplete="name"
                placeholder="Ej. Juan Pérez"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="correoElectronico">Correo Electrónico:</label>
            <div className="input-with-icon">
              <FaEnvelope aria-hidden="true" />
              <input
                type="email"
                id="correoElectronico"
                name="correoElectronico"
                value={formData.correoElectronico}
                onChange={handleChange}
                required
                aria-required="true"
                autoComplete="email"
                placeholder="ejemplo@correo.com"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="numeroCelular">Número de Celular:</label>
            <div className="input-with-icon">
              <FaPhone aria-hidden="true" />
              <input
                type="tel"
                id="numeroCelular"
                name="numeroCelular"
                value={formData.numeroCelular}
                onChange={handleChange}
                required
                aria-required="true"
                placeholder="Ej. 1234567890"
                pattern="[0-9]{7,15}"
                title="Ingrese un número válido (7 a 15 dígitos)"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="usuario">Usuario:</label>
            <div className="input-with-icon">
              <FaUser aria-hidden="true" />
              <input
                type="text"
                id="usuario"
                name="usuario"
                value={formData.usuario}
                onChange={handleChange}
                required
                aria-required="true"
                placeholder="Nombre de usuario"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="contrasena">Contraseña:</label>
            <div className="password-input-container">
              <FaKey className="input-icon" aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="contrasena"
                name="contrasena"
                value={formData.contrasena}
                onChange={handleChange}
                required
                aria-required="true"
                placeholder="Mínimo 6 caracteres"
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password-btn"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
            {formData.contrasena && formData.contrasena.length < 6 && (
              <small className="password-warning" role="alert" aria-live="polite">
                La contraseña debe tener al menos 6 caracteres.
              </small>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="rol">Rol:</label>
            <div className="input-with-icon">
              <FaUserTag aria-hidden="true" />
              <select
                id="rol"
                name="rol"
                value={formData.rol}
                onChange={handleChange}
                required
                aria-required="true"
              >
                <option value="cajero">Cajero</option>
                <option value="admin">Administrador</option>
              </select>
            </div>
          </div>
        </div>

        {status.message && (
          <p
            className={`status-message ${status.type}`}
            role="alert"
            aria-live="assertive"
          >
            {status.type === 'success' ? <FaCheckCircle /> : <FaTimesCircle />} {status.message}
          </p>
        )}

        <div className="form-actions">
          <button
            type="submit"
            className="submit-btn"
            disabled={loading}
            aria-disabled={loading}
          >
            <FaPlusCircle /> {loading ? 'Guardando...' : 'Agregar Usuario'}
          </button>
          <button
            type="button"
            onClick={onAddComplete}
            className="cancel-btn"
            disabled={loading}
            aria-disabled={loading}
          >
            <FaTimes /> Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default AddUserForm;