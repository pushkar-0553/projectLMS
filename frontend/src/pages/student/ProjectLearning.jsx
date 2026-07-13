import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { projectAPI, resolveAssetUrl } from '../../services/api'
import Button from '../../components/common/Button'
import { BookOpen, Target, Clock, ChevronRight, Filter, Search, Award, Info, Activity } from 'lucide-react'

const ProjectLearning = () => {
  const { user } = useAuth()
  const isCoordinator = user?.role === 'coordinator'
  const [activeTab, setActiveTab] = useState('main')
  const [projects, setProjects] = useState([])
  const [currentProgress, setCurrentProgress] = useState(null)
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchProjects()
    fetchCurrentProgress()
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

  const fetchCurrentProgress = async () => {
    try {
      const response = await projectAPI.resumeLearning()
      setCurrentProgress(response.data)
    } catch (error) {
      console.error('Failed to fetch current progress:', error)
    }
  }

  const filteredProjects = projects.filter(p => {
    const matchesTab = (p.type || 'main') === activeTab
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesTab && matchesSearch
  })

  const getLevelTitle = (level) => {
    const titles = { 1: 'Beginner', 2: 'Elementary', 3: 'Intermediate', 4: 'Advanced', 5: 'Expert' }
    return titles[level] || `Level ${level}`
  }

  const getLevelColorClass = (level) => {
    const classes = { 1: 'badge-success', 2: 'badge-primary', 3: 'badge-warning', 4: 'badge-danger', 5: 'badge-danger' }
    return classes[level] || 'badge-secondary'
  }

  if (loading) {
    return (
      <div className="loader-container">
        <div className="spinner"></div>
      </div>
    )
  }

  const groupedProjects = filteredProjects.reduce((acc, project) => {
    const level = project.level
    if (!acc[level]) acc[level] = []
    acc[level].push(project)
    return acc
  }, {})

  return (
    <div className="project-learning fade-in">
      <header className="page-header-modern">
        <div className="container">
          <div className="flex-between flex-wrap gap-6">
            <div className="header-left">
              <span className="badge badge-primary mb-2">Curriculum</span>
              <h1 className="header-title-modern">Project Learning</h1>
              <p className="text-muted">Master skills by building real-world applications.</p>
            </div>
            
            <div className="type-switcher shadow-soft">
              <button 
                className={`switch-btn ${activeTab === 'main' ? 'active indigo' : ''}`}
                onClick={() => setActiveTab('main')}
              >
                <Target className="icon-sm" /> Main Projects
              </button>
              <button 
                className={`switch-btn ${activeTab === 'simple' ? 'active emerald' : ''}`}
                onClick={() => setActiveTab('simple')}
              >
                <BookOpen className="icon-sm" /> Simple Projects
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="container main-content-modern">
        {/* Active Learning Banner — hidden for coordinators */}
        {!isCoordinator && activeTab === 'main' && currentProgress && currentProgress.type !== 'all_completed' && (
          <div className="card active-learning-banner mb-10 shadow-md slide-up">
            <div className="flex-between flex-wrap gap-6">
              <div className="banner-info">
                <div className="flex-center gap-3 mb-3">
                  <div className="pulse-icon"><Activity className="text-white" /></div>
                  <h3 className="text-white font-bold text-xl">Resume your progress</h3>
                </div>
                <h4 className="text-indigo-100 font-bold mb-1">{currentProgress.project?.title}</h4>
                <p className="text-indigo-200 text-sm">{currentProgress.message}</p>
              </div>
              <Link to={currentProgress.project ? `/guided-learning/${currentProgress.project.id}` : '/project-learning'}>
                <Button variant="glass" className="btn-lg">
                  Continue Learning <ChevronRight className="icon-xs ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Filters & Search */}
        <div className="flex-between mb-8 gap-4 flex-wrap">
          <div className="info-badge shadow-sm">
            <Info className="icon-sm text-primary" />
            <span className="text-xs">
              {activeTab === 'main' 
                ? "Coordinators must approve each step of Main Projects." 
                : "Simple Projects are self-paced with no approval required."}
            </span>
          </div>
          <div className="search-wrapper shadow-sm">
            <Search className="search-icon" />
            <input 
              type="text" 
              placeholder="Search projects..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Project Sections */}
        {Object.keys(groupedProjects).length === 0 ? (
          <div className="card text-center py-20 border-dashed shadow-none">
             <Filter className="icon-xl text-muted mx-auto mb-4 opacity-20" />
             <h3 className="text-muted">No projects found for your criteria</h3>
          </div>
        ) : (
          Object.entries(groupedProjects).map(([level, levelProjects]) => (
            <div key={level} className="level-section-modern mb-12">
              <div className="flex-center gap-3 mb-6">
                 <div className="level-line"></div>
                 <h2 className="level-label-modern">{getLevelTitle(level)}</h2>
                 <div className="level-line"></div>
              </div>

              <div className="projects-grid-modern">
                {levelProjects.map((project) => (
                  <div key={project.id} className="card project-item-card hover-lift">
                    {project.thumbnail && (
                      <div className="project-card-image-wrapper" style={{ height: '160px', margin: '-1.5rem -1.5rem 1.25rem -1.5rem', overflow: 'hidden', borderTopLeftRadius: '1.25rem', borderTopRightRadius: '1.25rem' }}>
                        <img src={resolveAssetUrl(project.thumbnail)} alt={project.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      </div>
                    )}
                    <div className="project-card-top flex-between mb-4">
                       <span className={`badge ${getLevelColorClass(level)}`}>{getLevelTitle(level)}</span>
                       <div className="flex gap-2">
                         <span className="text-xs text-muted flex-center gap-1">
                           <Clock className="icon-xs" /> {project.estimated_time || 60}m
                         </span>
                       </div>
                    </div>
                    
                    <h3 className="project-title-modern">{project.title}</h3>
                    <p className="project-desc-modern line-clamp-3">
                      {project.description || "No description provided for this project."}
                    </p>
                    
                    <div className="project-card-footer mt-auto pt-6 border-t flex-between">
                       <div className="trainer-info">
                          <span className="text-xs text-muted block">Trainer</span>
                          <span className="text-sm font-bold">{project.trainer || "Guided"}</span>
                       </div>
                       {!isCoordinator && (
                         <Link to={`/guided-learning/${project.id}`}>
                            <Button variant={activeTab === 'simple' ? 'success' : 'primary'} size="small">
                               {activeTab === 'simple' ? 'Start Learning' : 'Start Project'}
                            </Button>
                         </Link>
                       )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </main>

      <style>{`
        .project-learning {
          background-color: #f8fafc;
          min-height: 100vh;
          padding-bottom: 5rem;
        }

        .page-header-modern {
          background: white;
          padding: 3.5rem 0;
          border-bottom: 1px solid #e2e8f0;
          margin-bottom: 3rem;
        }

        .header-title-modern {
          font-size: 2.25rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -0.025em;
          margin: 0.5rem 0;
        }

        .type-switcher {
          background: #f1f5f9;
          padding: 0.375rem;
          border-radius: 1rem;
          display: flex;
          gap: 0.25rem;
        }

        .switch-btn {
          display: flex;
          align-items: center;
          gap: 0.625rem;
          padding: 0.625rem 1.25rem;
          border-radius: 0.75rem;
          border: none;
          background: transparent;
          color: #64748b;
          font-size: 0.875rem;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .switch-btn.active.indigo { background: #4f46e5; color: white; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2); }
        .switch-btn.active.emerald { background: #10b981; color: white; box-shadow: 0 4px 6px -1px rgba(16, 185, 129, 0.2); }

        .active-learning-banner {
          background: linear-gradient(135deg, #6366f1 0%, #4f46e5 100%);
          padding: 2.5rem;
          border: none;
        }

        .pulse-icon {
          width: 40px;
          height: 40px;
          background: rgba(255, 255, 255, 0.2);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0.4); }
          70% { box-shadow: 0 0 0 10px rgba(255, 255, 255, 0); }
          100% { box-shadow: 0 0 0 0 rgba(255, 255, 255, 0); }
        }

        .info-badge {
          background: #eef2ff;
          padding: 0.5rem 1rem;
          border-radius: 9999px;
          display: flex;
          align-items: center;
          gap: 0.5rem;
          color: #4f46e5;
        }

        .search-wrapper {
          position: relative;
          width: 300px;
        }

        .search-wrapper input {
          width: 100%;
          padding: 0.625rem 1rem 0.625rem 2.5rem;
          border: 1px solid #e2e8f0;
          border-radius: 9999px;
          font-size: 0.875rem;
          outline: none;
          transition: all 0.2s;
        }

        .search-wrapper input:focus { border-color: #4f46e5; box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1); }
        .search-icon { position: absolute; left: 0.875rem; top: 50%; transform: translateY(-50%); color: #94a3b8; width: 16px; height: 16px; }

        .level-section-modern { position: relative; }
        .level-line { flex: 1; height: 1px; background: #e2e8f0; }
        .level-label-modern { font-size: 0.875rem; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.1em; }

        .projects-grid-modern {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
          gap: 2rem;
        }

        .project-item-card {
           display: flex;
           flex-direction: column;
           height: 100%;
           border: 1px solid #f1f5f9;
        }

        .project-title-modern { font-size: 1.25rem; font-weight: 700; color: #0f172a; margin-bottom: 0.75rem; line-height: 1.3; }
        .project-desc-modern { font-size: 0.875rem; color: #64748b; line-height: 1.6; margin-bottom: 1.5rem; }

        .line-clamp-3 { display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
        .icon-xl { width: 48px; height: 48px; }
        .border-t { border-top: 1px solid #f1f5f9; }

        @media (max-width: 768px) {
          .header-content-modern { flex-direction: column; align-items: flex-start; }
          .search-wrapper { width: 100%; }
        }
      `}</style>
    </div>
  )
}

export default ProjectLearning
