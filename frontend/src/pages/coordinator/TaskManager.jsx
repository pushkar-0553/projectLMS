import React, { useState, useEffect } from 'react';
import { coordinatorAPI, adminAPI } from '../../services/api';
import { 
  ClipboardList, Plus, Target, Users, Calendar, 
  FileText, Send, CheckCircle2, Clock, Briefcase, 
  Filter, Search, Info, MoreVertical, LayoutGrid, List
} from 'lucide-react';
import Button from '../../components/common/Button';

const TaskManager = () => {
  const [tasks, setTasks] = useState([]);
  const [batches, setBatches] = useState([]);
  const [subBatches, setSubBatches] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  
  const [newTask, setNewTask] = useState({ 
    title: '', description: '', assigned_type: 'batch', deadline: '' 
  });
  
  const [assignment, setAssignment] = useState({ 
    taskId: '', batchId: '', subBatchId: '', studentId: '' 
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [tasksRes, batchesRes, subRes, studentsRes] = await Promise.all([
        coordinatorAPI.getMyTasks(),
        adminAPI.getBatches(),
        coordinatorAPI.getMySubBatches(),
        adminAPI.getStudents()
      ]);
      setTasks(tasksRes.data);
      setBatches(batchesRes.data);
      setSubBatches(subRes.data);
      setStudents(studentsRes.data);
    } catch (err) {
      console.error('Failed to fetch tasks data', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    try {
      await coordinatorAPI.createTask(newTask);
      setShowCreateModal(false);
      setNewTask({ title: '', description: '', assigned_type: 'batch', deadline: '' });
      fetchData();
    } catch (err) {
      alert('Failed to create task');
    }
  };

  const handleAssignTask = async (e) => {
    e.preventDefault();
    try {
      if (!assignment.batchId && !assignment.subBatchId && !assignment.studentId) {
        alert('Please select a target group or student');
        return;
      }
      await coordinatorAPI.assignTask(assignment);
      setShowAssignModal(false);
      setAssignment({ taskId: '', batchId: '', subBatchId: '', studentId: '' });
      fetchData();
    } catch (err) {
      alert('Failed to assign task');
    }
  };

  return (
    <div className="task-manager-hub fade-in">
      {/* Background Decorations */}
      <div className="bg-glow-1"></div>
      <div className="bg-glow-2"></div>

      <header className="hub-header">
        <div className="header-glass">
            <div className="header-main">
                <div className="title-group">
                    <div className="hub-badge">Operations Center</div>
                    <h1>Task Orchestration Hub</h1>
                    <p>Design institutional modules and manage pedagogical distribution across learning sub-groups.</p>
                </div>
                <div className="action-group">
                    <div className="view-toggle">
                        <button 
                            className={`toggle-btn ${viewMode === 'grid' ? 'active' : ''}`}
                            onClick={() => setViewMode('grid')}
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            className={`toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
                            onClick={() => setViewMode('list')}
                        >
                            <List size={18} />
                        </button>
                    </div>
                    <button className="primary-glass-btn" onClick={() => setShowCreateModal(true)}>
                        <Plus size={20} />
                        <span>Craft New Module</span>
                    </button>
                </div>
            </div>
        </div>
      </header>

      <main className="hub-content">
        <div className="quick-access-strip">
            <div className="q-card">
                <div className="q-icon blue"><ClipboardList size={22} /></div>
                <div className="q-data">
                    <span className="q-label">Active Modules</span>
                    <span className="q-value">{tasks.length}</span>
                </div>
            </div>
            <div className="q-card">
                <div className="q-icon emerald"><Target size={22} /></div>
                <div className="q-data">
                    <span className="q-label">Current Enrollment</span>
                    <span className="q-value">{tasks.reduce((acc, t) => acc + t.assignment_count, 0)}</span>
                </div>
            </div>
            <div className="q-card">
                <div className="q-icon indigo"><Clock size={22} /></div>
                <div className="q-data">
                    <span className="q-label">Total Submissions</span>
                    <span className="q-value">{tasks.reduce((acc, t) => acc + t.submission_count, 0)}</span>
                </div>
            </div>
        </div>

        <section className="inventory-section">
            <div className="section-meta">
                <h2>Task Inventory</h2>
                <div className="filter-shelf">
                    <div className="search-pill">
                        <Search size={16} />
                        <input type="text" placeholder="Search modules..." />
                    </div>
                </div>
            </div>

            {loading ? (
                <div className="hub-loader">
                    <div className="pulse-ring"></div>
                    <span>Syncing Inventory...</span>
                </div>
            ) : tasks.length === 0 ? (
                <div className="hub-empty-state">
                    <div className="empty-gfx">
                        <ClipboardList size={64} />
                    </div>
                    <h3>Curriculum is Empty</h3>
                    <p>You haven't initialized any training modules yet. Start by crafting a new task for your students.</p>
                    <button className="empty-action-btn" onClick={() => setShowCreateModal(true)}>
                        <Plus size={18} /> Get Started
                    </button>
                </div>
            ) : viewMode === 'grid' ? (
                <div className="task-grid">
                    {tasks.map(task => (
                        <div key={task.id} className="task-tile shadow-sm">
                            <div className="tile-top">
                                <div className="tile-category">Mod: {task.id}</div>
                                <button className="tile-more-btn"><MoreVertical size={16} /></button>
                            </div>
                            <div className="tile-body">
                                <h3>{task.title}</h3>
                                <p>{task.description}</p>
                            </div>
                            <div className="tile-metrics">
                                <div className="metric">
                                    <Users size={14} />
                                    <span>{task.assignment_count} Enrolled</span>
                                </div>
                                <div className="metric">
                                    <Clock size={14} />
                                    <span>{task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No Limit'}</span>
                                </div>
                            </div>
                            <div className="tile-footer">
                                <div className="submission-count">
                                    <div className="sub-dots">
                                        <div className="dot active"></div>
                                        <div className="dot"></div>
                                        <div className="dot"></div>
                                    </div>
                                    <span>{task.submission_count} Submitted</span>
                                </div>
                                <button 
                                    className="distribute-btn"
                                    onClick={() => {
                                        setAssignment({...assignment, taskId: task.id});
                                        setShowAssignModal(true);
                                    }}
                                >
                                    Distribute <Send size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="table-container shadow-sm border border-slate-200 bg-white rounded-3xl overflow-hidden">
                    <table className="hub-table">
                        <thead>
                            <tr>
                                <th>Module Details</th>
                                <th>Type</th>
                                <th>Deadline</th>
                                <th>Stats</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {tasks.map(task => (
                                <tr key={task.id}>
                                    <td>
                                        <div className="cell-task">
                                            <span className="t-title">{task.title}</span>
                                            <span className="t-id">ID: INSTR-0{task.id}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`type-pill ${task.assigned_type}`}>
                                            {task.assigned_type}
                                        </span>
                                    </td>
                                    <td>{task.deadline ? new Date(task.deadline).toLocaleDateString() : '--'}</td>
                                    <td>
                                        <div className="cell-stats">
                                            <span>Sub: {task.submission_count}</span>
                                            <span>Reg: {task.assignment_count}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <button 
                                            className="row-action-btn"
                                            onClick={() => {
                                                setAssignment({...assignment, taskId: task.id});
                                                setShowAssignModal(true);
                                            }}
                                        >
                                            <Send size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
      </main>

      {/* Modals */}
      {showCreateModal && (
        <div className="hub-modal-overlay">
            <div className="hub-modal fade-up">
                <div className="modal-top">
                    <div className="modal-icon-box orange">
                        <FileText size={24} />
                    </div>
                    <div className="modal-titles">
                        <h2>Craft Training Module</h2>
                        <p>Define pedagogical requirements and evaluation criteria.</p>
                    </div>
                    <button className="close-x" onClick={() => setShowCreateModal(false)}>×</button>
                </div>
                <form onSubmit={handleCreateTask} className="modal-form">
                    <div className="form-field">
                        <label>Institutional Title</label>
                        <input 
                            type="text" 
                            required 
                            placeholder="e.g. Full-Stack Systems Integration"
                            value={newTask.title}
                            onChange={(e) => setNewTask({...newTask, title: e.target.value})}
                        />
                    </div>
                    <div className="form-field">
                        <label>Technical Manifesto</label>
                        <textarea 
                            rows="4"
                            placeholder="Detailed instructions, resources, and expected outcomes..."
                            value={newTask.description}
                            onChange={(e) => setNewTask({...newTask, description: e.target.value})}
                        />
                    </div>
                    <div className="form-row">
                        <div className="form-field">
                            <label>Assignment Logic</label>
                            <select 
                                value={newTask.assigned_type}
                                onChange={(e) => setNewTask({...newTask, assigned_type: e.target.value})}
                            >
                                <option value="batch">Main Batch</option>
                                <option value="subbatch">Sub-Group</option>
                                <option value="student">Individual</option>
                            </select>
                        </div>
                        <div className="form-field">
                            <label>Module Deadline</label>
                            <input 
                                type="date"
                                value={newTask.deadline}
                                onChange={(e) => setNewTask({...newTask, deadline: e.target.value})}
                            />
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="action-sec" onClick={() => setShowCreateModal(false)}>Cancel</button>
                        <button type="submit" className="action-pri">Initialize Module</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {showAssignModal && (
        <div className="hub-modal-overlay">
            <div className="hub-modal fade-up mini">
                <div className="modal-top">
                    <div className="modal-icon-box blue">
                        <Send size={24} />
                    </div>
                    <div className="modal-titles">
                        <h2>Distribute Module</h2>
                        <p>Select the institutional target for this task.</p>
                    </div>
                    <button className="close-x" onClick={() => setShowAssignModal(false)}>×</button>
                </div>
                <form onSubmit={handleAssignTask} className="modal-form">
                    <div className="assignment-box">
                        <div className="info-banner">
                            <Info size={14} />
                            <span>Select exactly one pedagogical target.</span>
                        </div>
                        
                        <div className="target-select-group">
                            <div className="target-field">
                                <label>Target Batch</label>
                                <select 
                                    className="hub-select"
                                    value={assignment.batchId}
                                    onChange={(e) => setAssignment({...assignment, batchId: e.target.value, subBatchId: '', studentId: ''})}
                                >
                                    <option value="">Choose Batch...</option>
                                    {batches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                                </select>
                            </div>
                            <div className="target-separator">OR</div>
                            <div className="target-field">
                                <label>Target Sub-Batch</label>
                                <select 
                                    className="hub-select"
                                    value={assignment.subBatchId}
                                    onChange={(e) => setAssignment({...assignment, subBatchId: e.target.value, batchId: '', studentId: ''})}
                                >
                                    <option value="">Choose Sub-Batch...</option>
                                    {subBatches.map(sb => <option key={sb.id} value={sb.id}>{sb.name} ({sb.batch_name})</option>)}
                                </select>
                            </div>
                            <div className="target-separator">OR</div>
                            <div className="target-field">
                                <label>Individual Learner</label>
                                <select 
                                    className="hub-select"
                                    value={assignment.studentId}
                                    onChange={(e) => setAssignment({...assignment, studentId: e.target.value, batchId: '', subBatchId: ''})}
                                >
                                    <option value="">Choose Student...</option>
                                    {students.map(s => <option key={s.id} value={s.id}>{s.name} — {s.email}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>
                    <div className="modal-actions">
                        <button type="button" className="action-sec" onClick={() => setShowAssignModal(false)}>Back</button>
                        <button type="submit" className="action-pri distribute">Initiate Broadcast</button>
                    </div>
                </form>
            </div>
        </div>
      )}

      <style>{`
        .task-manager-hub {
            padding: 2rem;
            min-height: 100vh;
            background: #f8fafc;
            color: #0f172a;
            position: relative;
            z-index: 1;
        }

        .bg-glow-1 { position: fixed; top: -10%; right: -5%; width: 40%; height: 50%; background: radial-gradient(circle, rgba(99, 102, 241, 0.05) 0%, transparent 70%); z-index: -1; }
        .bg-glow-2 { position: fixed; bottom: -10%; left: -5%; width: 30%; height: 40%; background: radial-gradient(circle, rgba(16, 185, 129, 0.03) 0%, transparent 70%); z-index: -1; }

        /* --- Header --- */
        .hub-header { margin-bottom: 2.5rem; }
        .header-glass {
            background: rgba(255, 255, 255, 0.7);
            backdrop-filter: blur(12px);
            border: 1px solid white;
            padding: 2rem;
            border-radius: 32px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.02);
        }
        .header-main { display: flex; justify-content: space-between; align-items: center; }

        .hub-badge {
            display: inline-block;
            padding: 0.35rem 0.8rem;
            background: #f1f5f9;
            color: #475569;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            margin-bottom: 1rem;
        }
        .title-group h1 { font-size: 2.25rem; font-weight: 900; letter-spacing: -0.04em; margin-bottom: 0.5rem; }
        .title-group p { color: #64748b; font-size: 1rem; max-width: 600px; line-height: 1.5; }

        .action-group { display: flex; align-items: center; gap: 1.5rem; }
        
        .view-toggle {
            display: flex;
            background: #f1f5f9;
            padding: 0.35rem;
            border-radius: 12px;
        }
        .toggle-btn {
            width: 36px; height: 36px;
            display: flex; align-items: center; justify-content: center;
            border-radius: 8px;
            border: none;
            color: #94a3b8;
            background: transparent;
            cursor: pointer;
            transition: all 0.2s;
        }
        .toggle-btn.active { background: white; color: #0f172a; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }

        .primary-glass-btn {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            padding: 0.875rem 1.5rem;
            background: #0f172a;
            color: white;
            border: none;
            border-radius: 16px;
            font-weight: 700;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 10px 20px rgba(15, 23, 42, 0.2);
        }
        .primary-glass-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 25px rgba(15, 23, 42, 0.3); }

        /* --- Stats Strip --- */
        .quick-access-strip { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1.5rem; margin-bottom: 3rem; }
        .q-card {
            background: white;
            padding: 1.5rem;
            border-radius: 24px;
            border: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            gap: 1.25rem;
            transition: all 0.2s;
        }
        .q-card:hover { transform: scale(1.02); }
        .q-icon { width: 52px; height: 52px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .q-icon.blue { background: #eff6ff; color: #3b82f6; }
        .q-icon.emerald { background: #f0fdf4; color: #10b981; }
        .q-icon.indigo { background: #eef2ff; color: #6366f1; }
        .q-label { display: block; font-size: 0.75rem; font-weight: 700; color: #94a3b8; text-transform: uppercase; margin-bottom: 2px; }
        .q-value { display: block; font-size: 1.5rem; font-weight: 800; color: #0f172a; }

        /* --- Inventory --- */
        .section-meta { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
        .section-meta h2 { font-size: 1.5rem; font-weight: 800; letter-spacing: -0.02em; }
        
        .search-pill {
            position: relative;
            display: flex;
            align-items: center;
        }
        .search-pill input {
            padding: 0.75rem 1rem 0.75rem 2.75rem;
            background: white;
            border: 1px solid #e2e8f0;
            border-radius: 100px;
            width: 300px;
            font-size: 0.9rem;
            outline: none;
            transition: all 0.2s;
        }
        .search-pill input:focus { border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
        .search-pill svg { position: absolute; left: 1rem; color: #94a3b8; }

        .task-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 1.5rem; }
        .task-tile {
            background: white;
            border-radius: 28px;
            padding: 2rem;
            display: flex;
            flex-direction: column;
            border: 1px solid #e2e8f0;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }
        .task-tile:hover { transform: translateY(-8px); border-color: #cbd5e1; box-shadow: 0 20px 40px rgba(0,0,0,0.05); }
        
        .tile-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
        .tile-category { font-size: 0.65rem; font-weight: 800; color: #64748b; background: #f1f5f9; padding: 0.25rem 0.6rem; border-radius: 6px; }
        .tile-more-btn { background: none; border: none; color: #cbd5e1; cursor: pointer; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; }
        .tile-more-btn:hover { background: #f8fafc; color: #64748b; }

        .tile-body h3 { font-size: 1.125rem; font-weight: 800; margin-bottom: 0.75rem; line-height: 1.4; color: #1e293b; }
        .tile-body p { font-size: 0.875rem; color: #64748b; line-height: 1.6; margin-bottom: 2rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }

        .tile-metrics { display: flex; gap: 1rem; margin-bottom: 2rem; }
        .metric { display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; font-weight: 700; color: #94a3b8; }
        .metric svg { color: #cbd5e1; }

        .tile-footer { display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 1.5rem; border-top: 1px solid #f8fafc; }
        .submission-count { display: flex; align-items: center; gap: 0.75rem; }
        .sub-dots { display: flex; gap: 3px; }
        .dot { width: 6px; height: 6px; border-radius: 50%; background: #e2e8f0; }
        .dot.active { background: #10b981; }
        .submission-count span { font-size: 0.75rem; font-weight: 800; color: #475569; }

        .distribute-btn {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            padding: 0.6rem 1rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            font-size: 0.8125rem;
            font-weight: 700;
            color: #475569;
            cursor: pointer;
            transition: all 0.2s;
        }
        .distribute-btn:hover { background: #0f172a; color: white; border-color: #0f172a; }

        /* --- Table View --- */
        .hub-table { width: 100%; border-collapse: collapse; }
        .hub-table th { padding: 1.25rem 2rem; text-align: left; background: #f8fafc; color: #64748b; font-size: 0.75rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e2e8f0; }
        .hub-table td { padding: 1.25rem 2rem; font-size: 0.95rem; border-bottom: 1px solid #f8fafc; }
        .hub-table tr:hover { background: #fcfdfe; }
        
        .cell-task { display: flex; flex-direction: column; }
        .t-title { font-weight: 700; color: #1e293b; margin-bottom: 2px; }
        .t-id { font-size: 0.7rem; font-weight: 700; color: #94a3b8; }
        
        .type-pill { padding: 0.25rem 0.6rem; border-radius: 6px; font-size: 0.7rem; font-weight: 800; text-transform: uppercase; }
        .type-pill.batch { background: #eef2ff; color: #4f46e5; }
        .type-pill.subbatch { background: #f0fdf4; color: #10b981; }
        .type-pill.student { background: #fff7ed; color: #f59e0b; }

        .cell-stats { display: flex; flex-direction: column; font-size: 0.8rem; font-weight: 600; color: #64748b; gap: 2px; }
        
        .row-action-btn { width: 36px; height: 36px; border-radius: 10px; border: 1px solid #e2e8f0; background: white; color: #475569; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; }
        .row-action-btn:hover { background: #0f172a; color: white; transform: rotate(-15deg); }

        /* --- Modal --- */
        .hub-modal-overlay { position: fixed; inset: 0; background: rgba(15, 23, 42, 0.4); backdrop-filter: blur(4px); z-index: 100; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
        .hub-modal { background: white; border-radius: 32px; width: 100%; max-width: 600px; padding: 2.5rem; box-shadow: 0 40px 100px rgba(0,0,0,0.1); position: relative; }
        .hub-modal.mini { max-width: 480px; }
        
        .modal-top { display: flex; gap: 1.5rem; align-items: start; margin-bottom: 2.5rem; }
        .modal-icon-box { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center; }
        .modal-icon-box.orange { background: #fff7ed; color: #f97316; }
        .modal-icon-box.blue { background: #eff6ff; color: #3b82f6; }
        
        .modal-titles h2 { font-size: 1.5rem; font-weight: 900; letter-spacing: -0.02em; margin-bottom: 0.25rem; }
        .modal-titles p { font-size: 0.875rem; color: #64748b; }
        .close-x { position: absolute; top: 2rem; right: 2rem; width: 40px; height: 40px; border: none; background: #f1f5f9; color: #64748b; font-size: 1.5rem; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; }

        .modal-form { display: flex; flex-direction: column; gap: 1.5rem; }
        .form-field { display: flex; flex-direction: column; gap: 0.6rem; }
        .form-field label { font-size: 0.8125rem; font-weight: 700; color: #475569; }
        .form-field input, .form-field textarea, .form-field select, .hub-select {
            padding: 0.875rem 1rem;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 12px;
            font-size: 0.95rem;
            outline: none;
            transition: all 0.2s;
        }
        .form-field input:focus, .form-field textarea:focus { background: white; border-color: #6366f1; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1); }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }

        .modal-actions { display: grid; grid-template-columns: 1fr 2fr; gap: 1rem; margin-top: 1rem; }
        .action-sec { padding: 1rem; background: #f1f5f9; border: none; border-radius: 16px; font-weight: 700; color: #475569; cursor: pointer; }
        .action-pri { padding: 1rem; background: #0f172a; border: none; border-radius: 16px; font-weight: 700; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 0.5rem; }
        .action-pri.distribute { background: #3b82f6; box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2); }

        .assignment-box { display: flex; flex-direction: column; gap: 1.5rem; }
        .info-banner { padding: 1rem; background: #eff6ff; border-radius: 14px; display: flex; align-items: center; gap: 0.75rem; color: #1e40af; font-size: 0.75rem; font-weight: 600; border: 1px solid #dbeafe; }
        .target-select-group { display: flex; flex-direction: column; gap: 1.25rem; }
        .target-field { display: flex; flex-direction: column; gap: 0.5rem; }
        .target-separator { position: relative; text-align: center; font-size: 0.65rem; font-weight: 900; color: #cbd5e1; }
        .target-separator::before { content: ''; position: absolute; left: 0; top: 50%; width: 40%; height: 1px; background: #f1f5f9; }
        .target-separator::after { content: ''; position: absolute; right: 0; top: 50%; width: 40%; height: 1px; background: #f1f5f9; }

        /* --- Transitions --- */
        .fade-in { animation: fadeIn 0.6s ease-out; }
        .fade-up { animation: fadeUp 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }

        .hub-loader { display: flex; flex-direction: column; align-items: center; gap: 1.5rem; padding: 5rem 0; }
        .pulse-ring { width: 50px; height: 50px; border: 3px solid #e2e8f0; border-radius: 50%; border-top-color: #6366f1; animation: spin 0.8s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }

        .hub-empty-state { text-align: center; padding: 6rem 0; background: white; border-radius: 40px; border: 2px dashed #e2e8f0; }
        .empty-gfx { color: #e2e8f0; margin-bottom: 2rem; }
        .hub-empty-state h3 { font-size: 1.25rem; font-weight: 800; margin-bottom: 0.5rem; }
        .hub-empty-state p { color: #94a3b8; max-width: 320px; margin: 0 auto 2rem; }
        .empty-action-btn { display: inline-flex; align-items: center; gap: 0.5rem; padding: 0.875rem 1.5rem; background: #0f172a; color: white; border-radius: 12px; font-weight: 700; border: none; cursor: pointer; }

        @media (max-width: 1024px) {
            .header-glass { border-radius: 20px; }
            .header-main { flex-direction: column; align-items: flex-start; gap: 2rem; }
            .action-group { width: 100%; justify-content: space-between; }
            .quick-access-strip { grid-template-columns: 1fr; }
        }
      `}</style>
    </div>
  );
};

export default TaskManager;

