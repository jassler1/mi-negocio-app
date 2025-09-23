import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, deleteDoc, query, orderBy } from 'firebase/firestore';
import Clientes from '../pages/Clientes';
import EditClientForm from './EditClientForm';
import './ClientManagement.css';
import { FaSort, FaSortUp, FaSortDown } from 'react-icons/fa';

function ClientManagement() {
  const [view, setView] = useState('list');
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState(null);
  const [message, setMessage] = useState('');
  const [filterText, setFilterText] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: 'nombreCompleto', direction: 'ascending' });
  const [showTopConsumers, setShowTopConsumers] = useState(false);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => {
      setMessage('');
    }, 5000);
  };

  const fetchClients = useCallback(async () => {
    setLoading(true);
    try {
      let q = collection(db, 'clientes');

      if (showTopConsumers) {
        q = query(q, orderBy('totalCompras', 'desc'));
      } else {
        q = query(q, orderBy(sortConfig.key, sortConfig.direction === 'ascending' ? 'asc' : 'desc'));
      }

      const querySnapshot = await getDocs(q);
      const clientsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setClients(clientsList);
    } catch (e) {
      console.error('Error al obtener clientes: ', e);
      showMessage('❌ Error al cargar los clientes.');
    } finally {
      setLoading(false);
    }
  }, [sortConfig, showTopConsumers]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const handleActionComplete = () => {
    setView('list');
    fetchClients();
  };

  const handleCreateClient = () => {
    setView('create');
  };

  const handleEditClient = (client) => {
    setEditingClient(client);
    setView('edit');
  };

  const handleDeleteClient = async (clientId) => {
    if (window.confirm("¿Estás seguro de que quieres eliminar este cliente?")) {
      try {
        await deleteDoc(doc(db, 'clientes', clientId));
        showMessage('✅ Cliente eliminado con éxito.');
        fetchClients();
      } catch (e) {
        console.error('Error al eliminar cliente: ', e);
        showMessage('❌ Error al eliminar el cliente.');
      }
    }
  };

  const handleSortRequest = (key) => {
    if (showTopConsumers) return;

    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const handleToggleTopConsumers = () => {
    setShowTopConsumers(!showTopConsumers);
    setFilterText('');
    setSortConfig({ key: 'nombreCompleto', direction: 'ascending' });
  };

  const getClassNamesFor = (name) => {
    if (!sortConfig) {
      return;
    }
    return sortConfig.key === name ? sortConfig.direction : undefined;
  };

  const renderSortIcon = (key) => {
    if (sortConfig.key !== key) {
      return <FaSort />;
    }
    return sortConfig.direction === 'ascending' ? <FaSortUp /> : <FaSortDown />;
  };

  const renderContent = () => {
    switch (view) {
      case 'list':
        if (loading) {
          return <div>Cargando clientes...</div>;
        }

        const filteredClients = clients.filter(client =>
          client.nombreCompleto.toLowerCase().includes(filterText.toLowerCase())
        );

        if (filteredClients.length === 0 && filterText) {
          return <p>No se encontraron clientes con ese nombre.</p>;
        }

        if (filteredClients.length === 0) {
          return <p>No hay clientes registrados.</p>;
        }

        return (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSortRequest('codigoCliente')} className={getClassNamesFor('codigoCliente')}>
                    Código {showTopConsumers ? null : renderSortIcon('codigoCliente')}
                  </th>
                  <th onClick={() => handleSortRequest('nombreCompleto')} className={getClassNamesFor('nombreCompleto')}>
                    Nombre {showTopConsumers ? null : renderSortIcon('nombreCompleto')}
                  </th>
                  <th onClick={() => handleSortRequest('numeroCi')} className={getClassNamesFor('numeroCi')}>
                    CI {showTopConsumers ? null : renderSortIcon('numeroCi')}
                  </th>
                  <th onClick={() => handleSortRequest('telefono')} className={getClassNamesFor('telefono')}>
                    Teléfono {showTopConsumers ? null : renderSortIcon('telefono')}
                  </th>
                  <th onClick={() => handleSortRequest('instagram')} className={getClassNamesFor('instagram')}>
                    Instagram {showTopConsumers ? null : renderSortIcon('instagram')}
                  </th>
                  <th onClick={() => handleSortRequest('correoElectronico')} className={getClassNamesFor('correoElectronico')}>
                    Correo {showTopConsumers ? null : renderSortIcon('correoElectronico')}
                  </th>
                  <th onClick={() => handleSortRequest('descuento')} className={getClassNamesFor('descuento')}>
                    Descuento {showTopConsumers ? null : renderSortIcon('descuento')}
                  </th>
                  <th onClick={() => handleSortRequest('totalCompras')} className={getClassNamesFor('totalCompras')}>
                    Total Compras {showTopConsumers ? null : renderSortIcon('totalCompras')}
                  </th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredClients.map(client => (
                  <tr key={client.id}>
                    <td>{client.codigoCliente}</td>
                    <td>{client.nombreCompleto}</td>
                    <td>{client.numeroCi}</td>
                    <td>{client.telefono}</td>
                    <td>{client.instagram}</td>
                    <td>{client.correoElectronico}</td>
                    <td>{client.descuento || 0}%</td>
                    <td>{client.totalCompras || 0}</td>
                    <td>
                      <div className="action-buttons-container">
                        <button className="edit-btn" onClick={() => handleEditClient(client)}>Editar</button>
                        <button className="delete-btn" onClick={() => handleDeleteClient(client.id)}>Eliminar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      case 'create':
        return <Clientes onClientAdded={handleActionComplete} onCancel={handleActionComplete} />;
      case 'edit':
        return <EditClientForm client={editingClient} onEditComplete={handleActionComplete} onCancel={handleActionComplete} />;
      default:
        return null;
    }
  };

  return (
    <div className="client-management-container">
      <h1>{showTopConsumers ? "Top Clientes Consumidores" : "Gestión de Clientes"}</h1>
      {view === 'list' && (
        <div className="controls-container">
          <div className="button-group">
            <button className="create-client-btn" onClick={handleCreateClient}>Crear Cliente</button>
            <button
              className={`toggle-sort-btn ${showTopConsumers ? 'active' : ''}`}
              onClick={handleToggleTopConsumers}
            >
              {showTopConsumers ? "Mostrar Todos los Clientes" : "Mostrar Top Consumidores"}
            </button>
          </div>
          <div className="search-container">
            <input
              type="text"
              placeholder="Filtrar por nombre..."
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              className="filter-input"
            />
          </div>
        </div>
      )}
      {message && (
        <p className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
          {message}
        </p>
      )}
      {renderContent()}
    </div>
  );
}

export default ClientManagement;