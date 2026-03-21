import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { projectAPI } from '../../services/api'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

const ProjectsManagement = () => {
  const { user } = useAuth()
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      const response = await projectAPI.getAll()
      setProjects(response.data)
    } catch (error) {
      console.error('Failed to fetch projects:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProject = async (projectId) => {
    if (window.confirm('Are you sure you want to delete this project?')) {
      try {
        await projectAPI.deleteProject(projectId)
        fetchProjects()
        alert('Project deleted successfully!')
      } catch (error) {
        console.error('Failed to delete project:', error)
        alert('Failed to delete project. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  return (
    <div className="projects-management">
      <div className="page-header">
        <h1>Projects Management</h1>
        <p>Manage all learning projects in the system</p>
      </div>

      <div className="content-section">
        <Card>
          <div className="section-header">
            <h2>All Projects</h2>
            <Link to="/admin">
              <Button variant="primary">
                Upload New Project
              </Button>
            </Link>
          </div>

          <div className="projects-table">
            {projects.length === 0 ? (
              <div className="empty-state">
                <p>No projects available. Upload your first project!</p>
                <Link to="/admin">
                  <Button variant="primary">
                    Upload Project
                  </Button>
                </Link>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Level</th>
                    <th>Difficulty</th>
                    <th>Time</th>
                    <th>Order</th>
                    <th>Trainer</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((project) => (
                    <tr key={project.id}>
                      <td>
                        <div className="project-title">
                          <strong>{project.title}</strong>
                          <br />
                          <small>{project.description}</small>
                        </div>
                      </td>
                      <td>
                        <span className={`level-badge level-${project.level}`}>
                          Level {project.level}
                        </span>
                      </td>
                      <td>
                        <span className={`difficulty-badge difficulty-${project.difficulty?.toLowerCase() || 'medium'}`}>
                          {project.difficulty || 'Medium'}
                        </span>
                      </td>
                      <td>{project.estimated_time || 60} min</td>
                      <td>{project.order_index || 0}</td>
                      <td>{project.trainer || 'Not assigned'}</td>
                      <td>{new Date(project.created_at).toLocaleDateString()}</td>
                      <td>
                        <div className="action-buttons">
                          <Link to={`/guided-learning/${project.id}`}>
                            <Button variant="secondary" size="small">
                              View
                            </Button>
                          </Link>
                          <Button 
                            variant="danger" 
                            size="small"
                            onClick={() => handleDeleteProject(project.id)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </Card>
      </div>

      <style>{`
        .projects-management {
          padding: 20px;
        }

        .page-header {
          margin-bottom: 30px;
        }

        .page-header h1 {
          font-size: 32px;
          color: #333;
          margin-bottom: 5px;
        }

        .page-header p {
          color: #666;
          font-size: 16px;
        }

        .content-section {
          margin-bottom: 30px;
        }

        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
        }

        .section-header h2 {
          font-size: 24px;
          color: #333;
          margin: 0;
        }

        .projects-table {
          overflow-x: auto;
        }

        .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #666;
        }

        .empty-state p {
          font-size: 18px;
          margin-bottom: 20px;
        }

        table {
          width: 100%;
          border-collapse: collapse;
        }

        th, td {
          padding: 15px;
          text-align: left;
          border-bottom: 1px solid #eee;
        }

        th {
          background-color: #f8f9fa;
          font-weight: 600;
          color: #333;
        }

        .project-title strong {
          color: #333;
        }

        .project-title small {
          color: #666;
          font-size: 12px;
        }

        .level-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .level-badge.level-1 { background-color: #d4edda; color: #155724; }
        .level-badge.level-2 { background-color: #fff3cd; color: #856404; }
        .level-badge.level-3 { background-color: #f8d7da; color: #721c24; }
        .level-badge.level-4 { background-color: #d1ecf1; color: #0c5460; }
        .level-badge.level-5 { background-color: #e2e3e5; color: #383d41; }

        .difficulty-badge {
          display: inline-block;
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .difficulty-badge.difficulty-easy { background-color: #d4edda; color: #155724; }
        .difficulty-badge.difficulty-medium { background-color: #fff3cd; color: #856404; }
        .difficulty-badge.difficulty-hard { background-color: #f8d7da; color: #721c24; }

        .action-buttons {
          display: flex;
          gap: 8px;
        }

        @media (max-width: 768px) {
          .section-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 15px;
          }

          .action-buttons {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  )
}

export default ProjectsManagement
