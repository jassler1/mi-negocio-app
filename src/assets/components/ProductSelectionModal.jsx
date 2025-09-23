import React, { useState, useEffect } from 'react';
import { db } from "../../firebaseConfig";
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import './ProductSelectionModal.css'; // Importa el archivo CSS

function ProductSelectionModal({ onSelectProduct, onClose, filtroDeSeccion }) {
  const [products, setProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedQuantity, setSelectedQuantity] = useState(1);

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
          return {
            id: doc.id,
            nombre: data.nombre,
            cantidad: data.cantidad,
            precio: parseFloat(data.costoVenta) || 0,
            unidad: data.unidad || 'unidad',
            tipo: data.tipo,
            seccion: data.seccion || '', 
          };
        });

        // FILTRO DINÁMICO
        let filteredList = [];

        if (filtroDeSeccion === 'accesorios') {
          // Filtro con toLowerCase() para que no importe mayúsculas/minúsculas
          filteredList = productsList.filter(product => product.seccion === 'accesorios');
        } else {
          // Para comandas, ocultar insumos y productos con precio cero
          filteredList = productsList.filter(product => 
            product.tipo !== 'Insumo' && product.precio > 0
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
    product.nombre.toLowerCase().includes(searchQuery.toLowerCase())
  );
  
  const handleSelect = (product) => {
    onSelectProduct({
      ...product,
      cantidad: selectedQuantity,
    });
    setSearchQuery('');
    setSelectedQuantity(1);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <h3>Seleccionar Producto</h3>
        <input
          type="text"
          placeholder="Buscar producto..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        
        {loading ? (
          <p>Cargando productos...</p>
        ) : (
          <ul className="product-list">
            {filteredProducts.length === 0 ? (
              <p>No se encontraron productos.</p>
            ) : (
              filteredProducts.map(product => (
                <li key={product.id} className="product-item">
                  <div>
                    <strong>{product.nombre}</strong> - Bs. {product.precio ? product.precio.toFixed(2) : 'N/A'}
                    <br />
                    <small>Stock: {product.cantidad} {product.unidad}</small>
                  </div>
                  <input
                    type="number"
                    min="1"
                    defaultValue="1"
                    onChange={(e) => setSelectedQuantity(e.target.value)}
                    style={{ width: '60px', marginRight: '10px' }}
                  />
                  <button onClick={() => handleSelect(product)}>Añadir</button>
                </li>
              ))
            )}
          </ul>
        )}
        
        <button onClick={onClose} style={{ marginTop: '20px' }}>Cerrar</button>
      </div>
    </div>
  );
}

export default ProductSelectionModal;