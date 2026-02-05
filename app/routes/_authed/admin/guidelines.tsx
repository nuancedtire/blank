import { createFileRoute } from '@tanstack/react-router'
import { useState } from 'react'

export const Route = createFileRoute('/_authed/admin/guidelines')({
  component: AdminGuidelines,
})

type GuidelineStatus = 'draft' | 'pending_review' | 'approved' | 'archived'

interface Guideline {
  id: string
  title: string
  status: GuidelineStatus
  author: string
  createdAt: string
  updatedAt: string
  version: string
}

function AdminGuidelines() {
  // Mock data - in a real app, this would come from an API
  const [guidelines] = useState<Guideline[]>([
    {
      id: '1',
      title: 'Security Best Practices v2',
      status: 'approved',
      author: 'admin@example.com',
      createdAt: '2024-01-15T10:00:00Z',
      updatedAt: '2024-01-20T14:30:00Z',
      version: '2.0',
    },
    {
      id: '2',
      title: 'Data Handling Guidelines',
      status: 'pending_review',
      author: 'editor@example.com',
      createdAt: '2024-01-18T09:00:00Z',
      updatedAt: '2024-01-18T09:00:00Z',
      version: '1.0',
    },
    {
      id: '3',
      title: 'Code Review Standards',
      status: 'draft',
      author: 'editor@example.com',
      createdAt: '2024-01-19T11:00:00Z',
      updatedAt: '2024-01-19T15:00:00Z',
      version: '0.1',
    },
    {
      id: '4',
      title: 'Legacy Compliance Rules',
      status: 'archived',
      author: 'admin@example.com',
      createdAt: '2023-06-01T08:00:00Z',
      updatedAt: '2024-01-10T12:00:00Z',
      version: '1.5',
    },
    {
      id: '5',
      title: 'API Design Guidelines',
      status: 'pending_review',
      author: 'developer@example.com',
      createdAt: '2024-01-17T16:00:00Z',
      updatedAt: '2024-01-17T16:00:00Z',
      version: '1.0',
    },
    {
      id: '6',
      title: 'Accessibility Standards',
      status: 'approved',
      author: 'admin@example.com',
      createdAt: '2024-01-10T10:00:00Z',
      updatedAt: '2024-01-12T11:00:00Z',
      version: '1.2',
    },
  ])

  const [statusFilter, setStatusFilter] = useState<GuidelineStatus | 'all'>('all')

  const filteredGuidelines = statusFilter === 'all'
    ? guidelines
    : guidelines.filter((g) => g.status === statusFilter)

  const getStatusBadgeClass = (status: GuidelineStatus) => {
    switch (status) {
      case 'draft':
        return 'badge-draft'
      case 'pending_review':
        return 'badge-pending'
      case 'approved':
        return 'badge-approved'
      case 'archived':
        return 'badge-archived'
      default:
        return ''
    }
  }

  const getStatusLabel = (status: GuidelineStatus) => {
    switch (status) {
      case 'draft':
        return 'Draft'
      case 'pending_review':
        return 'Pending Review'
      case 'approved':
        return 'Approved'
      case 'archived':
        return 'Archived'
      default:
        return status
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString()
  }

  const handleView = (id: string) => {
    console.log('View guideline:', id)
    // Navigate to guideline detail page
  }

  const handleEdit = (id: string) => {
    console.log('Edit guideline:', id)
    // Navigate to guideline edit page
  }

  const handleApprove = (id: string) => {
    console.log('Approve guideline:', id)
    // Call API to approve guideline
  }

  const handleArchive = (id: string) => {
    console.log('Archive guideline:', id)
    // Call API to archive guideline
  }

  const handleUploadNew = () => {
    console.log('Upload new guideline')
    // Navigate to upload page or open upload modal
  }

  return (
    <div className="admin-guidelines">
      <div className="page-header">
        <h1>Manage Guidelines</h1>
        <button className="btn-primary" onClick={handleUploadNew}>
          + Upload New Guideline
        </button>
      </div>

      {/* Filters */}
      <div className="filters-section">
        <label htmlFor="status-filter">Filter by Status:</label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as GuidelineStatus | 'all')}
        >
          <option value="all">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="pending_review">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="archived">Archived</option>
        </select>
      </div>

      {/* Guidelines Table */}
      <div className="guidelines-table-container">
        <table className="guidelines-table">
          <thead>
            <tr>
              <th>Title</th>
              <th>Status</th>
              <th>Author</th>
              <th>Version</th>
              <th>Created</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredGuidelines.map((guideline) => (
              <tr key={guideline.id}>
                <td className="title-cell">{guideline.title}</td>
                <td>
                  <span className={`status-badge ${getStatusBadgeClass(guideline.status)}`}>
                    {getStatusLabel(guideline.status)}
                  </span>
                </td>
                <td className="author-cell">{guideline.author}</td>
                <td className="version-cell">{guideline.version}</td>
                <td className="date-cell">{formatDate(guideline.createdAt)}</td>
                <td className="date-cell">{formatDate(guideline.updatedAt)}</td>
                <td className="actions-cell">
                  <button
                    className="btn-action btn-view"
                    onClick={() => handleView(guideline.id)}
                    title="View"
                  >
                    View
                  </button>
                  <button
                    className="btn-action btn-edit"
                    onClick={() => handleEdit(guideline.id)}
                    title="Edit"
                    disabled={guideline.status === 'archived'}
                  >
                    Edit
                  </button>
                  {guideline.status === 'pending_review' && (
                    <button
                      className="btn-action btn-approve"
                      onClick={() => handleApprove(guideline.id)}
                      title="Approve"
                    >
                      Approve
                    </button>
                  )}
                  {guideline.status !== 'archived' && (
                    <button
                      className="btn-action btn-archive"
                      onClick={() => handleArchive(guideline.id)}
                      title="Archive"
                    >
                      Archive
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredGuidelines.length === 0 && (
          <div className="no-results">
            No guidelines found matching the selected filter.
          </div>
        )}
      </div>

      <style>{`
        .admin-guidelines {
          padding: 24px;
          max-width: 1400px;
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

        .filters-section {
          margin-bottom: 20px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .filters-section label {
          font-weight: 500;
          font-size: 14px;
        }

        .filters-section select {
          padding: 8px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 14px;
          min-width: 180px;
        }

        .guidelines-table-container {
          overflow-x: auto;
        }

        .guidelines-table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e9ecef;
        }

        .guidelines-table th,
        .guidelines-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e9ecef;
        }

        .guidelines-table th {
          background: #f8f9fa;
          font-weight: 600;
          font-size: 14px;
          color: #333;
          white-space: nowrap;
        }

        .guidelines-table td {
          font-size: 14px;
        }

        .guidelines-table tr:last-child td {
          border-bottom: none;
        }

        .guidelines-table tr:hover {
          background: #f8f9fa;
        }

        .title-cell {
          font-weight: 500;
          max-width: 250px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .author-cell {
          color: #666;
        }

        .version-cell {
          text-align: center;
        }

        .date-cell {
          color: #666;
          white-space: nowrap;
        }

        .status-badge {
          display: inline-block;
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 12px;
          font-weight: 500;
          white-space: nowrap;
        }

        .badge-draft {
          background: #e9ecef;
          color: #495057;
        }

        .badge-pending {
          background: #fff3cd;
          color: #856404;
        }

        .badge-approved {
          background: #d4edda;
          color: #155724;
        }

        .badge-archived {
          background: #f8d7da;
          color: #721c24;
        }

        .actions-cell {
          white-space: nowrap;
        }

        .btn-action {
          padding: 6px 12px;
          border: 1px solid #ccc;
          border-radius: 4px;
          font-size: 12px;
          cursor: pointer;
          margin-right: 4px;
          background: #fff;
          transition: all 0.2s;
        }

        .btn-action:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .btn-view {
          border-color: #007bff;
          color: #007bff;
        }

        .btn-view:hover:not(:disabled) {
          background: #007bff;
          color: white;
        }

        .btn-edit {
          border-color: #6c757d;
          color: #6c757d;
        }

        .btn-edit:hover:not(:disabled) {
          background: #6c757d;
          color: white;
        }

        .btn-approve {
          border-color: #28a745;
          color: #28a745;
        }

        .btn-approve:hover:not(:disabled) {
          background: #28a745;
          color: white;
        }

        .btn-archive {
          border-color: #dc3545;
          color: #dc3545;
        }

        .btn-archive:hover:not(:disabled) {
          background: #dc3545;
          color: white;
        }

        .no-results {
          padding: 40px;
          text-align: center;
          color: #666;
          font-size: 16px;
        }
      `}</style>
    </div>
  )
}
