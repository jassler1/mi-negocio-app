import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import '../assets/components/ProductSelectionModal.css';
import { FaTimes, FaSearch, FaPlus } from 'react-icons/fa';

function AccessorySelectionModal({ onSelectAccessory, onClose, existingProducts = [] }) {
  const [accessories, setAccessories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [itemQuantities, setItemQuantities] = useState({});

  const ensureValidQuantity = (value) => {
    const num = parseInt(value, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  };

  useEffect(() => {
    const fetchAccessories = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'inventario'), orderBy('nombre', 'asc'));
        const querySnapshot = await getDocs(q);

        const accessoryList = querySnapshot.docs
          .map((doc) => {
            const data = doc.data();
            
            const precioVenta = parseFloat(data.costoVenta) || 0;
            const cantidadStock = Number(data.cantidad) || 0;

            return {
              id: doc.id,
              nombre: data.nombre,
              cantidad: cantidadStock,
              precio: precioVenta, 
              unidad: data.unidad || 'unidad',
              seccion: data.seccion ? data.seccion.toLowerCase() : '',
            };
          })
          .filter(
            // 🔑 CORRECCIÓN CLAVE: Permite productos de "accesorios" Y "restaurante"
            (item) => 
                (item.seccion === 'accesorios' || item.seccion === 'restaurante') 
                && item.cantidad > 0 
                && item.precio > 0
          );

        setAccessories(accessoryList);
      } catch (error) {
        console.error('Error al obtener accesorios: ', error);
        setAccessories([]);
      } finally {
        setLoading(false);
      }
    };

    fetchAccessories();
  }, []); 

  const filteredAccessories = accessories.filter(
    (acc) =>
      acc.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.codigo && acc.codigo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleQuantityChange = (id, value) => {
    const qty = ensureValidQuantity(value);
    setItemQuantities((prev) => ({ ...prev, [id]: qty }));
  };

  const handleSelect = (accessory) => {
    const qty = itemQuantities[accessory.id] || 1;
    const finalPrice = parseFloat(accessory.precio) || 0;

    if (finalPrice <= 0) {
      alert(`ERROR: El accesorio '${accessory.nombre}' no tiene un precio de venta registrado (Bs. 0.00). Por favor, corríjalo en Inventario.`);
      return;
    }

    if (qty > accessory.cantidad) {
      alert(`Stock insuficiente. Solo quedan ${accessory.cantidad} ${accessory.unidad}.`);
      return;
    }

    onSelectAccessory({ 
        ...accessory, 
        precio: finalPrice,
        cantidad: qty 
    });

    setSearchQuery('');
    setItemQuantities((prev) => {
      const newState = { ...prev };
      delete newState[accessory.id];
      return newState;
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button onClick={onClose} className="close-modal-btn">
          <FaTimes />
        </button>
        <h3>Añadir Accesorio</h3>

        <div className="input-with-icon">
          <FaSearch />
          <input
            type="text"
            className="search-input"
            placeholder="Buscar accesorio..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <p>Cargando accesorios...</p>
        ) : (
          <ul className="product-list">
            {filteredAccessories.length === 0 ? (
              <p>No se encontraron accesorios disponibles (o no tienen precio de venta).</p>
            ) : (
              filteredAccessories.map((acc) => {
                const currentQty = itemQuantities[acc.id] || 1;
                return (
                  <li key={acc.id} className="product-item">
                    <div className="product-info">
                      <strong>{acc.nombre}</strong>
                      <small>
                        Bs. {acc.precio.toFixed(2)} | Stock: {acc.cantidad} {acc.unidad}
                      </small>
                    </div>
                    <div className="product-actions">
                      <input
                        type="number"
                        min="1"
                        max={acc.cantidad}
                        className="quantity-input"
                        value={currentQty}
                        onChange={(e) => handleQuantityChange(acc.id, e.target.value)}
                      />
                      <button
                        onClick={() => handleSelect(acc)}
                        className="add-product-btn"
                        disabled={currentQty > acc.cantidad || acc.cantidad === 0}
                      >
                        <FaPlus /> Añadir
                      </button>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        )}
      </div>
    </div>
  );
}

export default AccessorySelectionModal;