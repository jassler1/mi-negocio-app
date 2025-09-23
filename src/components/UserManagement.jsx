import React, { useState, useEffect } from 'react';
import UserList from './UserList';
import AddUserForm from './AddUserForm';
import EditUserForm from './EditUserForm';
import { FaUserPlus, FaListAlt } from 'react-icons/fa';
import './UserManagement.css';

function UserManagement() {
  const [editingUser, setEditingUser] = useState(null);
  const [currentView, setCurrentView] = useState('list');

  const handleEdit = (user) => {
    setEditingUser(user);
    setCurrentView('edit');
  };

  const handleReturnToList = () => {
    setEditingUser(null);
    setCurrentView('list');
  };

  const handleAddClick = () => {
    setCurrentView('add');
    setEditingUser(null);
  };

  const renderContent = () => {
    if (currentView === 'edit' && editingUser) {
      return <EditUserForm user={editingUser} onEditComplete={handleReturnToList} />;
    } else if (currentView === 'add') {
      return <AddUserForm onAddComplete={handleReturnToList} />;
    } else {
      return <UserList onEdit={handleEdit} />;
    }
  };

  return (
    <div className="user-management-panel">
      <div className="nav-buttons">
        <button
          className={`nav-btn ${currentView === 'list' ? 'active' : ''}`}
          onClick={handleReturnToList}
        >
          <FaListAlt /> Ver Usuarios
        </button>
        <button
          className={`nav-btn ${currentView === 'add' ? 'active' : ''}`}
          onClick={handleAddClick}
        >
          <FaUserPlus /> Agregar Usuario
        </button>
      </div>
      <hr className="divider" />
      <div className="content-area">
        {renderContent()}
      </div>
    </div>
  );
}

export default UserManagement;