import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, onSnapshot, query, orderBy } from 'firebase/firestore';
import './Egresos.css';

function Egresos() {
  const [concepto, setConcepto] = useState('');
  const [numeroRecibo, setNumeroRecibo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [monto, setMonto] = useState('');
  const [egresosRegistrados, setEgresosRegistrados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Simulación: Obtener el nombre del usuario de la sesión
  const nombreUsuario = "Jassler";

  const egresosCollectionRef = collection(db, 'egresos');

  useEffect(() => {
    const q = query(egresosCollectionRef, orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const egresosList = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      }));
      setEgresosRegistrados(egresosList);
      setIsLoading(false);
    }, (error) => {
      console.error("Error al obtener los egresos:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const categoriasEgresos = [
    'Servicios Básicos',
    'Mantenimiento',
    'Insumos Alimenticios',
    'Material Deportivo',
    'Trofeos',
    'Insumos Deportivos',
    'Sueldos',
    'Alquiler',
    'Publicidad',
    'Otros egresos',
  ];

  const handleAddEgreso = async () => {
    if (!concepto || !monto || !categoria) {
      alert("Por favor, completa todos los campos requeridos.");
      return;
    }

    const nuevoEgreso = {
      concepto,
      numeroRecibo,
      categoria,
      monto: parseFloat(monto),
      fecha: new Date().toISOString().slice(0, 10),
      usuario: nombreUsuario, // <-- ¡Aquí se agrega el nombre de usuario!
    };

    try {
      await addDoc(egresosCollectionRef, nuevoEgreso);
      console.log("Egreso registrado en Firebase:", nuevoEgreso);
      
      setConcepto('');
      setNumeroRecibo('');
      setCategoria('');
      setMonto('');

    } catch (e) {
      console.error("Error al añadir el documento: ", e);
      alert("Ocurrió un error al registrar el egreso. Inténtalo de nuevo.");
    }
  };

  const totalEgresos = egresosRegistrados.reduce((acc, egreso) => acc + egreso.monto, 0);
  const isFormValid = concepto && monto && categoria;

  return (
    <div className="egresos-container">
      <h1 className="main-title">Gestión de Egresos</h1>
      
      <div className="form-section">
        <h2 className="section-title">Registrar Egreso</h2>
        <div className="form-fields">
          <div className="input-group">
            <label htmlFor="concepto">Glosa o Concepto:</label>
            <input
              id="concepto"
              type="text"
              value={concepto}
              onChange={(e) => setConcepto(e.target.value)}
              placeholder="Ej: Pago de luz de la cancha"
            />
          </div>
          <div className="input-group">
            <label htmlFor="numeroRecibo">Número de Recibo o Factura:</label>
            <input
              id="numeroRecibo"
              type="text"
              value={numeroRecibo}
              onChange={(e) => setNumeroRecibo(e.target.value)}
              placeholder="Ej: 12345"
            />
          </div>
          <div className="input-group">
            <label htmlFor="categoria">Categoría:</label>
            <select
              id="categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
            >
              <option value="">Selecciona una categoría</option>
              {categoriasEgresos.map((cat, index) => (
                <option key={index} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label htmlFor="monto">Monto (Bs.):</label>
            <input
              id="monto"
              type="number"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              placeholder="Ej: 80"
              min="0"
              step="0.01"
            />
          </div>
        </div>
        <button 
          onClick={handleAddEgreso} 
          className="add-egreso-btn"
          disabled={!isFormValid}
        >
          Añadir Egreso
        </button>
      </div>

      <hr className="divider" />

      <div className="summary-section">
        <h2 className="section-title">Resumen de Egresos</h2>
        {isLoading ? (
          <p>Cargando egresos...</p>
        ) : (
          <>
            <p className="total-egresos">
              <strong>Total de Egresos Registrados:</strong> {totalEgresos.toFixed(2)} Bs.
            </p>
            <ul className="egresos-list">
              {egresosRegistrados.length > 0 ? (
                egresosRegistrados.map((egreso) => (
                  <li key={egreso.id} className="egreso-item">
                    <span className="egreso-date">{egreso.fecha}</span>
                    <strong className="egreso-concepto">{egreso.concepto}</strong>: {egreso.monto.toFixed(2)} Bs.
                    <span className="egreso-details">
                      (Categoría: {egreso.categoria}{egreso.numeroRecibo && `, Recibo: ${egreso.numeroRecibo}`})
                    </span>
                  </li>
                ))
              ) : (
                <p>No hay egresos registrados.</p>
              )}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

export default Egresos;