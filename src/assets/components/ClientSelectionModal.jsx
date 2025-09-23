// src/assets/components/ClientSelectionModal.jsx
import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, getDocs } from 'firebase/firestore';

function ClientSelectionModal({ onSelectClient, onClose }) {
  const [clients, setClients] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchClients = async () => {
      setLoading(true);
      try {
        const clientsCollection = collection(db, 'clientes');
        const clientsSnapshot = await getDocs(clientsCollection);
        const clientsList = clientsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
        setClients(clientsList);
      } catch (error) {
        console.error('Error fetching clients: ', error);
      } finally {
        setLoading(false);
      }
    };

    fetchClients();
  }, []);

  const filteredClients = clients.filter(client =>
    client.nombreCompleto.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.numeroCi.includes(searchTerm) || // Agregamos la búsqueda por CI
    client.telefono.includes(searchTerm)
  );

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
      backgroundColor: 'rgba(0, 0, 0, 0.5)', display: 'flex',
      justifyContent: 'center', alignItems: 'center'
    }}>
      <div style={{
        backgroundColor: 'white', padding: '20px', borderRadius: '8px',
        width: '90%', maxWidth: '500px', maxHeight: '80%', overflowY: 'auto'
      }}>
        <h2>Seleccionar Cliente</h2>
        <input
          type="text"
          placeholder="Buscar por nombre, CI o teléfono..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ width: '100%', padding: '10px', marginBottom: '10px' }}
        />
        {loading ? (
          <p>Cargando clientes...</p>
        ) : (
          <div>
            {filteredClients.length > 0 ? (
              <ul style={{ listStyleType: 'none', padding: 0 }}>
                {filteredClients.map(client => (
                  <li key={client.id}
                      onClick={() => onSelectClient(client)}
                      style={{
                        padding: '10px', borderBottom: '1px solid #eee',
                        cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                    <span>{client.nombreCompleto}</span>
                    <small>{client.numeroCi}</small> {/* Muestra el número de CI */}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No se encontraron clientes.</p>
            )}
          </div>
        )}
        <button onClick={onClose} style={{ marginTop: '20px' }}>
          Cerrar
        </button>
      </div>
    </div>
  );
}

export default ClientSelectionModal;