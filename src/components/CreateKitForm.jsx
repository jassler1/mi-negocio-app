import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, addDoc, doc, runTransaction } from 'firebase/firestore';
import { FaBoxes, FaPlusCircle, FaTimes, FaTags, FaStore, FaClipboardList, FaSearch, FaTrashAlt, FaCalculator, FaCoins } from 'react-icons/fa';
import './CreateKitForm.css';

function CreateKitForm({ onKitComplete, onCancel }) {
  const [kitName, setKitName] = useState('');
  const [allProducts, setAllProducts] = useState([]);
  const [selectedComponents, setSelectedComponents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);

  const [kitSection, setKitSection] = useState('restaurante');
  const [kitCategory, setKitCategory] = useState('comida rapida');

  const [profitPercentage, setProfitPercentage] = useState(40);
  const [kitInfo, setKitInfo] = useState({ totalCost: 0, sellingPrice: 0, maxKits: 0 });

  const sections = ['restaurante', 'accesorios'];
  const categories = ['gaseosas', 'aguas', 'comida rapida', 'postres', 'snacks', 'accesorios'];

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

  const calculateKitInfo = () => {
    let totalCost = 0;
    let maxKitsPossible = Infinity;

    if (selectedComponents.length > 0) {
      selectedComponents.forEach(comp => {
        totalCost += (comp.costoUnitario * comp.cantidadNecesaria);
        const availableKits = Math.floor((comp.cantidadDisponible || 0) / (comp.cantidadNecesaria || 1));
        if (availableKits < maxKitsPossible) {
          maxKitsPossible = availableKits;
        }
      });
    } else {
      maxKitsPossible = 0;
    }
    
    const sellingPrice = totalCost * (1 + (parseFloat(profitPercentage) / 100));
    
    setKitInfo({
      totalCost: totalCost.toFixed(2),
      sellingPrice: sellingPrice.toFixed(2),
      maxKits: maxKitsPossible,
    });
  };

  useEffect(() => {
    calculateKitInfo();
  }, [selectedComponents, profitPercentage]);

  const filteredProducts = allProducts.filter(product =>
    product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.codigo && product.codigo.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleAddComponent = (product) => {
    if (selectedComponents.some(comp => comp.id === product.id)) {
      setStatus('Este producto ya fue agregado al kit.');
      return;
    }
    
    const unitCost = product.cantidad > 0 ? (product.costoCompra / product.cantidad) : 0;
    
    setSelectedComponents(prev => [
      ...prev,
      {
        id: product.id,
        nombre: product.nombre,
        unidad: product.unidad,
        costoUnitario: unitCost,
        cantidadDisponible: product.cantidad,
        cantidadNecesaria: 1,
      },
    ]);
    setSearchQuery('');
    setStatus('');
  };

  const handleUpdateComponentQuantity = (id, quantity) => {
    setSelectedComponents(prev => prev.map(comp =>
      comp.id === id ? { ...comp, cantidadNecesaria: parseFloat(quantity) || 0 } : comp
    ));
  };
  
  const handleRemoveComponent = (id) => {
    setSelectedComponents(prev => prev.filter(comp => comp.id !== id));
  };

  const getNextProductId = async () => {
    try {
      const counterRef = doc(db, 'contadores', 'productosCounter');
      
      const newProductId = await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          throw "El documento de contador no existe!";
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selectedComponents.length === 0) {
      setStatus('Por favor, agrega al menos un componente al kit.');
      return;
    }
    
    setStatus('Creando kit...');
    
    const newProductId = await getNextProductId();
    if (!newProductId) return;

    const initials = kitName
      .split(' ')
      .map((word) => word[0])
      .join('')
      .toUpperCase();
    const finalCode = `${initials}-${newProductId}`;
    
    try {
      const kitData = {
        nombre: kitName,
        codigo: finalCode,
        esKit: true,
        cantidad: kitInfo.maxKits,
        costoVenta: parseFloat(kitInfo.sellingPrice),
        costoCompra: parseFloat(kitInfo.totalCost),
        gananciaPorcentaje: parseFloat(profitPercentage),
        stockMinimo: 0, // Por defecto, se puede ajustar en otra vista
        unidad: "UNIDAD", // Los kits se miden en unidades
        proveedor: 'Interno',
        seccion: kitSection,
        categoria: kitCategory,
        componentes: selectedComponents.map(comp => ({
          id: comp.id,
          nombre: comp.nombre,
          cantidadNecesaria: comp.cantidadNecesaria,
          unidad: comp.unidad,
        })),
      };
      
      await addDoc(collection(db, 'inventario'), kitData);
      setStatus('✅ Kit creado con éxito.');
      setTimeout(() => {
        onKitComplete();
      }, 1500);
    } catch (error) {
      console.error('Error al crear el kit: ', error);
      setStatus('❌ Error al crear el kit. Inténtalo de nuevo.');
    }
  };

  return (
    <div className="kit-form-container">
      <h2 className="form-title">
        <FaBoxes className="title-icon" /> Crear Kit / Producto Compuesto
      </h2>

      <form onSubmit={handleSubmit}>
        {/* Sección: Detalles del Kit */}
        <div className="form-section">
          <h3 className="section-title">
            <FaTags /> Detalles del Kit
          </h3>
          <div className="form-grid">
            <div className="form-group">
              <label htmlFor="kitName">Nombre del Kit:</label>
              <div className="input-with-icon">
                <FaTags />
                <input
                  id="kitName"
                  type="text"
                  value={kitName}
                  onChange={(e) => setKitName(e.target.value.toUpperCase())}
                  placeholder="Ej. COMBO HAMBURGUESA"
                  required
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="kitSection">Sección:</label>
              <div className="input-with-icon">
                <FaStore />
                <select id="kitSection" name="seccion" value={kitSection} onChange={(e) => setKitSection(e.target.value)} required>
                  {sections.map(section => (
                    <option key={section} value={section}>{section.charAt(0).toUpperCase() + section.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="kitCategory">Categoría:</label>
              <div className="input-with-icon">
                <FaClipboardList />
                <select id="kitCategory" name="categoria" value={kitCategory} onChange={(e) => setKitCategory(e.target.value)} required>
                  {categories.map(category => (
                    <option key={category} value={category}>{category.charAt(0).toUpperCase() + category.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Sección: Componentes del Kit */}
        <div className="form-section">
          <h3 className="section-title">
            <FaPlusCircle /> Añadir Componentes
          </h3>
          <div className="form-group search-group">
            <div className="input-with-icon">
              <FaSearch />
              <input
                type="text"
                placeholder="Buscar por nombre o código de insumo..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          {searchQuery && (
            <div className="search-results">
              <ul className="product-list">
                {filteredProducts.map(product => (
                  <li
                    key={product.id}
                    onClick={() => handleAddComponent(product)}
                  >
                    {product.nombre} ({product.unidad}) - Stock: {product.cantidad}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="selected-components">
            <h4>Componentes del Kit</h4>
            {selectedComponents.length === 0 ? (
              <p className="empty-state">Aún no has agregado componentes.</p>
            ) : (
              <ul className="component-list">
                {selectedComponents.map(comp => (
                  <li key={comp.id} className="component-item">
                    <div className="component-details">
                      <strong>{comp.nombre}</strong>
                      <span>Stock: {comp.cantidadDisponible} {comp.unidad}</span>
                      <span>Costo unitario: {comp.costoUnitario.toFixed(2)} Bs</span>
                    </div>
                    <div className="component-actions">
                      <label>Cantidad necesaria:</label>
                      <input
                        type="number"
                        value={comp.cantidadNecesaria}
                        onChange={(e) => handleUpdateComponentQuantity(comp.id, e.target.value)}
                        min="0"
                        step="0.01"
                        required
                      />
                      <button type="button" onClick={() => handleRemoveComponent(comp.id)}>
                        <FaTrashAlt />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        {/* Sección: Resumen y Precio */}
        <div className="form-section summary-section">
          <h3 className="section-title">
            <FaCalculator /> Resumen Financiero
          </h3>
          <div className="summary-grid">
            <div className="summary-item">
              <span className="summary-label">Cantidad máxima de kits:</span>
              <span className="summary-value">{kitInfo.maxKits} UNIDADES</span>
            </div>
            <div className="summary-item">
              <span className="summary-label">Costo total de insumos:</span>
              <span className="summary-value cost-value">{kitInfo.totalCost} Bs</span>
            </div>
          </div>
          <div className="profit-input">
            <label htmlFor="profitPercentage"><FaCoins /> Porcentaje de Ganancia (%):</label>
            <input
              id="profitPercentage"
              type="number"
              value={profitPercentage}
              onChange={(e) => setProfitPercentage(e.target.value)}
              min="0"
              required
            />
          </div>
          <div className="selling-price-box">
            <label>Precio de venta del Kit:</label>
            <span className="selling-price-value">{kitInfo.sellingPrice} Bs</span>
          </div>
        </div>
        
        {status && <p className="status-message">{status}</p>}

        <div className="form-actions">
          <button type="submit" className="submit-btn">
            <FaPlusCircle /> Crear Kit
          </button>
          <button type="button" onClick={onCancel} className="cancel-btn">
            <FaTimes /> Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}

export default CreateKitForm;