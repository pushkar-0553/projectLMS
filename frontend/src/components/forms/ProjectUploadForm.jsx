import React, { useState } from 'react'
import { projectAPI } from '../../services/api'
import Button from '../common/Button'
import Card from '../common/Card'

const ProjectUploadForm = ({ onProjectUploaded, onCancel }) => {
  const [formData, setFormData] = useState({
    title: '',
    level: 1,
    type: 'main',
    description: '',
    trainer: '',
    duration: '',
    difficulty: 'Medium',
    estimatedTime: 60,
    orderIndex: 0,
    prerequisites: [],
    thumbnail: null,
    steps: [
      {
        title: '',
        explanation: '',
        code_snippet: '',
        expected_output: '',
        hints: '',
        images: []
      }
    ]
  })
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      // Validate file size (10MB limit)
      if (file.size > 10 * 1024 * 1024) {
        setError('File size must be less than 10MB')
        return
      }
      
      // Validate file type
      const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif']
      if (!allowedTypes.includes(file.type)) {
        setError('Only JPG, PNG, and GIF images are allowed')
        return
      }
      
      setFormData(prev => ({
        ...prev,
        thumbnail: file
      }))
      setError('')
    }
  }

  const handleStepChange = (index, field, value) => {
    const newSteps = [...formData.steps]
    newSteps[index][field] = value
    setFormData(prev => ({
      ...prev,
      steps: newSteps
    }))
  }

  const handleStepFileChange = (index, e) => {
    const files = Array.from(e.target.files)
    
    // Validate sizes and types
    const validFiles = files.filter(file => {
      const isValidSize = file.size <= 10 * 1024 * 1024
      const isValidType = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'].includes(file.type)
      return isValidSize && isValidType
    })
    
    if (validFiles.length !== files.length) {
      setError('Some files were rejected. Only JPG, PNG, GIF under 10MB are allowed.')
    }
    
    const newSteps = [...formData.steps]
    newSteps[index].images = validFiles
    setFormData(prev => ({
      ...prev,
      steps: newSteps
    }))
  }

  const addStep = () => {
    setFormData(prev => ({
      ...prev,
      steps: [
        ...prev.steps,
        {
          title: '',
          explanation: '',
          code_snippet: '',
          expected_output: '',
          hints: '',
          images: []
        }
      ]
    }))
  }

  const removeStep = (index) => {
    if (formData.steps.length > 1) {
      const newSteps = formData.steps.filter((_, i) => i !== index)
      setFormData(prev => ({
        ...prev,
        steps: newSteps
      }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    try {
      console.log('Submitting form data:', formData)

      // Validate required fields
      if (!formData.title || !formData.description) {
        setError('Title and description are required')
        setLoading(false)
        return
      }

      // Validate steps
      const validSteps = formData.steps.filter(step => step.title.trim())
      if (validSteps.length === 0) {
        setError('At least one step with a title is required')
        setLoading(false)
        return
      }

      // Create FormData for file upload
      const submitData = new FormData()
      submitData.append('title', formData.title)
      submitData.append('level', formData.level)
      submitData.append('type', formData.type)
      submitData.append('description', formData.description)
      submitData.append('difficulty', formData.difficulty)
      submitData.append('estimatedTime', formData.estimatedTime)
      submitData.append('orderIndex', formData.orderIndex)
      submitData.append('trainer', formData.trainer)
      submitData.append('duration', formData.duration)
      
      if (formData.thumbnail) {
        submitData.append('thumbnail', formData.thumbnail)
      }
      
      // Append step files to FormData
      validSteps.forEach((step, index) => {
        if (step.images && step.images.length > 0) {
          step.images.forEach(file => {
            submitData.append(`step_images_${index}`, file)
          })
        }
      })
      
      // Clean up the JSON steps array to not include raw File objects
      const stepsForJson = validSteps.map(step => {
        const { images, ...rest } = step
        return rest
      })

      submitData.append('steps', JSON.stringify(stepsForJson))

      console.log('Sending FormData:', submitData)

      // Use the updated projectAPI
      const result = await projectAPI.createProject(submitData)
      console.log('Upload response:', result)

      alert('Project uploaded successfully!')
      onProjectUploaded()
      
    } catch (error) {
      console.error('Upload error:', error)
      setError(error.message || 'Failed to upload project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="upload-form-card">
      <h2>Upload New Project</h2>
      <form onSubmit={handleSubmit} className="upload-form">
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {/* Basic Project Information */}
        <div className="form-section">
          <h3>Basic Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Project Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="form-control"
                required
              />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>Project Type *</label>
              <select
                name="type"
                value={formData.type}
                onChange={handleInputChange}
                className="form-control"
                required
              >
                <option value="main">Main Project (Guided + Approval)</option>
                <option value="simple">Simple Project (Self Learning)</option>
              </select>
            </div>
            <div className="form-group">
              <label>Level *</label>
              <select
                name="level"
                value={formData.level}
                onChange={handleInputChange}
                className="form-control"
                required
              >
                <option value={1}>Level 1 - Beginner</option>
                <option value={2}>Level 2 - Elementary</option>
                <option value={3}>Level 3 - Intermediate</option>
                <option value={4}>Level 4 - Advanced</option>
                <option value={5}>Level 5 - Expert</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Difficulty</label>
              <select
                name="difficulty"
                value={formData.difficulty}
                onChange={handleInputChange}
                className="form-control"
              >
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </div>
            <div className="form-group">
              <label>Estimated Time (minutes)</label>
              <input
                type="number"
                name="estimatedTime"
                value={formData.estimatedTime}
                onChange={handleInputChange}
                className="form-control"
                min="1"
                max="600"
              />
            </div>
          </div>
          
          <div className="form-row">
            <div className="form-group">
              <label>Order Index</label>
              <input
                type="number"
                name="orderIndex"
                value={formData.orderIndex}
                onChange={handleInputChange}
                className="form-control"
                min="0"
              />
            </div>
            <div className="form-group">
              <label>Trainer Name</label>
              <input
                type="text"
                name="trainer"
                value={formData.trainer}
                onChange={handleInputChange}
                className="form-control"
              />
            </div>
          </div>
          
          <div className="form-group">
            <label>Description *</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              className="form-control"
              rows={4}
              required
            />
          </div>

          <div className="form-group">
            <label>Duration</label>
            <input
              type="text"
              name="duration"
              value={formData.duration}
              onChange={handleInputChange}
              className="form-control"
              placeholder="e.g., 8 weeks"
            />
          </div>

          <div className="form-group">
            <label>Thumbnail Image</label>
            <input
              type="file"
              onChange={handleFileChange}
              className="form-control"
              accept="image/jpeg,image/jpg,image/png,image/gif"
            />
            {formData.thumbnail && (
              <div className="file-preview">
                Selected: {formData.thumbnail.name}
              </div>
            )}
          </div>
        </div>

        {/* Learning Steps */}
        <div className="form-section">
          <h3>Learning Steps</h3>
          {formData.steps.map((step, index) => (
            <div key={index} className="step-card">
              <div className="step-header">
                <h4>Step {index + 1}</h4>
                {formData.steps.length > 1 && (
                  <button
                    type="button"
                    className="remove-step-btn"
                    onClick={() => removeStep(index)}
                  >
                    Remove
                  </button>
                )}
              </div>
              
              <div className="form-group">
                <label>Step Title *</label>
                <input
                  type="text"
                  value={step.title}
                  onChange={(e) => handleStepChange(index, 'title', e.target.value)}
                  className="form-control"
                  placeholder="e.g., Introduction to React"
                />
              </div>

              <div className="form-group">
                <label>Explanation</label>
                <textarea
                  value={step.explanation}
                  onChange={(e) => handleStepChange(index, 'explanation', e.target.value)}
                  className="form-control"
                  rows={3}
                  placeholder="Explain what the student will learn in this step"
                />
              </div>

              <div className="form-group">
                <label>Code Snippet (Optional)</label>
                <textarea
                  value={step.code_snippet}
                  onChange={(e) => handleStepChange(index, 'code_snippet', e.target.value)}
                  className="form-control code-snippet"
                  rows={5}
                  placeholder="Paste code examples here"
                />
              </div>

              <div className="form-group">
                <label>Step Images / Screenshots (Optional)</label>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/jpg,image/png,image/gif"
                  onChange={(e) => handleStepFileChange(index, e)}
                  className="form-control"
                />
                {step.images && step.images.length > 0 && (
                  <div className="file-preview">
                    Selected {step.images.length} image(s)
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Expected Output</label>
                <textarea
                  value={step.expected_output}
                  onChange={(e) => handleStepChange(index, 'expected_output', e.target.value)}
                  className="form-control"
                  rows={3}
                  placeholder="What should the code output when run?"
                />
              </div>

              <div className="form-group">
                <label>Hints (Optional)</label>
                <textarea
                  value={step.hints}
                  onChange={(e) => handleStepChange(index, 'hints', e.target.value)}
                  className="form-control"
                  rows={3}
                  placeholder="Provide hints to help students solve this step"
                />
              </div>
            </div>
          ))}
          
          <button
            type="button"
            className="add-step-btn"
            onClick={addStep}
          >
            + Add Another Step
          </button>
        </div>

        <div className="form-actions">
          <Button type="submit" variant="primary" disabled={loading}>
            {loading ? 'Uploading...' : 'Upload Project'}
          </Button>
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </form>

      <style>{`
        .upload-form-card h2 {
          margin-bottom: 20px;
          color: #333;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 20px;
          border: 1px solid #f5c6cb;
        }

        .form-section {
          margin-bottom: 30px;
          padding: 20px;
          background: #f8f9fa;
          border-radius: 8px;
        }

        .form-section h3 {
          margin-bottom: 20px;
          color: #333;
          font-size: 18px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 20px;
        }

        .form-group {
          margin-bottom: 20px;
        }

        .form-group label {
          display: block;
          margin-bottom: 5px;
          font-weight: 500;
          color: #333;
        }

        .form-control {
          width: 100%;
          padding: 10px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-control:focus {
          outline: none;
          border-color: #007bff;
          box-shadow: 0 0 0 2px rgba(0,123,255,0.25);
        }

        .code-snippet {
          font-family: 'Courier New', monospace;
          font-size: 13px;
        }

        .file-preview {
          margin-top: 5px;
          font-size: 12px;
          color: #666;
        }

        .step-card {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          border: 1px solid #ddd;
        }

        .step-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 15px;
        }

        .step-header h4 {
          margin: 0;
          color: #333;
        }

        .remove-step-btn {
          background: #dc3545;
          color: white;
          border: none;
          padding: 5px 10px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 12px;
        }

        .remove-step-btn:hover {
          background: #c82333;
        }

        .add-step-btn {
          background: #28a745;
          color: white;
          border: none;
          padding: 10px 20px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          margin-top: 10px;
        }

        .add-step-btn:hover {
          background: #218838;
        }

        .form-actions {
          display: flex;
          gap: 10px;
        }

        @media (max-width: 768px) {
          .form-row {
            grid-template-columns: 1fr;
          }

          .step-header {
            flex-direction: column;
            align-items: flex-start;
            gap: 10px;
          }
        }
      `}</style>
    </Card>
  )
}

export default ProjectUploadForm
