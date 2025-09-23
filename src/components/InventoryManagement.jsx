import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import RegisterProductForm from './RegisterProductForm';
import EditProductForm from './EditProductForm';
import AddStockForm from './AddStockForm';
import CreateKitForm from './CreateKitForm';
import './InventoryManagement.css'; 
import { FaPlus, FaBoxOpen, FaCube, FaSearch, FaFilter, FaEdit, FaTrashAlt, FaBoxes } from 'react-icons/fa';

function InventoryManagement() {
  const [view, setView] = useState('list');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState(null);

  const [selectedSection, setSelectedSection] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const sections = ['all', 'restaurante', 'accesorios'];
  const categories = ['all', 'gaseosas', 'aguas', 'comida rapida', 'postres', 'snacks'];

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const q = query(collection(db, 'inventario'), orderBy('nombre', 'asc'));
      const querySnapshot = await getDocs(q);
      const productsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(productsList);
    } catch (e) {
      console.error('Error al obtener productos: ', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [view]);

  const handleRegisterProduct = () => {
    setView('register');
  };
  
  const handleAddStock = () => {
    setView('addStock');
  };
  
  const handleCreateKit = () => {
    setView('createKit');
  };

  const handleActionComplete = () => {
    setView('list');
    fetchProducts();
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setView('edit');
  };

  const handleDeleteProduct = async (productId, productName) => {
    if (window.confirm(`¿Estás seguro de que quieres eliminar el producto "${productName}"?`)) {
      try {
        await deleteDoc(doc(db, 'inventario', productId));
        alert('Producto eliminado con éxito.');
        fetchProducts();
      } catch (e) {
        console.error('Error al eliminar el producto: ', e);
        alert('Error al eliminar el producto. Inténtalo de nuevo.');
      }
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSection = selectedSection === 'all' || product.seccion === selectedSection;
    const matchesCategory = selectedCategory === 'all' || product.categoria === selectedCategory;
    const matchesSearch = product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (product.codigo && product.codigo.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesSection && matchesCategory && matchesSearch;
  });

  const renderProductList = () => {
    if (loading) {
      return <div className="loading-message">Cargando inventario...</div>;
    }

    return (
      <div className="table-container">
        {filteredProducts.length === 0 ? (
          <p className="no-data-message">No hay productos que coincidan con los filtros.</p>
        ) : (
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Nombre</th>
                <th>Cantidad</th>
                <th>Sección</th>
                <th>Categoría</th>
                <th>Costo de Venta (Bs)</th>
                <th>Tipo</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td>{product.codigo || 'N/A'}</td>
                  <td>{product.nombre}</td>
                  <td>{product.cantidad} {product.unidad}</td>
                  <td>{product.seccion || 'N/A'}</td>
                  <td>{product.categoria || 'N/A'}</td>
                  {/* LÍNEA CORREGIDA PARA PREVENIR EL ERROR */}
                  <td>
                    {typeof product.costoVenta === 'number' 
                      ? product.costoVenta.toFixed(2) 
                      : 'N/A'}
                  </td>
                  <td>
                    {product.esInsumo ? 'Insumo' : product.esKit ? 'Kit' : 'Producto'}
                  </td>
                  <td>
                    <button className="edit-btn" onClick={() => handleEditProduct(product)}>
                      <FaEdit />
                    </button>
                    <button className="delete-btn" onClick={() => handleDeleteProduct(product.id, product.nombre)}>
                      <FaTrashAlt />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  return (
    <div className="inventory-container">
      <h1 className="main-title"><FaBoxes className="title-icon" /> Gestión de Inventario</h1>
      {view === 'list' ? (
        <>
          <div className="action-buttons">
            <button className="action-btn" onClick={handleRegisterProduct}>
              <FaPlus className="btn-icon" /> Registrar Producto
            </button>
            <button className="action-btn" onClick={handleAddStock}>
              <FaBoxOpen className="btn-icon" /> Añadir Stock
            </button>
            <button className="action-btn" onClick={handleCreateKit}>
              <FaCube className="btn-icon" /> Crear Kit
            </button>
          </div>
          
          <hr className="divider" />
          
          <div className="filter-section">
            <h2 className="section-title"><FaFilter /> Filtros</h2>
            <div className="filter-group">
              <label htmlFor="section-filter">Sección:</label>
              <select id="section-filter" value={selectedSection} onChange={(e) => setSelectedSection(e.target.value)}>
                {sections.map(section => (
                  <option key={section} value={section}>{section.charAt(0).toUpperCase() + section.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="filter-group">
              <label htmlFor="category-filter">Categoría:</label>
              <select id="category-filter" value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value)}>
                {categories.map(category => (
                  <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="filter-group search-group">
              <label htmlFor="search-input"><FaSearch /> Buscar:</label>
              <input 
                type="text" 
                id="search-input"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre o código"
              />
            </div>
          </div>
          
          {renderProductList()}
        </>
      ) : view === 'register' ? (
        <RegisterProductForm onRegisterComplete={handleActionComplete} onCancel={handleActionComplete} />
      ) : view === 'edit' ? (
        <EditProductForm product={editingProduct} onEditComplete={handleActionComplete} onCancel={handleActionComplete} />
      ) : view === 'addStock' ? (
        <AddStockForm onAddComplete={handleActionComplete} onCancel={handleActionComplete} />
      ) : (
        <CreateKitForm onKitComplete={handleActionComplete} onCancel={handleActionComplete} />
      )}
    </div>
  );
}

export default InventoryManagement;