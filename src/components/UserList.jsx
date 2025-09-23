import React, { useState, useEffect } from 'react';
import { db } from '../firebaseConfig';
import { collection, getDocs, doc, deleteDoc } from "firebase/firestore";
import { FaUserFriends, FaTrashAlt, FaEdit, FaSpinner } from 'react-icons/fa';
import './UserList.css';

function UserList({ onEdit }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteStatus, setDeleteStatus] = useState('');

  const fetchUsers = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "usuarios"));
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setUsers(usersList);
    } catch (e) {
      console.error("Error al obtener usuarios: ", e);
      setDeleteStatus('Error al cargar la lista de usuarios.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (userId) => {
    setDeleteStatus('');
    if (window.confirm("¿Estás seguro de que quieres eliminar este usuario?")) {
      try {
        await deleteDoc(doc(db, "usuarios", userId));
        setDeleteStatus("✅ Usuario eliminado con éxito.");
        fetchUsers();
      } catch (e) {
        console.error("Error al eliminar el documento: ", e);
        setDeleteStatus("❌ Error al eliminar el usuario.");
      }
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
        <p className={`status-message ${deleteStatus.includes('éxito') ? 'success' : 'error'}`}>
          {deleteStatus}
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
                    <button className="edit-btn" onClick={() => onEdit(user)}>
                      <FaEdit /> Editar
                    </button>
                    <button className="delete-btn" onClick={() => handleDelete(user.id)}>
                      <FaTrashAlt /> Eliminar
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