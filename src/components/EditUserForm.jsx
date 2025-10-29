import React, { useState, useEffect, useRef } from 'react';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

function EditUserForm({ user, onEditComplete }) {
  const [formData, setFormData] = useState(user);
  const [status, setStatus] = useState({ message: '', type: '' }); // type: 'success' | 'error' | ''
  const [loading, setLoading] = useState(false);
  const firstInputRef = useRef(null);

  useEffect(() => {
    setFormData(user);
    setStatus({ message: '', type: '' });
    setLoading(false);
    if (firstInputRef.current) {
      firstInputRef.current.focus();
    }
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

  const validateForm = () => {
    if (!formData.nombreCompleto.trim()) {
      setStatus({ message: 'El nombre completo es obligatorio.', type: 'error' });
      return false;
    }
    if (!formData.correoElectronico.trim()) {
      setStatus({ message: 'El correo electrónico es obligatorio.', type: 'error' });
      return false;
    }
    if (!formData.numeroCelular.trim()) {
      setStatus({ message: 'El número de celular es obligatorio.', type: 'error' });
      return false;
    }
    if (!formData.username.trim()) {
      setStatus({ message: 'El usuario es obligatorio.', type: 'error' });
      return false;
    }
    if (!formData.password.trim()) {
      setStatus({ message: 'La contraseña es obligatoria.', type: 'error' });
      return false;
    }
    if (!formData.role) {
      setStatus({ message: 'El rol es obligatorio.', type: 'error' });
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);
    setStatus({ message: 'Actualizando usuario...', type: '' });

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
      setStatus({ message: '✅ Usuario actualizado con éxito.', type: 'success' });
      setLoading(false);
      // Espera un poco antes de cerrar para que usuario vea el mensaje
      setTimeout(() => onEditComplete(), 1500);
    } catch (e) {
      console.error('Error al actualizar documento: ', e);
      setStatus({ message: '❌ Error al actualizar usuario. Inténtalo de nuevo.', type: 'error' });
      setLoading(false);
    }
  };

  return (
    <div className="add-user-container" role="region" aria-live="polite">
      <h2 className="form-title" tabIndex={-1}>Editar usuario</h2>
      <form onSubmit={handleSubmit} noValidate>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="nombreCompleto">Nombre completo:</label>
            <input
              ref={firstInputRef}
              id="nombreCompleto"
              type="text"
              name="nombreCompleto"
              value={formData.nombreCompleto}
              onChange={handleChange}
              required
              aria-required="true"
              aria-describedby="nombreCompleto-desc"
              placeholder="Ej. JUAN PEREZ"
            />
            <small id="nombreCompleto-desc" className="sr-only">Solo letras mayúsculas y espacios.</small>
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
              aria-required="true"
              placeholder="ejemplo@mail.com"
            />
          </div>
          <div className="form-group">
            <label htmlFor="numeroCelular">Número de celular:</label>
            <input
              id="numeroCelular"
              type="tel"
              name="numeroCelular"
              value={formData.numeroCelular}
              onChange={handleChange}
              required
              aria-required="true"
              placeholder="Solo números"
            />
          </div>
          <div className="form-group">
            <label htmlFor="username">Usuario:</label>
            <input
              id="username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              aria-required="true"
              placeholder="Nombre de usuario"
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña:</label>
            <input
              id="password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              aria-required="true"
              autoComplete="new-password"
            />
          </div>
          <div className="form-group">
            <label htmlFor="role">Rol:</label>
            <select
              id="role"
              name="role"
              value={formData.role}
              onChange={handleChange}
              required
              aria-required="true"
            >
              <option value="">Selecciona un rol</option>
              <option value="cajero">Cajero</option>
              <option value="admin">Administrador</option>
            </select>
          </div>
        </div>

        <div className="form-actions">
          <button className="submit-btn" type="submit" disabled={loading}>
            {loading ? 'Actualizando...' : 'Actualizar usuario'}
          </button>
          <button className="cancel-btn" type="button" onClick={onEditComplete} disabled={loading}>
            Cancelar
          </button>
        </div>

        {status.message && (
          <p
            className={`status-message ${status.type === 'success' ? 'success' : status.type === 'error' ? 'error' : ''}`}
            role="alert"
          >
            {status.message}
          </p>
        )}
      </form>
    </div>
  );
}

export default EditUserForm;