import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { doc, updateDoc } from 'firebase/firestore';

function EditProductForm({ product, onEditComplete, onCancel }) {
  const [formData, setFormData] = useState({
    ...product,
    cantidad: String(product.cantidad),
    costoCompra: String(product.costoCompra),
    costoVenta: String(product.costoVenta),
    gananciaPorcentaje: String(product.gananciaPorcentaje),
  });
  const [status, setStatus] = useState('');
  const [mensajeGanancia, setMensajeGanancia] = useState('');

  useEffect(() => {
    setFormData({
      ...product,
      cantidad: String(product.cantidad),
      costoCompra: String(product.costoCompra),
      costoVenta: String(product.costoVenta),
      gananciaPorcentaje: String(product.gananciaPorcentaje),
    });
  }, [product]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const sanitizedValue = (name === 'costoCompra' || name === 'cantidad' || name === 'gananciaPorcentaje')
      ? value.replace(/[^0-9.]/g, '')
      : value;

    if (type === 'checkbox') {
      // Si es un insumo, limpia los campos de precio y ganancia
      if (checked) {
        setFormData((prevData) => ({
          ...prevData,
          costoVenta: '',
          gananciaPorcentaje: '',
          [name]: checked,
        }));
        setMensajeGanancia('');
      } else {
        setFormData((prevData) => ({
          ...prevData,
          [name]: checked,
        }));
      }
      return;
    }

    setFormData((prevData) => ({
      ...prevData,
      [name]: sanitizedValue,
    }));
  };

  const handleCalculatePrice = (e) => {
    const ganancia = e.target.value;
    const costoCompra = parseFloat(formData.costoCompra);
    setMensajeGanancia('');

    if (costoCompra > 0 && ganancia) {
      const gananciaDecimal = parseFloat(ganancia) / 100;
      const ventaCalculada = costoCompra * (1 + gananciaDecimal);
      setFormData((prevData) => ({
        ...prevData,
        gananciaPorcentaje: ganancia,
        costoVenta: ventaCalculada.toFixed(2),
      }));
    } else {
      setFormData((prevData) => ({
        ...prevData,
        gananciaPorcentaje: ganancia,
      }));
    }
  };
  
  const handleVentaChange = (e) => {
    const venta = e.target.value;
    const costoCompra = parseFloat(formData.costoCompra);
    
    setFormData((prevData) => ({
      ...prevData,
      costoVenta: venta,
      gananciaPorcentaje: '',
    }));

    if (costoCompra > 0 && venta) {
      const diferencia = venta - costoCompra;
      if (diferencia > 0) {
        setMensajeGanancia(`Ganancia de ${diferencia.toFixed(2)} BS`);
      } else if (diferencia < 0) {
        setMensajeGanancia(`Pérdida de ${Math.abs(diferencia).toFixed(2)} BS`);
      } else {
        setMensajeGanancia('Sin ganancia ni pérdida.');
      }
    } else {
      setMensajeGanancia('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('Actualizando producto...');
    try {
      const productRef = doc(db, 'inventario', product.id);
      await updateDoc(productRef, {
        nombre: formData.nombre,
        cantidad: parseFloat(formData.cantidad) || 0,
        unidad: formData.unidad,
        seccion: formData.seccion,        // ⬅️ NUEVO
        categoria: formData.categoria,    // ⬅️ NUEVO
        costoCompra: parseFloat(formData.costoCompra) || 0,
        costoVenta: formData.esInsumo ? 0 : (parseFloat(formData.costoVenta) || 0),
        gananciaPorcentaje: formData.esInsumo ? 0 : (parseFloat(formData.gananciaPorcentaje) || 0),
        esInsumo: formData.esInsumo,
        proveedor: formData.proveedor,
      });
      setStatus('✅ Producto actualizado con éxito.');
      onEditComplete();
    } catch (e) {
      console.error('Error al actualizar documento: ', e);
      setStatus('❌ Error al actualizar el producto. Inténtalo de nuevo.');
    }
  };

  return (
    <div>
      <h2>Editar Producto</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Nombre:</label>
          <input type="text" name="nombre" value={formData.nombre} onChange={handleChange} required />
        </div>
        <div>
          <label>Código:</label>
          <input type="text" name="codigo" value={formData.codigo} readOnly style={{ backgroundColor: '#f0f0f0' }} />
        </div>
        <div>
          <label>Cantidad:</label>
          {/* El campo de cantidad es de solo lectura (readOnly) para evitar la edición manual */}
          <input type="text" name="cantidad" value={formData.cantidad} readOnly style={{ backgroundColor: '#f0f0f0' }} />
        </div>
        <div>
          <label>Unidad:</label>
          <select name="unidad" value={formData.unidad} onChange={handleChange} required>
            <option value="">Seleccione una unidad</option>
            <option value="kg">kg (kilogramos)</option>
            <option value="lts">lts (litros)</option>
            <option value="ml">ml (mililitros)</option>
            <option value="gm">gm (gramos)</option>
            <option value="unidad">unidad</option>
            <option value="pieza">pieza</option>
            <option value="paquete">paquete</option>
            <option value="porcion">porción</option>
          </select>
        </div>
        
        {/* ⬇️ NUEVOS CAMPOS - AGREGAR AQUÍ */}
        <div>
          <label>Sección:</label>
          <select name="seccion" value={formData.seccion || ''} onChange={handleChange} required>
            <option value="">Seleccione una sección</option>
            <option value="RESTAURANTE">RESTAURANTE</option>
            <option value="ACCESORIOS">ACCESORIOS</option>
          </select>
        </div>
        <div>
          <label>Categoría:</label>
          <select name="categoria" value={formData.categoria || ''} onChange={handleChange} required>
            <option value="">Seleccione una categoría</option>
            <option value="BEBIDAS">BEBIDAS</option>
            <option value="COMIDA RAPIDA">COMIDA RAPIDA</option>
            <option value="POSTRES">POSTRES</option>
            <option value="SNACKS">SNACKS</option>
          </select>
        </div>
        {/* ⬆️ FIN DE NUEVOS CAMPOS */}
        
        <div>
          <label>Costo de compra (BS):</label>
          <input type="text" name="costoCompra" value={formData.costoCompra} onChange={handleChange} required />
        </div>
        {!formData.esInsumo && (
          <>
            <div>
              <label>Ganancia (%):</label>
              <input type="text" name="gananciaPorcentaje" value={formData.gananciaPorcentaje} onChange={handleCalculatePrice} />
            </div>
            <div>
              <label>Costo de venta (BS):</label>
              <input type="text" name="costoVenta" value={formData.costoVenta} onChange={handleVentaChange} required />
            </div>
            {mensajeGanancia && <p style={{ color: mensajeGanancia.includes('Pérdida') ? 'red' : 'green' }}>{mensajeGanancia}</p>}
          </>
        )}
        <div>
          <label>Proveedor:</label>
          <input type="text" name="proveedor" value={formData.proveedor} onChange={handleChange} required />
        </div>
        <div>
          <label>
            <input type="checkbox" name="esInsumo" checked={formData.esInsumo} onChange={handleChange} />
            Marcar como insumo
          </label>
        </div>
        <button type="submit">Actualizar Producto</button>
        <button type="button" onClick={onCancel}>Cancelar</button>
      </form>
      {status && <p>{status}</p>}
    </div>
  );
}

export default EditProductForm;
