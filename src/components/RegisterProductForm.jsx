import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, addDoc, doc, runTransaction } from 'firebase/firestore';
import './RegisterProductForm.css';
import { FaSave, FaTimes, FaDollarSign, FaBarcode, FaBox, FaPercentage, FaTags, FaStore, FaTruck, FaShoppingCart, FaClipboardList, FaRulerCombined } from 'react-icons/fa';

function RegisterProductForm({ onRegisterComplete, onCancel }) {
  const [formData, setFormData] = useState({
    nombre: '',
    cantidad: '',
    stockMinimo: '',
    unidad: '',
    costoCompra: '',
    costoVenta: '',
    gananciaPorcentaje: '',
    esInsumo: false,
    codigo: '',
    proveedor: '',
    seccion: 'restaurante',
    categoria: 'comida rapida',
  });

  const [status, setStatus] = useState('');
  const [mensajeGanancia, setMensajeGanancia] = useState('');

  const sections = ['restaurante', 'accesorios'];
  const categories = ['gaseosas', 'aguas', 'comida rapida', 'postres', 'snacks', 'accesorios'];
  const units = ['kg', 'lts', 'ml', 'gm', 'unidad', 'pieza', 'paquete', 'porcion'];

  const getNextProductId = async () => {
    try {
      const counterRef = doc(db, 'contadores', 'productosCounter');
      
      const newProductId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { lastProductId: 0 });
          return 1;
        }
        
        const lastId = counterDoc.data().lastProductId;
        const newId = lastId + 1;
        transaction.update(counterRef, { lastProductId: newId });
        return newId;
      });

      const formattedProductId = String(newProductId).padStart(3, '0');
      return formattedProductId;
    } catch (e) {
      console.error("Transacción fallida: ", e);
      setStatus('❌ Error al obtener el código de producto. Inténtalo de nuevo.');
      return null;
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    let sanitizedValue = value;

    if (type === 'checkbox') {
      sanitizedValue = checked;
      if (checked) {
        setFormData((prevData) => ({
          ...prevData,
          costoVenta: '',
          gananciaPorcentaje: '',
          [name]: sanitizedValue,
        }));
        setMensajeGanancia('');
        return;
      }
    } else {
      switch (name) {
        case 'nombre':
        case 'proveedor':
        case 'seccion':
        case 'categoria':
          sanitizedValue = value.toUpperCase();
          break;
        case 'cantidad':
        case 'stockMinimo':
        case 'costoCompra':
        case 'gananciaPorcentaje':
        case 'costoVenta':
          sanitizedValue = value.replace(/[^0-9.]/g, '');
          break;
        default:
          break;
      }
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: sanitizedValue,
    }));
  };

  const handleNombreChange = async (e) => {
    const { name, value } = e.target;
    const uppercaseValue = value.toUpperCase();
    setFormData((prevData) => ({ ...prevData, [name]: uppercaseValue }));

    if (uppercaseValue && !formData.codigo) {
      const initials = uppercaseValue
        .split(' ')
        .map((word) => word[0])
        .join('');
      
      const nextId = await getNextProductId();
      if (nextId) {
        const generatedCode = `${initials}-${nextId}`;
        setFormData((prevData) => ({ ...prevData, codigo: generatedCode }));
      }
    } else if (!uppercaseValue) {
      setFormData((prevData) => ({ ...prevData, codigo: '' }));
    }
  };

  const handleCalculatePrice = (e) => {
    const ganancia = e.target.value.replace(/[^0-9.]/g, '');
    const costoCompra = parseFloat(formData.costoCompra);
    
    setFormData((prevData) => ({
      ...prevData,
      gananciaPorcentaje: ganancia,
    }));
    setMensajeGanancia('');

    if (costoCompra > 0 && ganancia) {
      const gananciaDecimal = parseFloat(ganancia) / 100;
      const ventaCalculada = costoCompra * (1 + gananciaDecimal);
      setFormData((prevData) => ({
        ...prevData,
        gananciaPorcentaje: ganancia,
        costoVenta: ventaCalculada.toFixed(2),
      }));
    }
  };
  
  const handleVentaChange = (e) => {
    const venta = e.target.value.replace(/[^0-9.]/g, '');
    const costoCompra = parseFloat(formData.costoCompra);
    
    setFormData((prevData) => ({
      ...prevData,
      costoVenta: venta,
      gananciaPorcentaje: '',
    }));

    if (costoCompra > 0 && venta) {
      const diferencia = parseFloat(venta) - costoCompra;
      if (diferencia > 0) {
        setMensajeGanancia(`Ganancia: ${diferencia.toFixed(2)} Bs`);
      } else if (diferencia < 0) {
        setMensajeGanancia(`Pérdida: ${Math.abs(diferencia).toFixed(2)} Bs`);
      } else {
        setMensajeGanancia('Sin ganancia ni pérdida.');
      }
    } else {
      setMensajeGanancia('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Registrando producto...');

    let finalCode = formData.codigo;
    if (!finalCode && formData.nombre) {
      const initials = formData.nombre
        .split(' ')
        .map((word) => word[0])
        .join('')
        .toUpperCase();
      const nextId = await getNextProductId();
      if (nextId) {
        finalCode = `${initials}-${nextId}`;
      } else {
        setStatus('❌ Error al generar el código de producto. Inténtalo de nuevo.');
        return;
      }
    } else if (!formData.nombre) {
        setStatus('❌ El nombre del producto es obligatorio para generar el código.');
        return;
    }
    
    try {
      const productData = {
        ...formData,
        codigo: finalCode,
        nombre: formData.nombre.toUpperCase(),
        cantidad: parseFloat(formData.cantidad) || 0,
        stockMinimo: parseFloat(formData.stockMinimo) || 0,
        costoVenta: formData.esInsumo ? 0 : (parseFloat(formData.costoVenta) || 0),
        costoCompra: parseFloat(formData.costoCompra) || 0,
        gananciaPorcentaje: formData.esInsumo ? 0 : (parseFloat(formData.gananciaPorcentaje) || 0),
        seccion: formData.seccion.toUpperCase(),
        categoria: formData.categoria.toUpperCase(),
        proveedor: formData.proveedor.toUpperCase(),
      };

      await addDoc(collection(db, 'inventario'), productData);
      setStatus('✅ Producto registrado con éxito.');
      onRegisterComplete();
    } catch (e) {
      console.error('Error al registrar producto: ', e);
      setStatus('❌ Error al registrar producto. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">
        <FaShoppingCart className="title-icon" /> Registrar Nuevo Producto
      </h2>
      <form onSubmit={handleSubmit}>
        <div className="form-grid">
          <div className="form-group">
            <label htmlFor="nombre">Nombre:</label>
            <div className="input-with-icon">
              <FaTags />
              <input
                id="nombre"
                type="text"
                name="nombre"
                value={formData.nombre}
                onChange={handleNombreChange}
                placeholder="Ej. COCA COLA 2 LT"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="codigo">Código:</label>
            <div className="input-with-icon">
              <FaBarcode />
              <input
                id="codigo"
                type="text"
                name="codigo"
                value={formData.codigo}
                readOnly
                className="read-only"
                placeholder="Se generará automáticamente"
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="seccion">Sección:</label>
            <div className="input-with-icon">
              <FaStore />
              <select id="seccion" name="seccion" value={formData.seccion} onChange={handleChange} required>
                {sections.map(section => (
                  <option key={section} value={section}>{section.charAt(0).toUpperCase() + section.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="categoria">Categoría:</label>
            <div className="input-with-icon">
              <FaClipboardList />
              <select id="categoria" name="categoria" value={formData.categoria} onChange={handleChange} required>
                {categories.map(category => (
                  <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div className="form-group">
            <label htmlFor="cantidad">Cantidad inicial:</label>
            <div className="input-with-icon">
              <FaBox />
              <input
                id="cantidad"
                type="text"
                name="cantidad"
                value={formData.cantidad}
                onChange={handleChange}
                placeholder="Ej. 100"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="stockMinimo">Stock mínimo para alerta:</label>
            <div className="input-with-icon">
              <FaBox />
              <input
                id="stockMinimo"
                type="text"
                name="stockMinimo"
                value={formData.stockMinimo}
                onChange={handleChange}
                placeholder="Ej. 10"
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="unidad">Unidad de medida:</label>
            <div className="input-with-icon">
              <FaRulerCombined />
              <select id="unidad" name="unidad" value={formData.unidad} onChange={handleChange} required>
                <option value="">Seleccione una unidad</option>
                {units.map(unit => (
                  <option key={unit} value={unit}>{unit}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="costoCompra">Costo de compra (Bs):</label>
            <div className="input-with-icon">
              <FaDollarSign />
              <input
                id="costoCompra"
                type="text"
                name="costoCompra"
                value={formData.costoCompra}
                onChange={handleChange}
                placeholder="Ej. 7.50"
                required
              />
            </div>
          </div>
          
          {!formData.esInsumo && (
            <>
              <div className="form-group">
                <label htmlFor="gananciaPorcentaje">Ganancia (%):</label>
                <div className="input-with-icon">
                  <FaPercentage />
                  <input
                    id="gananciaPorcentaje"
                    type="text"
                    name="gananciaPorcentaje"
                    value={formData.gananciaPorcentaje}
                    onChange={handleCalculatePrice}
                    placeholder="Ej. 30 (sin %)"
                  />
                </div>
              </div>
              <div className="form-group">
                <label htmlFor="costoVenta">Costo de venta (Bs):</label>
                <div className="input-with-icon">
                  <FaDollarSign />
                  <input
                    id="costoVenta"
                    type="text"
                    name="costoVenta"
                    value={formData.costoVenta}
                    onChange={handleVentaChange}
                    placeholder="Ej. 10.00"
                    required
                  />
                </div>
              </div>
            </>
          )}
          <div className="form-group">
            <label htmlFor="proveedor">Proveedor:</label>
            <div className="input-with-icon">
              <FaTruck />
              <input
                id="proveedor"
                type="text"
                name="proveedor"
                value={formData.proveedor}
                onChange={handleChange}
                placeholder="Ej. COCA-COLA BOLIVIA"
                required
              />
            </div>
          </div>
        </div>

        {!formData.esInsumo && mensajeGanancia && (
          <p className={`ganancia-mensaje ${mensajeGanancia.includes('Pérdida') ? 'loss' : 'profit'}`}>{mensajeGanancia}</p>
        )}

        <div className="form-group checkbox-group">
          <label className="checkbox-label">
            <input
              type="checkbox"
              name="esInsumo"
              checked={formData.esInsumo}
              onChange={handleChange}
            />
            Marcar como insumo
          </label>
        </div>
        
        <div className="form-actions">
          <button type="submit" className="submit-btn">
            <FaSave /> Registrar Producto
          </button>
          <button type="button" onClick={onCancel} className="cancel-btn">
            <FaTimes /> Cancelar
          </button>
        </div>
      </form>
      {status && <p className="status-message">{status}</p>}
    </div>
  );
}

export default RegisterProductForm;