import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authed/admin/')({
  component: AdminDashboard,
})

function AdminDashboard() {
  // Mock data - in a real app, this would come from an API
  const stats = {
    totalGuidelines: 42,
    pendingApproval: 7,
    activeUsers: 156,
  }

  const recentAuditLogs = [
    {
      id: '1',
      action: 'Guideline approved',
      user: 'admin@example.com',
      timestamp: new Date().toISOString(),
      details: 'Approved "Security Best Practices v2"',
    },
    {
      id: '2',
      action: 'User role changed',
      user: 'admin@example.com',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      details: 'Changed role for user@example.com to Editor',
    },
    {
      id: '3',
      action: 'Guideline archived',
      user: 'editor@example.com',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      details: 'Archived "Legacy Compliance Rules"',
    },
    {
      id: '4',
      action: 'New user added',
      user: 'admin@example.com',
      timestamp: new Date(Date.now() - 10800000).toISOString(),
      details: 'Added newuser@example.com as Viewer',
    },
    {
      id: '5',
      action: 'Guideline submitted',
      user: 'editor@example.com',
      timestamp: new Date(Date.now() - 14400000).toISOString(),
      details: 'Submitted "Data Handling Guidelines" for review',
    },
  ]

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      {/* Overview Statistics */}
      <section className="stats-section">
        <h2>Overview Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-value">{stats.totalGuidelines}</div>
            <div className="stat-label">Total Guidelines</div>
          </div>
          <div className="stat-card pending">
            <div className="stat-value">{stats.pendingApproval}</div>
            <div className="stat-label">Pending Approval</div>
          </div>
          <div className="stat-card">
            <div className="stat-value">{stats.activeUsers}</div>
            <div className="stat-label">Active Users</div>
          </div>
        </div>
      </section>

      {/* Quick Links */}
      <section className="quick-links-section">
        <h2>Quick Links</h2>
        <div className="quick-links-grid">
          <a href="/admin/guidelines" className="quick-link-card">
            <span className="quick-link-icon">📋</span>
            <span className="quick-link-title">Manage Guidelines</span>
            <span className="quick-link-description">
              View, edit, approve, and archive guidelines
            </span>
          </a>
          <a href="/admin/users" className="quick-link-card">
            <span className="quick-link-icon">👥</span>
            <span className="quick-link-title">Manage Users</span>
            <span className="quick-link-description">
              View users, change roles, and add new users
            </span>
          </a>
          <a href="/admin/guidelines?status=pending_review" className="quick-link-card">
            <span className="quick-link-icon">⏳</span>
            <span className="quick-link-title">Review Queue</span>
            <span className="quick-link-description">
              {stats.pendingApproval} guidelines awaiting approval
            </span>
          </a>
          <a href="/admin/audit-logs" className="quick-link-card">
            <span className="quick-link-icon">📜</span>
            <span className="quick-link-title">Audit Logs</span>
            <span className="quick-link-description">
              View complete activity history
            </span>
          </a>
        </div>
      </section>

      {/* Recent Audit Logs Preview */}
      <section className="audit-logs-section">
        <div className="section-header">
          <h2>Recent Activity</h2>
          <a href="/admin/audit-logs" className="view-all-link">
            View All
          </a>
        </div>
        <div className="audit-logs-table">
          <table>
            <thead>
              <tr>
                <th>Action</th>
                <th>User</th>
                <th>Details</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {recentAuditLogs.map((log) => (
                <tr key={log.id}>
                  <td className="action-cell">{log.action}</td>
                  <td className="user-cell">{log.user}</td>
                  <td className="details-cell">{log.details}</td>
                  <td className="timestamp-cell">{formatTimestamp(log.timestamp)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .admin-dashboard {
          padding: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }

        .admin-dashboard h1 {
          margin-bottom: 24px;
          font-size: 28px;
          font-weight: 600;
        }

        .admin-dashboard h2 {
          margin-bottom: 16px;
          font-size: 20px;
          font-weight: 500;
        }

        .stats-section {
          margin-bottom: 32px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .stat-card {
          background: #f8f9fa;
          border-radius: 8px;
          padding: 24px;
          text-align: center;
          border: 1px solid #e9ecef;
        }

        .stat-card.pending {
          background: #fff3cd;
          border-color: #ffc107;
        }

        .stat-value {
          font-size: 36px;
          font-weight: 700;
          color: #333;
        }

        .stat-label {
          font-size: 14px;
          color: #666;
          margin-top: 8px;
        }

        .quick-links-section {
          margin-bottom: 32px;
        }

        .quick-links-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 16px;
        }

        .quick-link-card {
          display: flex;
          flex-direction: column;
          padding: 20px;
          background: #fff;
          border: 1px solid #e9ecef;
          border-radius: 8px;
          text-decoration: none;
          color: inherit;
          transition: box-shadow 0.2s, border-color 0.2s;
        }

        .quick-link-card:hover {
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
          border-color: #007bff;
        }

        .quick-link-icon {
          font-size: 24px;
          margin-bottom: 12px;
        }

        .quick-link-title {
          font-weight: 600;
          font-size: 16px;
          margin-bottom: 8px;
        }

        .quick-link-description {
          font-size: 14px;
          color: #666;
        }

        .audit-logs-section {
          margin-bottom: 32px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .section-header h2 {
          margin-bottom: 0;
        }

        .view-all-link {
          color: #007bff;
          text-decoration: none;
          font-size: 14px;
        }

        .view-all-link:hover {
          text-decoration: underline;
        }

        .audit-logs-table {
          overflow-x: auto;
        }

        .audit-logs-table table {
          width: 100%;
          border-collapse: collapse;
          background: #fff;
          border-radius: 8px;
          overflow: hidden;
          border: 1px solid #e9ecef;
        }

        .audit-logs-table th,
        .audit-logs-table td {
          padding: 12px 16px;
          text-align: left;
          border-bottom: 1px solid #e9ecef;
        }

        .audit-logs-table th {
          background: #f8f9fa;
          font-weight: 600;
          font-size: 14px;
          color: #333;
        }

        .audit-logs-table td {
          font-size: 14px;
        }

        .audit-logs-table tr:last-child td {
          border-bottom: none;
        }

        .action-cell {
          font-weight: 500;
        }

        .user-cell {
          color: #666;
        }

        .details-cell {
          max-width: 300px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .timestamp-cell {
          color: #666;
          white-space: nowrap;
        }
      `}</style>
    </div>
  )
}
