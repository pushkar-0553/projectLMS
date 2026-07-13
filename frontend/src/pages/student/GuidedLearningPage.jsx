import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { projectAPI, progressAPI, resolveAssetUrl } from '../../services/api'
import Button from '../../components/common/Button'
import Card from '../../components/common/Card'

const GuidedLearningPage = () => {
  const { user } = useAuth()
  const { projectId } = useParams()
  const navigate = useNavigate()
  
  const [project, setProject] = useState(null)
  const [steps, setSteps] = useState([])
  const [currentStepIndex, setCurrentStepIndex] = useState(0)
  const [userProgress, setUserProgress] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [message, setMessage] = useState(null)

  const isSimpleProject = project?.type === 'simple'

  useEffect(() => {
    if (projectId) {
      fetchProjectData()
    }
  }, [projectId])

  const fetchProjectData = async () => {
    try {
      setLoading(true)
      
      // Fetch project details (includes steps)
      const projectResponse = await projectAPI.getById(projectId)
      const projectData = projectResponse.data
      setProject(projectData)
      
      // Fetch steps separately if not included
      const stepsData = projectData.steps || []
      if (stepsData.length === 0) {
        const stepsResponse = await projectAPI.getSteps(projectId)
        setSteps(stepsResponse.data)
      } else {
        setSteps(stepsData)
      }
      
      // Fetch user's progress for this project
      const progressResponse = await progressAPI.getUserProgress(projectId)
      setUserProgress(progressResponse.data || [])
      
    } catch (error) {
      console.error('Failed to fetch project data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Get status for a specific step
  const getStepStatus = (stepId) => {
    const progress = userProgress.find(p => p.step_id === stepId)
    return progress?.status || null
  }

  // Check if a step is accessible (for main projects)
  const isStepAccessible = (stepIndex) => {
    if (isSimpleProject) return true // All steps accessible for simple projects
    if (stepIndex === 0) return true // First step always accessible
    
    // For main projects, check if previous step is approved
    const prevStep = steps[stepIndex - 1]
    if (!prevStep) return true
    const prevStatus = getStepStatus(prevStep.id)
    return prevStatus === 'approved'
  }

  // Handle step completion for SIMPLE projects (no approval)
  const handleSimpleComplete = async (stepId) => {
    setSubmitting(true)
    setMessage(null)
    try {
      await projectAPI.completeSimpleStep({
        projectId: parseInt(projectId),
        stepId: stepId
      })
      
      setMessage({ type: 'success', text: 'Step completed! ✓' })
      
      // If this is the last uncompleted step, mark project complete
      const completedCount = steps.filter(s => getStepStatus(s.id) === 'approved' || s.id === stepId).length
      if (completedCount === steps.length) {
        setMessage({ type: 'success', text: '🎉 Project completed! All steps done.' })
      }
      
      fetchProjectData()
      
    } catch (error) {
      console.error('Failed to complete step:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to complete step' })
    } finally {
      setSubmitting(false)
    }
  }

  // Handle step submission for MAIN projects (needs approval)
  const handleMainSubmit = async () => {
    const step = steps[currentStepIndex]
    if (!step) return
    
    setSubmitting(true)
    setMessage(null)
    try {
      await projectAPI.submitStep({
        projectId: parseInt(projectId),
        stepId: step.id
      })
      
      setMessage({ type: 'info', text: '⏳ Step submitted for coordinator approval. Please wait.' })
      fetchProjectData()
      
    } catch (error) {
      console.error('Failed to submit step:', error)
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to submit step' })
    } finally {
      setSubmitting(false)
    }
  }

  const currentStep = steps[currentStepIndex]
  const currentStepStatus = currentStep ? getStepStatus(currentStep.id) : null

  const getStatusBadge = (status) => {
    const badges = {
      'pending': { color: '#ffc107', bg: '#fff3cd', text: '⏳ Pending Approval' },
      'approved': { color: '#28a745', bg: '#d4edda', text: '✓ Approved' },
      'rejected': { color: '#dc3545', bg: '#f8d7da', text: '✗ Rejected' },
    }
    const badge = badges[status]
    if (!badge) return null
    return (
      <span 
        className="status-badge"
        style={{ backgroundColor: badge.bg, color: badge.color }}
      >
        {badge.text}
      </span>
    )
  }

  const parseImages = (imagesData) => {
    if (!imagesData) return []
    try {
      return typeof imagesData === 'string' ? JSON.parse(imagesData) : imagesData
    } catch(e) {
      return []
    }
  }

  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="not-found">
        <h2>Project not found</h2>
        <Button onClick={() => navigate('/project-learning')}>
          Back to Projects
        </Button>
      </div>
    )
  }

  const completedCount = steps.filter(s => getStepStatus(s.id) === 'approved').length
  const progressPercent = steps.length > 0 ? Math.round((completedCount / steps.length) * 100) : 0

  return (
    <div className="guided-learning">
      <div className="learning-header">
        <div className="container">
          <div className="header-top">
            <Button variant="secondary" onClick={() => navigate('/project-learning')}>
              ← Back to Projects
            </Button>
            <span className="project-type-badge" style={{
              background: isSimpleProject ? '#e8f5e9' : '#e3f2fd',
              color: isSimpleProject ? '#2e7d32' : '#1565c0'
            }}>
              {isSimpleProject ? '📖 Self Learning' : '🎯 Guided + Approval'}
            </span>
          </div>

          <h1>{project.title}</h1>
          <p className="project-desc">{project.description}</p>
          
          {project.thumbnail && (
            <div className="project-banner-container" style={{ margin: '20px 0', borderRadius: '12px', overflow: 'hidden', maxHeight: '240px' }}>
              <img src={resolveAssetUrl(project.thumbnail)} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          
          <div className="project-meta">
            <span className="meta-badge level">Level {project.level}</span>
            <span className="meta-badge difficulty">{project.difficulty || 'Medium'}</span>
            {project.estimated_time && <span className="meta-badge time">⏱ {project.estimated_time} min</span>}
          </div>

          {/* Progress Bar */}
          <div className="progress-section">
            <div className="progress-text">
              <span>Progress: {completedCount}/{steps.length} steps</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="progress-bar-track">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="learning-content">
        <div className="container">
          {message && (
            <div className={`message message-${message.type}`} style={{marginBottom: '20px'}}>
              {message.text}
            </div>
          )}

          {isSimpleProject ? (
            // SIMPLE PROJECT LAYOUT: All steps visible at once
            <div className="simple-learning-layout">
              {steps.map((step, index) => {
                const status = getStepStatus(step.id)
                const images = parseImages(step.images)

                return (
                  <Card key={step.id} className={`step-card ${status === 'approved' ? 'completed-step-card' : ''}`} style={{marginBottom: '24px'}}>
                    <div className="step-header">
                      <h2>Step {index + 1}: {step.title}</h2>
                      {status === 'approved' && (
                        <span className="status-badge" style={{ backgroundColor: '#d4edda', color: '#28a745' }}>✓ Completed</span>
                      )}
                    </div>
                    
                    <div className="section">
                      <h3>📝 Instructions</h3>
                      <div className="explanation-text">{step.explanation}</div>
                    </div>

                    {images.length > 0 && (
                      <div className="section">
                        <h3>📸 Reference Images</h3>
                        <div className="step-images">
                          {images.map((img, i) => (
                            <img key={i} src={resolveAssetUrl(img)} alt={`Step ${index + 1} reference ${i + 1}`} className="step-image" />
                          ))}
                        </div>
                      </div>
                    )}

                    {step.code_snippet && (
                      <div className="section">
                        <h3>💻 Code Reference</h3>
                        <pre className="code-block"><code>{step.code_snippet}</code></pre>
                      </div>
                    )}

                    {step.expected_output && (
                      <div className="section">
                        <h3>📋 Expected Output</h3>
                        <div className="output-block">{step.expected_output}</div>
                      </div>
                    )}

                    {step.hints && (
                      <div className="section hints-section">
                        <h3>💡 Hints</h3>
                        <div className="hints-text">{step.hints}</div>
                      </div>
                    )}

                    <div className="step-actions" style={{justifyContent: 'flex-end'}}>
                      {status !== 'approved' && (
                        <Button 
                          variant="primary" 
                          onClick={() => handleSimpleComplete(step.id)}
                          disabled={submitting}
                        >
                          {submitting ? 'Completing...' : '✓ Mark as Completed'}
                        </Button>
                      )}
                    </div>
                  </Card>
                )
              })}
              {steps.length === 0 && (
                <Card><p>No steps available for this project.</p></Card>
              )}
            </div>
          ) : (
            // MAIN PROJECT LAYOUT: Sidebar + Single Step
            <div className="learning-layout">
              <div className="steps-sidebar">
                <Card>
                  <h3>Steps</h3>
                  <div className="steps-list">
                    {steps.map((step, index) => {
                      const status = getStepStatus(step.id)
                      const accessible = isStepAccessible(index)
                      
                      return (
                        <button
                          key={step.id}
                          className={`step-item ${index === currentStepIndex ? 'active' : ''} ${!accessible ? 'locked' : ''}`}
                          onClick={() => accessible && setCurrentStepIndex(index)}
                          disabled={!accessible}
                        >
                          <div className="step-number">
                            {status === 'approved' ? '✓' : 
                             status === 'pending' ? '⏳' :
                             status === 'rejected' ? '✗' :
                             !accessible ? '🔒' :
                             index + 1}
                          </div>
                          <div className="step-item-info">
                            <div className="step-item-title">{step.title}</div>
                            {status && (
                              <div className={`step-item-status status-${status}`}>
                                {status}
                              </div>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                </Card>
              </div>

              <div className="step-content-area">
                {currentStep ? (
                  <Card className="step-card">
                    <div className="step-header">
                      <h2>Step {currentStepIndex + 1}: {currentStep.title}</h2>
                      {currentStepStatus && getStatusBadge(currentStepStatus)}
                    </div>
                    
                    <div className="section">
                      <h3>📝 Instructions</h3>
                      <div className="explanation-text">
                        {currentStep.explanation || 'Follow the instructions to complete this step.'}
                      </div>
                    </div>

                    {parseImages(currentStep.images).length > 0 && (
                      <div className="section">
                        <h3>📸 Reference Images</h3>
                        <div className="step-images">
                          {parseImages(currentStep.images).map((img, i) => (
                            <img key={i} src={resolveAssetUrl(img)} alt={`Step ${currentStepIndex + 1} reference ${i + 1}`} className="step-image" />
                          ))}
                        </div>
                      </div>
                    )}

                    {currentStep.code_snippet && (
                      <div className="section">
                        <h3>💻 Code Reference</h3>
                        <pre className="code-block">
                          <code>{currentStep.code_snippet}</code>
                        </pre>
                      </div>
                    )}

                    {currentStep.expected_output && (
                      <div className="section">
                        <h3>📋 Expected Output</h3>
                        <div className="output-block">
                          {currentStep.expected_output}
                        </div>
                      </div>
                    )}

                    {currentStep.hints && (
                      <div className="section hints-section">
                        <h3>💡 Hints</h3>
                        <div className="hints-text">{currentStep.hints}</div>
                      </div>
                    )}

                    {currentStepStatus === 'rejected' && (
                      <div className="section feedback-section">
                        <h3>📣 Coordinator Feedback</h3>
                        <div className="feedback-text">
                          {userProgress.find(p => p.step_id === currentStep.id)?.feedback || 'No feedback provided. Please rework this step and re-submit.'}
                        </div>
                      </div>
                    )}

                    <div className="step-actions">
                      <Button 
                        variant="secondary" 
                        onClick={() => setCurrentStepIndex(Math.max(0, currentStepIndex - 1))}
                        disabled={currentStepIndex === 0}
                      >
                        ← Previous
                      </Button>
                      
                      <div className="primary-actions">
                        {(!currentStepStatus || currentStepStatus === 'rejected') && (
                          <Button 
                            variant="primary" 
                            onClick={handleMainSubmit}
                            disabled={submitting || !isStepAccessible(currentStepIndex)}
                          >
                            {submitting ? 'Submitting...' : '📤 Mark as Completed'}
                          </Button>
                        )}

                        {currentStepStatus === 'pending' && (
                          <Button variant="secondary" disabled>
                            ⏳ Waiting for Approval
                          </Button>
                        )}

                        {currentStepStatus === 'approved' && currentStepIndex < steps.length - 1 && (
                          <Button 
                            variant="primary" 
                            onClick={() => setCurrentStepIndex(currentStepIndex + 1)}
                          >
                            Next Step →
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ) : (
                  <Card>
                    <p>No steps available for this project.</p>
                  </Card>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        .guided-learning {
          min-height: 100vh;
          background-color: #f8f9fa;
        }

        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 0 20px;
        }

        .learning-header {
          background: white;
          border-bottom: 1px solid #eee;
          padding: 20px 0 24px;
          margin-bottom: 30px;
        }

        .header-top {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
        }

        .project-type-badge {
          padding: 6px 14px;
          border-radius: 20px;
          font-size: 13px;
          font-weight: 600;
        }

        .learning-header h1 {
          font-size: 28px;
          color: #333;
          margin-bottom: 8px;
        }

        .project-desc {
          color: #666;
          margin-bottom: 14px;
        }

        .project-meta {
          display: flex;
          gap: 8px;
          margin-bottom: 20px;
        }

        .meta-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 600;
        }

        .meta-badge.level { background: #e3f2fd; color: #1565c0; }
        .meta-badge.difficulty { background: #fff3cd; color: #856404; }
        .meta-badge.time { background: #f3e5f5; color: #7b1fa2; }

        .progress-section { margin-top: 10px; }

        .progress-text {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
          color: #666;
          margin-bottom: 6px;
        }

        .progress-bar-track {
          height: 8px;
          background: #e9ecef;
          border-radius: 4px;
          overflow: hidden;
        }

        .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #667eea, #764ba2);
          border-radius: 4px;
          transition: width 0.5s ease;
        }

        .learning-layout {
          display: grid;
          grid-template-columns: 280px 1fr;
          gap: 24px;
          align-items: start;
        }

        .steps-sidebar h3 {
          margin-bottom: 16px;
          font-size: 16px;
          color: #333;
        }

        .steps-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .step-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 12px;
          border: none;
          background: transparent;
          border-radius: 8px;
          cursor: pointer;
          text-align: left;
          transition: all 0.2s;
          width: 100%;
        }

        .step-item:hover:not(.locked) {
          background: #f0f0f0;
        }

        .step-item.active {
          background: #e3f2fd;
          border-left: 3px solid #1565c0;
        }

        .step-item.locked {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .step-number {
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: #e9ecef;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 13px;
          font-weight: 600;
          color: #666;
          flex-shrink: 0;
        }

        .step-item.active .step-number {
          background: #1565c0;
          color: white;
        }

        .step-item-info {
          flex: 1;
          min-width: 0;
        }

        .step-item-title {
          font-size: 13px;
          font-weight: 500;
          color: #333;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .step-item-status {
          font-size: 10px;
          font-weight: 600;
          text-transform: uppercase;
          margin-top: 2px;
        }

        .step-item-status.status-approved { color: #28a745; }
        .step-item-status.status-pending { color: #ffc107; }
        .step-item-status.status-rejected { color: #dc3545; }

        .step-card {
          padding: 24px;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 20px;
          flex-wrap: wrap;
          gap: 10px;
        }

        .step-header h2 {
          font-size: 20px;
          color: #333;
          margin: 0;
        }

        .status-badge {
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 600;
        }

        .message {
          padding: 12px 16px;
          border-radius: 8px;
          margin-bottom: 20px;
          font-size: 14px;
        }

        .message-success { background: #d4edda; color: #155724; }
        .message-error { background: #f8d7da; color: #721c24; }
        .message-info { background: #cce5ff; color: #004085; }

        .section {
          margin-bottom: 24px;
        }

        .section h3 {
          font-size: 16px;
          color: #333;
          margin-bottom: 10px;
        }

        .explanation-text {
          color: #555;
          line-height: 1.7;
          white-space: pre-wrap;
        }

        .code-block {
          background: #1e1e1e;
          color: #d4d4d4;
          padding: 16px;
          border-radius: 8px;
          overflow-x: auto;
          font-family: 'Courier New', monospace;
          font-size: 13px;
          line-height: 1.5;
        }

        .output-block {
          background: #f8f9fa;
          border: 1px solid #dee2e6;
          padding: 14px;
          border-radius: 8px;
          font-family: monospace;
          font-size: 13px;
          white-space: pre-wrap;
          color: #333;
        }

        .hints-section {
          background: #fffde7;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #fff9c4;
        }

        .hints-text {
          color: #827717;
          line-height: 1.6;
        }

        .feedback-section {
          background: #fce4ec;
          padding: 16px;
          border-radius: 8px;
          border: 1px solid #f8bbd0;
        }

        .feedback-text {
          color: #c62828;
          line-height: 1.6;
        }

        .step-actions {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 24px;
          padding-top: 20px;
          border-top: 1px solid #eee;
        }

        .primary-actions {
          display: flex;
          gap: 8px;
        }

        .not-found {
          text-align: center;
          padding: 60px 20px;
        }

        @media (max-width: 768px) {
          .learning-layout {
            grid-template-columns: 1fr;
          }

          .step-actions {
            flex-direction: column;
            gap: 10px;
          }

          .header-top {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }

        .simple-learning-layout {
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .completed-step-card {
          border: 1px solid #c3e6cb;
          background-color: #f9fdfa;
        }

        .step-images {
          display: flex;
          flex-wrap: wrap;
          gap: 16px;
          margin-top: 10px;
        }

        .step-image {
          max-width: 100%;
          border-radius: 8px;
          border: 1px solid #ddd;
          box-shadow: 0 2px 4px rgba(0,0,0,0.05);
        }

        @media (min-width: 768px) {
          .step-image {
            max-width: 48%;
          }
        }
      `}</style>
    </div>
  )
}

export default GuidedLearningPage
