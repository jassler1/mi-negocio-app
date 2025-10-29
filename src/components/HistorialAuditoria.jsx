import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import './HistorialAuditoria.css';

function HistorialAuditoria() {
  const [eventos, setEventos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'auditoria_movimientos'), orderBy('fecha', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const listaEventos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setEventos(listaEventos);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const eventosFiltrados = eventos.filter(evento => {
    const matchesUsuario = filtroUsuario
      ? evento.usuario.toLowerCase().includes(filtroUsuario.toLowerCase())
      : true;
    const matchesTipo = filtroTipo
      ? evento.tipo.toLowerCase().includes(filtroTipo.toLowerCase())
      : true;

    return matchesUsuario && matchesTipo;
  });

  if (loading) {
    return <p>Cargando historial de auditoría...</p>;
  }

  return (
    <div className="historial-auditoria-container">
      <h2>Historial de Auditoría</h2>

      <div className="filtros">
        <input
          type="text"
          placeholder="Filtrar por usuario"
          value={filtroUsuario}
          onChange={(e) => setFiltroUsuario(e.target.value)}
          aria-label="Filtro por usuario"
        />
        <input
          type="text"
          placeholder="Filtrar por tipo de evento"
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value)}
          aria-label="Filtro por tipo de evento"
        />
      </div>

      {eventosFiltrados.length === 0 ? (
        <p>No se encontraron eventos para los filtros seleccionados.</p>
      ) : (
        <table className="tabla-auditoria">
          <thead>
            <tr>
              <th>Fecha y Hora</th>
              <th>Usuario</th>
              <th>Rol</th>
              <th>Tipo de Evento</th>
              <th>Detalles</th>
            </tr>
          </thead>
          <tbody>
            {eventosFiltrados.map(evento => (
              <tr key={evento.id}>
                <td>{new Date(evento.fecha.seconds * 1000).toLocaleString()}</td>
                <td>{evento.usuario}</td>
                <td>{evento.rol}</td>
                <td>{evento.tipo}</td>
                <td>{evento.detalles}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}

export default HistorialAuditoria;
