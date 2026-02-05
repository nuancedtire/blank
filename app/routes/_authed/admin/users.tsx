import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_authed/admin/users')({
  component: AdminUsers,
})

type UserRole = 'admin' | 'editor' | 'viewer'

interface User {
  id: string
  email: string
  name: string
  role: UserRole
  createdAt: string
  lastLogin: string | null
  status: 'active' | 'inactive'
}

function AdminUsers() {
  // Mock data - in a real app, this would come from an API
  const [users, setUsers] = useState<User[]>([
    {
      id: '1',
      email: 'admin@example.com',
      name: 'Admin User',
      role: 'admin',
      createdAt: '2023-01-01T10:00:00Z',
      lastLogin: '2024-01-20T09:30:00Z',
      status: 'active',
    },
    {
      id: '2',
      email: 'editor@example.com',
      name: 'Editor User',
      role: 'editor',
      createdAt: '2023-06-15T14:00:00Z',
      lastLogin: '2024-01-19T16:45:00Z',
      status: 'active',
    },
    {
      id: '3',
      email: 'viewer@example.com',
      name: 'Viewer User',
      role: 'viewer',
      createdAt: '2023-09-20T11:00:00Z',
      lastLogin: '2024-01-18T10:00:00Z',
      status: 'active',
    },
    {
      id: '4',
      email: 'developer@example.com',
      name: 'Dev User',
      role: 'editor',
      createdAt: '2023-11-01T09:00:00Z',
      lastLogin: '2024-01-17T14:20:00Z',
      status: 'active',
    },
    {
      id: '5',
      email: 'inactive@example.com',
      name: 'Inactive User',
      role: 'viewer',
      createdAt: '2023-03-10T08:00:00Z',
      lastLogin: '2023-08-15T12:00:00Z',
      status: 'inactive',
    },
  ])

  const [showAddUserModal, setShowAddUserModal] = useState(false)
  const [newUser, setNewUser] = useState({
    email: '',
    name: '',
    role: 'viewer' as UserRole,
  })

  const getRoleBadgeClass = (role: UserRole) => {
    switch (role) {
      case 'admin':
        return 'role-admin'
      case 'editor':
        return 'role-editor'
      case 'viewer':
        return 'role-viewer'
      default:
        return ''
    }
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString()
  }

  const handleRoleChange = (userId: string, newRole: UserRole) => {
    setUsers((prevUsers) =>
      prevUsers.map((user) =>
        user.id === userId ? { ...user, role: newRole } : user
      )
    )
    console.log(`Changed role for user ${userId} to ${newRole}`)
    // In a real app, call API to update role
  }

  const handleAddUser = () => {
    if (!newUser.email || !newUser.name) {
      alert('Please fill in all required fields')
      return
    }

    const user: User = {
      id: String(Date.now()),
      email: newUser.email,
      name: newUser.name,
      role: newUser.role,
      createdAt: new Date().toISOString(),
      lastLogin: null,
      status: 'active',
    }

    setUsers((prevUsers) => [...prevUsers, user])
    setShowAddUserModal(false)
    setNewUser({ email: '', name: '', role: 'viewer' })
    console.log('Added new user:', user)
    // In a real app, call API to create user
  }

  return (
    <div className="admin-users">
      <div className="page-header">
        <h1>Manage Users</h1>
        <button className="btn-primary" onClick={() => setShowAddUserModal(true)}>
          + Add New User
        </button>
      </div>

      {/* Users Table */}
      <div className="users-table-container">
        <table className="users-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => (
              <tr key={user.id}>
                <td className="name-cell">{user.name}</td>
                <td className="email-cell">{user.email}</td>
                <td>
                  <span className={`role-badge ${getRoleBadgeClass(user.role)}`}>
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </span>
                </td>
                <td>
                  <span className={`status-indicator ${user.status}`}>
                    {user.status === 'active' ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="date-cell">{formatDate(user.createdAt)}</td>
                <td className="date-cell">{formatDate(user.lastLogin)}</td>
                <td className="actions-cell">
                  <select
                    className="role-select"
                    value={user.role}
                    onChange={(e) => handleRoleChange(user.id, e.target.value as UserRole)}
                  >
                    <option value="viewer">Viewer</option>
                    <option value="editor">Editor</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      {showAddUserModal && (
        <div className="modal-overlay" onClick={() => setShowAddUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New User</h2>
              <button
                className="modal-close"
                onClick={() => setShowAddUserModal(false)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label htmlFor="user-name">Name *</label>
                <input
                  id="user-name"
                  type="text"
                  value={newUser.name}
                  onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                  placeholder="Enter user name"
                />
              </div>
              <div className="form-group">
                <label htmlFor="user-email">Email *</label>
                <input
                  id="user-email"
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="Enter email address"
                />
              </div>
              <div className="form-group">
                <label htmlFor="user-role">Role</label>
                <select
                  id="user-role"
                  value={newUser.role}
                  onChange={(e) => setNewUser({ ...newUser, role: e.target.value as UserRole })}
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="modal-footer">
              <button
                className="btn-secondary"
                onClick={() => setShowAddUserModal(false)}
              >
                Cancel
              </button>
              <button className="btn-primary" onClick={handleAddUser}>
                Add User
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .admin-users {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
        }

        .page-header h1 {
          font-size: 28px;
          font-weight: 600;
          margin: 0;
        }

        .btn-primary {
          background: #007bff;
          color: white;
          border: none;
          padding: 12px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: background 0.2s;
        }

        .btn-primary:hover {
          background: #0056b3;
        }

        .btn-secondary {
          background: #fff;
          color: #333;
          border: 1px solid #ccc;
          padding: 12px 20px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-secondary:hover {
          background: #f8f9fa;
        }

        .users-table-container {
          overflow-x: auto;
        }

        .users-table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e9ecef;
        }

        .users-table th,
        .users-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e9ecef;
        }

        .users-table th {
          background: #f8f9fa;
          font-weight: 600;
          font-size: 14px;
          color: #333;
          white-space: nowrap;
        }

        .users-table td {
          font-size: 14px;
        }

        .users-table tr:last-child td {
          border-bottom: none;
        }

        .users-table tr:hover {
          background: #f8f9fa;
        }

        .name-cell {
          font-weight: 500;
        }

        .email-cell {
          color: #666;
        }

        .date-cell {
          color: #666;
          white-space: nowrap;
        }

        .role-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .role-admin {
          background: #dc3545;
          color: white;
        }

        .role-editor {
          background: #007bff;
          color: white;
        }

        .role-viewer {
          background: #6c757d;
          color: white;
        }

        .status-indicator {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
        }

        .status-indicator.active {
          background: #d4edda;
          color: #155724;
        }

        .status-indicator.inactive {
          background: #f8d7da;
          color: #721c24;
        }

        .role-select {
          padding: 6px 10px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 13px;
          cursor: pointer;
          min-width: 100px;
        }

        .role-select:focus {
          outline: none;
          border-color: #007bff;
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: white;
          border-radius: 8px;
          width: 100%;
          max-width: 450px;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 20px;
          border-bottom: 1px solid #e9ecef;
        }

        .modal-header h2 {
          margin: 0;
          font-size: 18px;
          font-weight: 600;
        }

        .modal-close {
          background: none;
          border: none;
          font-size: 24px;
          cursor: pointer;
          color: #666;
          padding: 0;
          line-height: 1;
        }

        .modal-close:hover {
          color: #333;
        }

        .modal-body {
          padding: 20px;
        }

        .form-group {
          margin-bottom: 16px;
        }

        .form-group:last-child {
          margin-bottom: 0;
        }

        .form-group label {
          display: block;
          margin-bottom: 6px;
          font-weight: 500;
          font-size: 14px;
        }

        .form-group input,
        .form-group select {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
          box-sizing: border-box;
        }

        .form-group input:focus,
        .form-group select:focus {
          outline: none;
          border-color: #007bff;
        }

        .modal-footer {
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 20px;
          border-top: 1px solid #e9ecef;
        }
      `}</style>
    </div>
  )
}
