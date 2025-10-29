import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs, doc, updateDoc, increment } from 'firebase/firestore';
import './AddStockForm.css';
import { FaSearch, FaBoxOpen, FaPlusCircle, FaTimes, FaListUl, FaSpinner } from 'react-icons/fa';

function AddStockForm({ onAddComplete, onCancel }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [foundProduct, setFoundProduct] = useState(null);
  const [stockToAdd, setStockToAdd] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [updateStatus, setUpdateStatus] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Obtener todos los productos al cargar el componente
  useEffect(() => {
    const fetchAllProducts = async () => {
      try {
        setLoading(true);
        const querySnapshot = await getDocs(collection(db, 'inventario'));
        const productsList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllProducts(productsList);
      } catch (error) {
        console.error('Error al obtener la lista de productos: ', error);
      } finally {
        setLoading(false);
      }
    };
    fetchAllProducts();
  }, []);

  const handleSearch = async (e) => {
    e.preventDefault();
    setSearchStatus('Buscando producto...');
    setFoundProduct(null);
    setUpdateStatus('');
    const searchTerm = searchQuery.trim().toUpperCase();

    if (!searchTerm) {
      setSearchStatus('Por favor, ingresa un nombre o código de producto.');
      return;
    }

    try {
      const q = query(collection(db, 'inventario'), where('nombre', '==', searchTerm));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const productData = querySnapshot.docs[0].data();
        setFoundProduct({ id: querySnapshot.docs[0].id, ...productData });
        setSearchStatus(`Producto encontrado: ${productData.nombre}`);
        return;
      }

      setSearchStatus('Producto no encontrado. Inténtalo de nuevo.');
    } catch (error) {
      console.error('Error en la búsqueda: ', error);
      setSearchStatus('Error en la búsqueda. Inténtalo de nuevo.');
    }
  };

  const handleAddStock = async (e) => {
    e.preventDefault();
    setUpdateStatus('Actualizando stock...');

    if (!foundProduct || !stockToAdd || isNaN(stockToAdd) || parseFloat(stockToAdd) <= 0) {
      setUpdateStatus('Por favor, ingresa una cantidad válida.');
      return;
    }

    try {
      const productRef = doc(db, 'inventario', foundProduct.id);
      await updateDoc(productRef, {
        cantidad: increment(parseFloat(stockToAdd)),
      });
      setUpdateStatus('✅ Stock actualizado con éxito.');
      setTimeout(() => {
        onAddComplete();
      }, 1500);
    } catch (error) {
      console.error('Error al actualizar stock: ', error);
      setUpdateStatus('❌ Error al actualizar el stock. Inténtalo de nuevo.');
    }
  };

  const handleSelectProduct = (product) => {
    setFoundProduct(product);
    setSearchQuery(product.nombre); // Sincroniza la barra de búsqueda
    setSearchStatus(`Producto seleccionado: ${product.nombre}`);
    setUpdateStatus('');
    setStockToAdd(''); // Limpia el campo de stock
  };

  const renderProductList = () => {
    if (loading) {
      return (
        <p className="loading-status">
          <FaSpinner className="spinner" /> Cargando inventario...
        </p>
      );
    }

    if (allProducts.length === 0) {
      return <p className="no-products">No hay productos en el inventario.</p>;
    }

    const filteredProducts = allProducts.filter(product =>
      product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (product.codigo && product.codigo.toLowerCase().includes(searchQuery.toLowerCase()))
    );

    return (
      <div className="product-list-container">
        <h3 className="list-title"><FaListUl /> Lista de Productos</h3>
        <ul className="product-list">
          {filteredProducts.length > 0 ? (
            filteredProducts.map((product) => (
              <li
                key={product.id}
                onClick={() => handleSelectProduct(product)}
                className="product-item"
              >
                <strong>{product.nombre}</strong> - Código: {product.codigo} (Stock: {product.cantidad} {product.unidad})
              </li>
            ))
          ) : (
            <p className="no-products">No se encontraron productos que coincidan con la búsqueda.</p>
          )}
        </ul>
      </div>
    );
  };

  return (
    <div className="add-stock-container">
      <h2 className="form-title">
        <FaBoxOpen className="title-icon" /> Añadir Stock al Inventario
      </h2>

      {/* Sección de Búsqueda */}
      <div className="search-section">
        <form onSubmit={handleSearch}>
          <div className="form-group">
            <div className="input-with-icon">
              <FaSearch />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código..."
                required
              />
            </div>
          </div>
          <button type="submit" className="search-btn">
            <FaSearch /> Buscar
          </button>
        </form>
        {searchStatus && <p className="status-message">{searchStatus}</p>}
      </div>

      {/* Sección de Añadir Stock (visible solo si se selecciona un producto) */}
      {foundProduct && (
        <div className="add-stock-section">
          <div className="selected-product-info">
            <h3>Producto Seleccionado: {foundProduct.nombre}</h3>
            <p><strong>Stock actual:</strong> {foundProduct.cantidad} {foundProduct.unidad}</p>
          </div>
          <form onSubmit={handleAddStock}>
            <div className="form-group">
              <label>Cantidad a añadir:</label>
              <div className="input-with-icon">
                <FaPlusCircle />
                <input
                  type="number"
                  value={stockToAdd}
                  onChange={(e) => setStockToAdd(e.target.value)}
                  placeholder="Ej. 50"
                  min="1"
                  step="0.01"
                  required
                />
              </div>
            </div>
            <button type="submit" className="add-btn">
              <FaPlusCircle /> Añadir Stock
            </button>
          </form>
        </div>
      )}

      {/* Mensaje de estado de actualización */}
      {updateStatus && (
        <p className={`status-message ${updateStatus.includes('éxito') ? 'success' : 'error'}`}>
          {updateStatus}
        </p>
      )}

      {/* Lista de productos para seleccionar directamente */}
      {!foundProduct && renderProductList()}

      <div className="form-actions">
        <button type="button" onClick={onCancel} className="cancel-btn">
          <FaTimes /> Cancelar
        </button>
      </div>
    </div>
  );
}

export default AddStockForm;