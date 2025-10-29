import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { FaUserFriends, FaTrashAlt, FaEdit, FaSpinner } from 'react-icons/fa';
import './UserList.css';

function UserList({ onEdit }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteStatus, setDeleteStatus] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const snapshot = await getDocs(collection(db, "usuarios"));
        const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setUsers(userList);
      } catch (error) {
        console.error("Error al obtener usuarios:", error);
        setDeleteStatus({ type: 'error', message: 'Error al cargar la lista de usuarios.' });
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
    const confirmDelete = window.confirm("¿Estás seguro de que quieres eliminar este usuario?");
    if (!confirmDelete) return;

    try {
      setDeletingId(userId);
      setDeleteStatus(null);
      await deleteDoc(doc(db, "usuarios", userId));
      setUsers(prev => prev.filter(user => user.id !== userId)); // sin recargar
      setDeleteStatus({ type: 'success', message: '✅ Usuario eliminado con éxito.' });
    } catch (error) {
      console.error("Error al eliminar el documento:", error);
      setDeleteStatus({ type: 'error', message: '❌ Error al eliminar el usuario.' });
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <FaSpinner className="spinner" />
        <p>Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="user-list-container">
      <h2 className="list-title">
        <FaUserFriends className="title-icon" /> Lista de Usuarios
      </h2>

      {deleteStatus && (
        <p className={`status-message ${deleteStatus.type}`}>
          {deleteStatus.message}
        </p>
      )}

      {users.length > 0 ? (
        <div className="table-responsive">
          <table className="user-table">
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Usuario</th>
                <th>Rol</th>
                <th>Celular</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>{user.nombreCompleto}</td>
                  <td>{user.username}</td>
                  <td>{user.role}</td>
                  <td>{user.numeroCelular}</td>
                  <td>
                    <button
                      className="edit-btn"
                      onClick={() => onEdit(user)}
                      title="Editar usuario"
                    >
                      <FaEdit /> Editar
                    </button>

                    <button
                      className="delete-btn"
                      onClick={() => handleDelete(user.id)}
                      disabled={deletingId === user.id}
                      title="Eliminar usuario"
                    >
                      {deletingId === user.id ? <FaSpinner className="spinner delete-spinner" /> : <FaTrashAlt />}
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="empty-state">
          <p>No hay usuarios registrados.</p>
        </div>
      )}
    </div>
  );
}

export default UserList;