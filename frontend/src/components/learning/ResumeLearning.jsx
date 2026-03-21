import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { projectAPI } from '../../services/api'
import Button from '../common/Button'
import Card from '../common/Card'
import ProgressBar from '../common/ProgressBar'

const ResumeLearning = () => {
  const [resumeData, setResumeData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    fetchResumeData()
  }, [])

  const fetchResumeData = async () => {
    try {
      setLoading(true)
      const response = await projectAPI.resumeLearning()
      setResumeData(response.data)
    } catch (error) {
      console.error('Failed to fetch resume data:', error)
      setError('Failed to load resume data')
    } finally {
      setLoading(false)
    }
  }

  const handleResumeClick = () => {
    if (!resumeData) return

    if (resumeData.type === 'continue_project') {
      navigate(`/guided-learning/${resumeData.project.id}`)
    } else if (resumeData.type === 'start_new_project') {
      navigate(`/guided-learning/${resumeData.project.id}`)
    }
  }

  const handleBrowseProjects = () => {
    navigate('/project-learning')
  }

  if (loading) {
    return (
      <div className="resume-learning loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="resume-learning error">
        <Card>
          <h2>Error</h2>
          <p>{error}</p>
          <Button onClick={fetchResumeData}>Try Again</Button>
        </Card>
      </div>
    )
  }

  if (!resumeData) {
    return (
      <div className="resume-learning empty">
        <Card>
          <h2>No Learning Data</h2>
          <p>Start your learning journey by exploring our projects!</p>
          <Button onClick={handleBrowseProjects}>Browse Projects</Button>
        </Card>
      </div>
    )
  }

  const renderContent = () => {
    switch (resumeData.type) {
      case 'continue_project':
        return (
          <div className="continue-project">
            <div className="project-info">
              <h3>{resumeData.project.title}</h3>
              <div className="project-meta">
                <span className="level-badge">Level {resumeData.project.level}</span>
                <span className="difficulty-badge">{resumeData.project.difficulty}</span>
                <span className="time-estimate">⏱️ {resumeData.project.estimated_time} min</span>
              </div>
              <p className="project-description">{resumeData.project.description}</p>
            </div>
            
            {resumeData.step && (
              <div className="current-step">
                <h4>Current Step: {resumeData.step.title}</h4>
                <p>{resumeData.step.explanation}</p>
              </div>
            )}
            
            <div className="resume-actions">
              <Button variant="primary" onClick={handleResumeClick}>
                Continue Learning →
              </Button>
            </div>
          </div>
        )

      case 'start_new_project':
        return (
          <div className="start-new-project">
            <div className="project-info">
              <h3>{resumeData.project.title}</h3>
              <div className="project-meta">
                <span className="level-badge">Level {resumeData.project.level}</span>
                <span className="difficulty-badge">{resumeData.project.difficulty}</span>
                <span className="time-estimate">⏱️ {resumeData.project.estimated_time} min</span>
              </div>
              <p className="project-description">{resumeData.project.description}</p>
            </div>
            
            <div className="first-step">
              <h4>🚀 Ready to Start?</h4>
              <p>Begin your journey with this exciting new project!</p>
            </div>
            
            <div className="resume-actions">
              <Button variant="success" onClick={handleResumeClick}>
                Start Project →
              </Button>
            </div>
          </div>
        )

      case 'all_completed':
        return (
          <div className="all-completed">
            <div className="completion-celebration">
              <div className="trophy-icon">🏆</div>
              <h3>Congratulations!</h3>
              <p>You have completed all available projects!</p>
              <div className="completion-stats">
                <div className="stat">
                  <span className="stat-number">🎯</span>
                  <span className="stat-label">All Projects Done</span>
                </div>
                <div className="stat">
                  <span className="stat-number">⭐</span>
                  <span className="stat-label">Expert Level</span>
                </div>
              </div>
            </div>
            
            <div className="completion-actions">
              <Button variant="secondary" onClick={handleBrowseProjects}>
                Review Projects
              </Button>
              <Button variant="primary" onClick={() => navigate('/my-progress')}>
                View Progress
              </Button>
            </div>
          </div>
        )

      default:
        return (
          <div className="unknown-state">
            <p>Unknown learning state</p>
            <Button onClick={handleBrowseProjects}>Browse Projects</Button>
          </div>
        )
    }
  }

  return (
    <div className="resume-learning">
      <Card className="resume-card">
        <div className="resume-header">
          <h2>📚 Continue Learning</h2>
          <p className="resume-subtitle">{resumeData.message}</p>
        </div>
        
        <div className="resume-content">
          {renderContent()}
        </div>
      </Card>

      <style>{`
        .resume-learning {
          padding: 20px;
          max-width: 800px;
          margin: 0 auto;
        }

        .resume-card {
          text-align: center;
        }

        .resume-header h2 {
          color: #333;
          margin-bottom: 8px;
        }

        .resume-subtitle {
          color: #666;
          margin-bottom: 30px;
          font-size: 16px;
        }

        .continue-project, .start-new-project {
          text-align: left;
        }

        .project-info h3 {
          color: #333;
          margin-bottom: 12px;
          font-size: 24px;
        }

        .project-meta {
          display: flex;
          gap: 12px;
          margin-bottom: 16px;
          flex-wrap: wrap;
        }

        .level-badge {
          background: #007bff;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .difficulty-badge {
          background: #28a745;
          color: white;
          padding: 4px 8px;
          border-radius: 4px;
          font-size: 12px;
          font-weight: 600;
        }

        .time-estimate {
          color: #666;
          font-size: 14px;
        }

        .project-description {
          color: #666;
          line-height: 1.6;
          margin-bottom: 24px;
        }

        .current-step, .first-step {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 24px;
          border-left: 4px solid #007bff;
        }

        .current-step h4, .first-step h4 {
          color: #333;
          margin-bottom: 8px;
        }

        .current-step p, .first-step p {
          color: #666;
          margin: 0;
        }

        .resume-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .all-completed {
          text-align: center;
        }

        .trophy-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }

        .completion-celebration h3 {
          color: #28a745;
          margin-bottom: 8px;
          font-size: 28px;
        }

        .completion-celebration p {
          color: #666;
          margin-bottom: 24px;
          font-size: 16px;
        }

        .completion-stats {
          display: flex;
          justify-content: center;
          gap: 40px;
          margin-bottom: 32px;
        }

        .stat {
          text-align: center;
        }

        .stat-number {
          font-size: 32px;
          display: block;
          margin-bottom: 8px;
        }

        .stat-label {
          color: #666;
          font-size: 14px;
        }

        .completion-actions {
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .loading, .error, .empty {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 200px;
        }

        @media (max-width: 768px) {
          .resume-learning {
            padding: 16px;
          }

          .project-meta {
            justify-content: center;
          }

          .resume-actions, .completion-actions {
            flex-direction: column;
          }

          .completion-stats {
            gap: 20px;
          }
        }
      `}</style>
    </div>
  )
}

export default ResumeLearning
