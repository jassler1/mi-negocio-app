import React, { useState, useEffect } from 'react';
import IngresosPaymentModal from '../assets/components/IngresosPaymentModal';
import ClientSelectionModal from '../assets/components/ClientSelectionModal'; 
import { db } from '../firebaseConfig';
// IMPORTANTE: Asegúrate que serverTimestamp esté importado desde 'firebase/firestore'
import { collection, addDoc, onSnapshot, query, orderBy, serverTimestamp } from 'firebase/firestore'; 
import { registrarEventoAuditoria } from '../utils/auditoria'; 
import './Ingresos.css';
import { FaMoneyBillWave, FaCoins, FaCheckCircle, FaExclamationCircle, FaUserPlus } from 'react-icons/fa';
import { format } from 'date-fns'; // Necesario para formatear el Timestamp en la lista

// =======================================================================
// === FUNCIÓN PARA MOSTRAR FECHA Y HORA EXACTA
// =======================================================================
const formatTimestampCompleto = (dateValue) => {
  if (!dateValue) return 'N/A';
  
  const dateObj = dateValue.toDate 
    ? dateValue.toDate() 
    : new Date(dateValue); 

  if (isNaN(dateObj.getTime())) return 'N/A';
  
  return format(dateObj, 'dd/MM/yy HH:mm:ss');
};
// =======================================================================


function Ingresos() {
  const [ingresosRegistrados, setIngresosRegistrados] = useState([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [alquilerMonto, setAlquilerMonto] = useState('');
  const [loading, setLoading] = useState(true);

  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedCancha, setSelectedCancha] = useState(null);
  const [selectedCategoria, setSelectedCategoria] = useState(null);
  const [isMontoValid, setIsMontoValid] = useState(true);

  const ingresosCollectionRef = collection(db, 'ingresos');

  const nombreUsuario = localStorage.getItem('usuarioNombre') || 'Desconocido';
  const rolUsuario = localStorage.getItem('usuarioRol') || 'Sin rol';

  // Cargar ingresos desde Firestore, ordenando por el campo con hora
  useEffect(() => {
    // Usamos 'fechaHora' para ordenar los ingresos más recientes con hora exacta
    const q = query(ingresosCollectionRef, orderBy('fechaHora', 'desc')); 
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const ingresosList = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
        }));
        setIngresosRegistrados(ingresosList);
        setLoading(false);
      },
      (error) => {
        console.error('Error al obtener los ingresos:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  // Categorías y canchas
  const [canchas] = useState([
    { id: 1, nombre: 'Cancha 1' },
    { id: 2, nombre: 'Cancha 2' },
    { id: 3, nombre: 'Cancha 3' },
    { id: 4, nombre: 'Cancha 4' },
  ]);

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

  const handleMontoChange = (e) => {
    const value = e.target.value;
    setAlquilerMonto(value);
    setIsMontoValid(value && parseFloat(value) > 0);
  };

  const handleCategoriaChange = (e) => {
    const categoriaNombre = e.target.value;
    const categoriaObj = categoriasAlquiler.find((cat) => cat.nombre === categoriaNombre);
    setSelectedCategoria(categoriaObj || null);

    if (categoriaObj && !categoriaObj.nombre.includes('Cancha')) {
      setSelectedCancha(null);
    }
  };

  const handleOpenClientModal = () => setIsClientModalOpen(true);
  const handleCloseClientModal = () => setIsClientModalOpen(false);
  const handleSelectClient = (client) => {
    setSelectedClient(client);
    handleCloseClientModal();
  };

  const handleOpenPaymentModal = () => {
    const isCanchaRelated = selectedCategoria?.nombre.includes('Cancha');

    if (!selectedCategoria || !alquilerMonto || parseFloat(alquilerMonto) <= 0) {
      alert('Por favor, completa la categoría y el monto.');
      return;
    }
    if (isCanchaRelated && !selectedCancha) {
      alert('Por favor, selecciona una cancha para esta categoría.');
      return;
    }

    setIsPaymentModalOpen(true); // Abre el modal de pago
  };

  const handleClosePaymentModal = () => {
    setIsPaymentModalOpen(false); // Cierra el modal de pago
  };

  // --- PROCESAR PAGO (CORREGIDO) ---
  const handleProcessPayment = async (paymentData) => {
    const concepto = selectedCategoria.nombre.includes('Cancha')
      ? `${selectedCategoria.nombre} - ${selectedCancha?.nombre || 'General'}`
      : selectedCategoria.nombre;
    
    // ✅ CORRECCIÓN CLAVE: Asegurar que metodoPago nunca sea undefined
    const metodoPagoFinal = paymentData.paymentMethod || 'Desconocido'; 

    const nuevoIngreso = {
      concepto,
      monto: parseFloat(alquilerMonto),
      categoria: selectedCategoria.nombre,
      // ✅ Guardamos el Timestamp del servidor para la hora exacta
      fechaHora: serverTimestamp(),
      // Guardamos la fecha simple como respaldo (útil para consultas rápidas o antiguas)
      fecha: new Date().toISOString().slice(0, 10), 
      metodoPago: metodoPagoFinal, // <-- Usamos el valor asegurado
      usuario: nombreUsuario,
      clienteId: selectedClient ? selectedClient.id : null,
      clienteNombre: selectedClient ? selectedClient.nombreCompleto : 'Anónimo',
    };

    try {
      await addDoc(ingresosCollectionRef, nuevoIngreso);

      // Registrar evento de auditoría
      await registrarEventoAuditoria({
        usuario: nombreUsuario,
        rol: rolUsuario,
        tipo: 'Registro de ingreso',
        detalles: `Ingreso de Bs. ${alquilerMonto} - Concepto: "${concepto}" - Cliente: ${nuevoIngreso.clienteNombre}`
      });

      // Limpiar estados
      setSelectedCancha(null);
      setSelectedCategoria(null);
      setAlquilerMonto('');
      setSelectedClient(null);
      setIsMontoValid(false);
      handleClosePaymentModal(); 
    } catch (e) {
      console.error('Error al registrar ingreso:', e);
      alert('Ocurrió un error al procesar el ingreso. Intenta nuevamente.');
    }
  };

  const totalIngresos = ingresosRegistrados.reduce((acc, ingreso) => acc + ingreso.monto, 0);

  const isPayButtonDisabled =
    !selectedCategoria ||
    !alquilerMonto ||
    parseFloat(alquilerMonto) <= 0 ||
    (selectedCategoria?.nombre.includes('Cancha') && !selectedCancha);

  const showCanchaSelection = selectedCategoria?.nombre.includes('Cancha');

  return (
    <div className="ingresos-container">
      <h1 className="main-title">
        <FaMoneyBillWave className="title-icon" /> Gestión de Ingresos
      </h1>

      {/* Formulario de ingreso */}
      <div className="form-section">
        <h2 className="section-title">Registrar Ingreso</h2>
        <div className="form-fields">

          {/* Categoría */}
          <div className="input-group">
            <label htmlFor="categoria">Seleccionar Categoría:</label>
            <select
              id="categoria"
              value={selectedCategoria?.nombre || ''}
              onChange={handleCategoriaChange}
            >
              <option value="">-- Selecciona una categoría --</option>
              {categoriasAlquiler.map((categoria) => (
                <option key={categoria.id} value={categoria.nombre}>
                  {categoria.nombre}
                </option>
              ))}
            </select>
          </div>

          {/* Cancha y cliente */}
          <div className="input-group">
            {showCanchaSelection && (
              <div className="cancha-selection-group">
                <label>Seleccionar Cancha:</label>
                <div className="button-group">
                  {canchas.map((cancha) => (
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
            )}

            {/* Cliente */}
            <div className="client-selection-area">
              <button onClick={handleOpenClientModal} className="add-client-btn">
                <FaUserPlus /> {selectedClient ? 'Cambiar Cliente' : 'Agregar Cliente'}
              </button>
              {selectedClient && (
                <div className="client-info">
                  <p>Cliente: {selectedClient.nombreCompleto}</p>
                </div>
              )}
            </div>
          </div>

          {/* Monto y pago */}
          <div className="input-group payment-group">
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

            <button
              onClick={handleOpenPaymentModal}
              className="pay-btn"
              disabled={isPayButtonDisabled}
            >
              <FaCoins className="btn-icon" /> Registrar Pago
            </button>
          </div>
        </div>
      </div>

      <hr className="divider" />

      {/* Lista de ingresos */}
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
              {ingresosRegistrados.length > 0 && (
                <div className="ingresos-list-header">
                  <span>Fecha y Hora</span>
                  <span>Concepto</span>
                  <span>Monto / Pago</span>
                  <span>Detalles</span>
                </div>
              )}

              {ingresosRegistrados.map((ingreso) => (
                <li key={ingreso.id} className="ingreso-item">
                  <span className="ingreso-date">
                    {/* Mostramos fechaHora si existe, sino la fecha simple (registros antiguos) */}
                    {formatTimestampCompleto(ingreso.fechaHora || ingreso.fecha)}
                  </span>
                  <strong className="ingreso-concepto">{ingreso.concepto}</strong>
                  <span className="ingreso-monto-metodo">
                    {ingreso.monto.toFixed(2)} Bs.
                    <span className="metodo-pago-tag">({ingreso.metodoPago})</span>
                  </span>
                  <span className="ingreso-details">
                    (Cat: {ingreso.categoria} / Cliente: {ingreso.clienteNombre || 'Anónimo'})
                  </span>
                </li>
              ))}

              {ingresosRegistrados.length === 0 && (
                <div className="no-data-msg">
                  <FaExclamationCircle /> No hay ingresos registrados.
                </div>
              )}
            </ul>
          </>
        )}
      </div>

      {/* Modales */}
      {isPaymentModalOpen && (
        <IngresosPaymentModal
          totalAmount={parseFloat(alquilerMonto)}
          onProcessPayment={handleProcessPayment}
          onClose={handleClosePaymentModal}
        />
      )}
      {isClientModalOpen && (
        <ClientSelectionModal
          onSelectClient={handleSelectClient}
          onClose={handleCloseClientModal}
        />
      )}
    </div>
  );
}

export default Ingresos;