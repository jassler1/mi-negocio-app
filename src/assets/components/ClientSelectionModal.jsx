import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebaseConfig';
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import './ProductSelectionModal.css';
import { FaTimes, FaSearch, FaPlus } from 'react-icons/fa';

function ProductSelectionModal({ onSelectProduct, onClose, filtroDeSeccion, initialSearchQuery = '' }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [itemQuantities, setItemQuantities] = useState({});

  const searchInputRef = useRef(null);

  // Sincronizar initialSearchQuery con searchQuery cuando el modal abre
  useEffect(() => {
    setSearchQuery(initialSearchQuery || '');
    // Focus en el input después de que se renderice
    setTimeout(() => {
      if (searchInputRef.current) {
        searchInputRef.current.focus();
      }
    }, 0);
  }, [initialSearchQuery]);

  const ensureValidQuantity = (value) => {
    const num = parseInt(value, 10);
    return isNaN(num) || num < 1 ? 1 : num;
  };

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const q = query(collection(db, 'inventario'), orderBy('nombre', 'asc'));
        const querySnapshot = await getDocs(q);

        if (querySnapshot.empty) {
          setProducts([]);
          setLoading(false);
          return;
        }

        const productsList = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const section = data.seccion ? data.seccion.toLowerCase() : '';
          const price = parseFloat(data.costoVenta) || 0;

          return {
            id: doc.id,
            nombre: data.nombre,
            cantidad: Number(data.cantidad) || 0,
            precio: price,
            unidad: data.unidad || 'unidad',
            tipo: data.esInsumo ? 'Insumo' : 'Producto',
            seccion: section,
            codigoBarras: data.codigoBarras || '',
            codigo: data.codigo || '',
          };
        });

        const filterSectionLower = filtroDeSeccion.toLowerCase();
        let filteredList = [];

        if (filterSectionLower === 'accesorios') {
          filteredList = productsList.filter(p => p.seccion === 'accesorios' && p.cantidad > 0);
        } else {
          filteredList = productsList.filter(p =>
            p.seccion === 'restaurante' &&
            p.tipo !== 'Insumo' &&
            p.precio > 0 &&
            p.cantidad > 0
          );
        }

        setProducts(filteredList);
      } catch (error) {
        console.error("Error al obtener productos: ", error);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [filtroDeSeccion]);

  const filteredProducts = products.filter(product =>
    product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.codigoBarras && product.codigoBarras.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (product.codigo && product.codigo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleQuantityChange = (productId, value) => {
    const quantity = ensureValidQuantity(value);
    setItemQuantities(prev => ({ ...prev, [productId]: quantity }));
  };

  const handleSelect = (product) => {
    const quantityToSelect = itemQuantities[product.id] || 1;

    if (quantityToSelect > product.cantidad) {
      alert(`Stock insuficiente. Solo quedan ${product.cantidad} ${product.unidad}.`);
      return;
    }

    onSelectProduct({ ...product, cantidad: quantityToSelect });

    setSearchQuery('');
    setItemQuantities(prev => {
      const newState = { ...prev };
      delete newState[product.id];
      return newState;
    });
  };

  const modalTitle = filtroDeSeccion === 'accesorios' ? 'Añadir Accesorio' : 'Seleccionar Producto';

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>{modalTitle}</h3>

        <div className="input-with-icon">
          <FaSearch />
          <input
            ref={searchInputRef}
            type="text"
            className="search-input"
            placeholder="Buscar por nombre o código..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <p>Cargando productos...</p>
        ) : (
          <ul className="product-list">
            {filteredProducts.length === 0 ? (
              <p>No se encontraron productos disponibles en esta sección.</p>
            ) : (
              filteredProducts.map(product => {
                const currentQty = itemQuantities[product.id] || 1;
                return (
                  <li key={product.id} className="product-item">
                    <div className="product-info">
                      <strong>{product.nombre}</strong>
                      <small>Bs. {product.precio.toFixed(2)} | Stock: {product.cantidad} {product.unidad}</small>
                    </div>

                    <div className="product-actions">
                      <input
                        type="number"
                        min="1"
                        max={product.cantidad}
                        className="quantity-input"
                        value={currentQty}
                        onChange={(e) => handleQuantityChange(product.id, e.target.value)}
                      />
                      <button
                        onClick={() => handleSelect(product)}
                        className="add-product-btn"
                        disabled={currentQty > product.cantidad || product.cantidad === 0}
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

        <button onClick={onClose} className="close-modal-btn">
          <FaTimes /> Cerrar
        </button>
      </div>
    </div>
  );
}

export default ProductSelectionModal;
