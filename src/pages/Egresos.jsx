import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import {
  collection,
  addDoc,
  onSnapshot,
  query,
  orderBy
} from 'firebase/firestore';
import { registrarEventoAuditoria } from '../utils/auditoria';
import './Egresos.css';

// Componentes reutilizables

function FormInput({
  label,
  value,
  onChange,
  placeholder = '',
  type = 'text',
  ...rest
}) {
  return (
    <div className="input-group">
      <label htmlFor={label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}>{label}</label>
      <input
        id={label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        {...rest}
      />
    </div>
  );
}

function FormSelect({ label, value, onChange, options, placeholder = '' }) {
  const id = label.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
  return (
    <div className="input-group">
      <label htmlFor={id}>{label}</label>
      <select id={id} value={value} onChange={(e) => onChange(e.target.value)} required>
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opcion, idx) => (
          <option key={idx} value={opcion}>
            {opcion}
          </option>
        ))}
      </select>
    </div>
  );
}

// Componente Principal

function Egresos() {
  const [concepto, setConcepto] = useState('');
  const [numeroRecibo, setNumeroRecibo] = useState('');
  const [categoria, setCategoria] = useState('');
  const [monto, setMonto] = useState('');
  const [fuentePago, setFuentePago] = useState('');
  const [egresosRegistrados, setEgresosRegistrados] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  const nombreUsuario = localStorage.getItem('usuarioNombre') || 'Desconocido';
  const rolUsuario = localStorage.getItem('usuarioRol') || 'Sin rol';
  const egresosCollectionRef = collection(db, 'egresos');

  useEffect(() => {
    const q = query(egresosCollectionRef, orderBy('fecha', 'desc'));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const egresosList = snapshot.docs.map((doc) => ({
          ...doc.data(),
          id: doc.id,
          monto: parseFloat(doc.data().monto) || 0
        }));
        setEgresosRegistrados(egresosList);
        setIsLoading(false);
      },
      (error) => {
        console.error('Error al obtener los egresos:', error);
        setIsLoading(false);
      }
    );
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
    'Otros egresos'
  ];
  const fuentesPagoOpciones = ['Efectivo (Caja)', 'Cuenta Mancomunada'];

  const isFormValid =
    concepto.trim() &&
    monto &&
    categoria &&
    fuentePago &&
    parseFloat(monto) > 0;

  const handleAddEgreso = async () => {
    if (!isFormValid) {
      alert('Por favor, completa todos los campos requeridos.');
      return;
    }

    const nuevoEgreso = {
      concepto: concepto.trim(),
      numeroRecibo: numeroRecibo.trim(),
      categoria,
      monto: parseFloat(monto),
      fecha: new Date().toISOString(), // Fecha + hora completas
      usuario: nombreUsuario,
      fuentePago
    };

    try {
      await addDoc(egresosCollectionRef, nuevoEgreso);
      await registrarEventoAuditoria({
        usuario: nombreUsuario,
        rol: rolUsuario,
        tipo: 'Registro de egreso',
        detalles: `Egreso de Bs. ${monto} - Concepto: "${concepto}" - Categoría: ${categoria}`
      });
      clearForm();
    } catch (error) {
      console.error('Error al añadir el documento:', error);
      alert('Ocurrió un error al registrar el egreso. Inténtalo de nuevo.');
    }
  };

  const clearForm = () => {
    setConcepto('');
    setNumeroRecibo('');
    setCategoria('');
    setMonto('');
    setFuentePago('');
  };

  const totalEgresos = egresosRegistrados.reduce(
    (acc, egreso) => acc + egreso.monto,
    0
  );

  return (
    <div className="egresos-container">
      <header className="page-header">
        <h1 className="main-title">💰 Gestión de Egresos</h1>
      </header>

      <section className="form-section card">
        <h2 className="section-title">✍️ Registrar Nuevo Egreso</h2>

        <form
          className="form-fields"
          onSubmit={(e) => {
            e.preventDefault();
            handleAddEgreso();
          }}
        >
          <FormInput
            label="Glosa o Concepto:"
            value={concepto}
            onChange={setConcepto}
            placeholder="Ej: Pago de luz de la cancha"
            required
          />
          <FormInput
            label="Número de Recibo/Factura:"
            value={numeroRecibo}
            onChange={setNumeroRecibo}
            placeholder="Opcional. Ej: 12345"
          />

          <FormSelect
            label="Categoría:"
            value={categoria}
            onChange={setCategoria}
            options={categoriasEgresos}
            placeholder="Selecciona una categoría"
          />
          <FormSelect
            label="Fuente de Pago:"
            value={fuentePago}
            onChange={setFuentePago}
            options={fuentesPagoOpciones}
            placeholder="Selecciona la fuente"
          />

          <FormInput
            label="Monto (Bs.):"
            type="number"
            value={monto}
            onChange={setMonto}
            placeholder="Ej: 80.00"
            min="0.01"
            step="0.01"
            inputMode="decimal"
            required
          />

          <div className="form-action-group">
            <button
              type="submit"
              className="add-egreso-btn btn-primary"
              disabled={!isFormValid}
            >
              ➕ Añadir Egreso
            </button>
          </div>
        </form>
      </section>

      <hr className="divider" />

      <section className="summary-section card">
        <h2 className="section-title">📋 Egresos Recientes</h2>

        <p className="total-egresos summary-box">
          <strong>Total Egresos Registrados:</strong>{' '}
          <span className="total-amount">{totalEgresos.toFixed(2)} Bs.</span>
        </p>

        {isLoading ? (
          <p className="loading-message">Cargando egresos... ⏳</p>
        ) : egresosRegistrados.length === 0 ? (
          <p className="empty-message">No hay egresos registrados aún. ¡Empieza a registrar! 🎉</p>
        ) : (
          <ul className="egresos-list">
            {egresosRegistrados.map(
              ({ id, fecha, concepto, monto, fuentePago, categoria, numeroRecibo }) => (
                <li key={id} className="egreso-item" tabIndex={0}>
                  <div className="egreso-header">
                    <strong className="egreso-monto-fuente">
                      <span className="amount-out">-{monto.toFixed(2)} Bs.</span>
                      <span className="fuente-pago-tag">({fuentePago})</span>
                    </strong>
                    <time className="egreso-date">🗓️ {new Date(fecha).toLocaleString()}</time>
                  </div>

                  <p className="egreso-concepto">
                    {concepto}
                  </p>

                  <div className="egreso-footer">
                    <span className="egreso-details">
                      <strong>Categoría:</strong> <span className="category-tag">{categoria}</span>
                    </span>
                    {numeroRecibo && (
                      <span className="egreso-details">
                        <strong>Recibo/Factura:</strong> <span className="receipt-number">{numeroRecibo}</span>
                      </span>
                    )}
                  </div>
                </li>
              )
            )}
          </ul>
        )}
      </section>
    </div>
  );
}

export default Egresos;