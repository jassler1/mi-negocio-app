import React, { useState, useEffect, useCallback, useRef } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { registrarEventoAuditoria } from '../utils/auditoria';
import { FaEnvelope, FaLock, FaSignInAlt, FaExclamationCircle, FaEye, FaEyeSlash, FaSpinner } from 'react-icons/fa';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const errorRef = useRef(null);
  const emailInputRef = useRef(null);

  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  const handleEmailChange = useCallback((e) => {
    setEmail(e.target.value);
    if (error) setError('');
  }, [error]);

  const handlePasswordChange = useCallback((e) => {
    setPassword(e.target.value);
    if (error) setError('');
  }, [error]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    if (!email.trim() || !password.trim()) {
      setError('Por favor, ingresa el correo y la contraseña.');
      errorRef.current?.focus();
      return;
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      errorRef.current?.focus();
      return;
    }

    setLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const usersRef = collection(db, 'usuarios');
      const q = query(usersRef, where('correoElectronico', '==', user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        const nombre = userData.nombre || user.email;
        const rol = userData.role || 'Desconocido';

        localStorage.setItem('usuarioNombre', nombre);
        localStorage.setItem('usuarioRol', rol);

        // Registrar evento de auditoría
        await registrarEventoAuditoria({
          usuario: nombre,
          rol,
          tipo: 'Inicio de sesión',
          detalles: `El usuario ${nombre} inició sesión.`,
        });

        onLoginSuccess(rol);
      } else {
        setError('Error: No se encontró el documento de usuario en la base de datos.');
        errorRef.current?.focus();
      }
    } catch (firebaseError) {
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError('Usuario o contraseña incorrectos.');
          break;
        default:
          setError('Error al iniciar sesión. Intenta de nuevo.');
          console.error('Error de Firebase Auth:', firebaseError);
      }
      errorRef.current?.focus();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title"><FaSignInAlt className="title-icon" /> Iniciar Sesión</h2>
        <form onSubmit={handleLogin} noValidate>
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <input
              type="email"
              id="email"
              name="email"
              ref={emailInputRef}
              value={email}
              onChange={handleEmailChange}
              required
              placeholder="ejemplo@mail.com"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-input-container">
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={password}
                onChange={handlePasswordChange}
                required
                placeholder="••••••••"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="toggle-password-btn"
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="login-btn"
            disabled={loading}
          >
            {loading ? <FaSpinner className="spinner" /> : <FaSignInAlt />} Iniciar Sesión
          </button>
        </form>

        {error && <p className="error-message" ref={errorRef}><FaExclamationCircle /> {error}</p>}
      </div>
    </div>
  );
}

export default Login;