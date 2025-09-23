import React, { useState, useEffect } from 'react';
import IngresosPaymentModal from '../assets/components/IngresosPaymentModal';
import { db } from '../firebaseConfig'; // Asegúrate de que esta ruta sea correcta
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import './Ingresos.css'; // Agregué el import del CSS para un mejor estilo
import { FaMoneyBillWave, FaCoins, FaCheckCircle, FaExclamationCircle } from 'react-icons/fa';

function Ingresos() {
  const [ingresosRegistrados, setIngresosRegistrados] = useState([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [alquilerMonto, setAlquilerMonto] = useState('');
  const [loading, setLoading] = useState(true);

  // Simulación: Obtener el nombre del usuario de la sesión
  const nombreUsuario = "Jassler"; 

  // Referencia a la colección 'ingresos' en Firestore
  const ingresosCollectionRef = collection(db, 'ingresos');

  // Cargar los ingresos en tiempo real al iniciar el componente
  useEffect(() => {
    const q = query(ingresosCollectionRef, orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const ingresosList = snapshot.docs.map((doc) => ({
        ...doc.data(),
        id: doc.id
      }));
      setIngresosRegistrados(ingresosList);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener los ingresos:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Lista de las 4 canchas
  const [canchas] = useState([
    { id: 1, nombre: 'Cancha 1' },
    { id: 2, nombre: 'Cancha 2' },
    { id: 3, nombre: 'Cancha 3' },
    { id: 4, nombre: 'Cancha 4' },
  ]);

  // Lista de las categorías
  const [categoriasAlquiler] = useState([
    { id: 'cat1', nombre: 'Alquiler de Canchas' },
    { id: 'cat2', nombre: 'Venta de Material Deportivo' },
    { id: 'cat3', nombre: 'Alquiler de Deportivo' },
    { id: 'cat4', nombre: 'Pago por Clases Mensuales' },
    { id: 'cat5', nombre: 'Pago por Clases Semanales' },
    { id: 'cat6', nombre: 'Pago por Clases Diaria' },
    { id: 'cat7', nombre: 'Alquiler de Canchas para Profesor' },
    { id: 'cat8', nombre: 'Otros Ingresos' },
  ]);

  const [selectedCancha, setSelectedCancha] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [isMontoValid, setIsMontoValid] = useState(true);

  const handleMontoChange = (e) => {
    const value = e.target.value;
    setAlquilerMonto(value);
    setIsMontoValid(value && parseFloat(value) > 0);
  };

  const handleOpenPaymentModal = () => {
    if (!selectedCancha || !selectedCategoria || !alquilerMonto || parseFloat(alquilerMonto) <= 0) {
      alert("Por favor, completa todos los campos correctamente.");
      return;
    }
    setIsPaymentModalOpen(true);
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false);
  };

  const handleProcessPayment = async (paymentData) => {
    const nuevoIngreso = {
      concepto: selectedCategoria.nombre.includes('Cancha') 
                  ? `${selectedCategoria.nombre} - ${selectedCancha.nombre}`
                  : selectedCategoria.nombre,
      monto: parseFloat(alquilerMonto),
      categoria: selectedCategoria.nombre,
      fecha: new Date().toISOString().slice(0, 10),
      metodoPago: paymentData.paymentMethod,
      usuario: nombreUsuario,
    };
    
    try {
      await addDoc(ingresosCollectionRef, nuevoIngreso);
      console.log("Pago de ingreso procesado:", nuevoIngreso);
      
      setSelectedCancha(null);
      setSelectedCategoria(null);
      setAlquilerMonto('');
      setIsMontoValid(false);
      handleClosePaymentModal();
    } catch (e) {
      console.error("Error al añadir el documento: ", e);
      alert("Ocurrió un error al procesar el pago. Por favor, intenta de nuevo.");
    }
  };

  const totalIngresos = ingresosRegistrados.reduce((acc, ingreso) => acc + ingreso.monto, 0);

  return (
    <div className="ingresos-container">
      <h1 className="main-title">
        <FaMoneyBillWave className="title-icon" /> Gestión de Ingresos
      </h1>

      <div className="form-section">
        <h2 className="section-title">Registrar Ingreso</h2>
        <div className="form-fields">
          <div className="input-group">
            <label>Seleccionar Categoría:</label>
            <div className="button-group">
              {categoriasAlquiler.map(categoria => (
                <button
                  key={categoria.id}
                  onClick={() => setSelectedCategoria(categoria)}
                  className={`button-categoria ${selectedCategoria?.id === categoria.id ? 'active' : ''}`}
                >
                  {categoria.nombre}
                </button>
              ))}
            </div>
          </div>
            <div className="input-group">
              <label>Seleccionar Cancha:</label>
              <div className="button-group">
                {canchas.map(cancha => (
                  <button
                    key={cancha.id}
                    onClick={() => setSelectedCancha(cancha)}
                    className={`button-cancha ${selectedCancha?.id === cancha.id ? 'active' : ''}`}
                  >
                    {cancha.nombre}
                  </button>
                ))}
              </div>
            </div>
          
          <div className="input-group">
            <label>Monto (Bs.):</label>
            <input
              type="number"
              value={alquilerMonto}
              onChange={handleMontoChange}
              placeholder="Ej: 150.00"
              className={`monto-input ${!isMontoValid && alquilerMonto !== '' ? 'invalid' : ''}`}
            />
            {!isMontoValid && alquilerMonto !== '' && (
              <p className="error-message">Monto no válido.</p>
            )}
          </div>
        </div>

        <button 
          onClick={handleOpenPaymentModal}
          className="pay-btn"
          disabled={!selectedCategoria || !alquilerMonto || parseFloat(alquilerMonto) <= 0 || (selectedCategoria.nombre.includes('Cancha') && !selectedCancha)}
        >
          <FaCoins className="btn-icon" /> Registrar Pago
        </button>
      </div>
      
      <hr className="divider" />

      <div className="summary-section">
        <h2 className="section-title">Resumen de Ingresos</h2>
        {loading ? (
          <p>Cargando ingresos...</p>
        ) : (
          <>
            <div className="total-ingresos">
              <FaCheckCircle className="total-icon" />
              <strong>Total de Ingresos Registrados:</strong> {totalIngresos.toFixed(2)} Bs.
            </div>
            
            <ul className="ingresos-list">
              {ingresosRegistrados.length > 0 ? (
                ingresosRegistrados.map((ingreso) => (
                  <li key={ingreso.id} className="ingreso-item">
                    <span className="ingreso-date">{ingreso.fecha}</span>
                    <strong className="ingreso-concepto">{ingreso.concepto}</strong>: {ingreso.monto.toFixed(2)} Bs.
                    <span className="ingreso-details">
                      (Categoría: {ingreso.categoria}{ingreso.usuario && `, Usuario: ${ingreso.usuario}`})
                    </span>
                  </li>
                ))
              ) : (
                <div className="no-data-msg">
                  <FaExclamationCircle /> No hay ingresos registrados.
                </div>
              )}
            </ul>
          </>
        )}
      </div>

      {isPaymentModalOpen && (
        <IngresosPaymentModal
          totalAmount={parseFloat(alquilerMonto)}
          onProcessPayment={handleProcessPayment}
          onClose={handleClosePaymentModal}
        />
      )}
    </div>
  );
}

export default Ingresos;