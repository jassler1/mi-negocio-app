import React, { useState } from 'react';
import { db } from '../firebaseConfig';
import { collection, query, where, getDocs } from 'firebase/firestore';

function ClientConsumption() {
  const [searchTerm, setSearchTerm] = useState('');
  const [clientData, setClientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSearch = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setClientData(null);

    if (!searchTerm) {
      setError('Por favor, ingresa un nombre para buscar.');
      setLoading(false);
      return;
    }

    try {
      // 1. Busca el cliente por nombre en la colección 'clientes'
      const clientesRef = collection(db, 'clientes');
      const q = query(clientesRef, where('nombreCompleto', '==', searchTerm.toUpperCase()));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        setError('Cliente no encontrado.');
        setLoading(false);
        return;
      }

      const clientDoc = querySnapshot.docs[0];
      const client = { id: clientDoc.id, ...clientDoc.data() };
      
      // 2. Muestra el total de compras almacenado en el documento del cliente
      setClientData(client);

    } catch (e) {
      console.error('Error al buscar el cliente:', e);
      setError('Ocurrió un error al buscar. Inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '20px' }}>
      <h1>Consumo de Clientes</h1>
      <form onSubmit={handleSearch} style={{ marginBottom: '20px' }}>
        <input
          type="text"
          placeholder="Buscar cliente por nombre"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px', marginRight: '10px' }}
        />
        <button type="submit" disabled={loading}>
          {loading ? 'Buscando...' : 'Buscar'}
        </button>
      </form>

      {error && <p style={{ color: 'red' }}>{error}</p>}
      
      {clientData && (
        <div style={{ border: '1px solid #ccc', padding: '15px', marginTop: '20px' }}>
          <h3>Resultados de la búsqueda:</h3>
          <p><strong>Nombre:</strong> {clientData.nombreCompleto}</p>
          <p><strong>Teléfono:</strong> {clientData.telefono}</p>
          <p><strong>Total de Consumo Histórico:</strong> Bs. {clientData.totalCompras ? clientData.totalCompras.toFixed(2) : '0.00'}</p>
        </div>
      )}
    </div>
  );
}

export default ClientConsumption;