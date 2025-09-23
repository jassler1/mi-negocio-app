import React, { useState } from 'react';
import { db, auth } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { FaEnvelope, FaLock, FaEye, FaEyeSlash, FaSignInAlt, FaExclamationCircle, FaSpinner } from 'react-icons/fa';
import './Login.css';

function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password) {
      setError("Por favor, ingresa el correo y la contraseña.");
      setLoading(false);
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const usersRef = collection(db, "usuarios");
      const q = query(usersRef, where("correoElectronico", "==", user.email));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const userData = querySnapshot.docs[0].data();
        onLoginSuccess(userData.role);
      } else {
        setError("Error: No se encontró el documento de usuario en la base de datos.");
      }
    } catch (firebaseError) {
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
          setError("Usuario o contraseña incorrectos.");
          break;
        case 'auth/invalid-email':
          setError("Formato de correo electrónico inválido.");
          break;
        default:
          setError("Error al iniciar sesión. Intenta de nuevo.");
          console.error("Error de Firebase Auth:", firebaseError);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <h2 className="login-title">
          <FaSignInAlt className="title-icon" /> Iniciar Sesión
        </h2>
        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label htmlFor="email">Correo Electrónico</label>
            <div className="input-with-icon">
              <FaEnvelope />
              <input
                type="email"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="password">Contraseña</label>
            <div className="password-input-container">
              <FaLock className="input-icon" />
              <input
                type={showPassword ? "text" : "password"}
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="toggle-password-btn"
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <FaEyeSlash /> : <FaEye />}
              </button>
            </div>
          </div>
          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? <FaSpinner className="spinner" /> : <FaSignInAlt />}
            {loading ? 'Cargando...' : 'Iniciar Sesión'}
          </button>
        </form>
        {error && (
          <p className="error-message">
            <FaExclamationCircle /> {error}
          </p>
        )}
      </div>
    </div>
  );
}

export default Login;
