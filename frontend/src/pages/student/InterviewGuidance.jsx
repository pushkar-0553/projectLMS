import React, { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { 
  Users, MessageSquare, Award, Lightbulb, Compass, Copy, Check, 
  HelpCircle, ChevronDown, CheckSquare, Sparkles, BookOpen, User 
} from 'lucide-react'
import Button from '../../components/common/Button'

export default function InterviewGuidance() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'intro')
  const [openQuestion, setOpenQuestion] = useState(null)
  const [copiedText, setCopiedText] = useState(null)

  const handleTabChange = (tabId) => {
    setActiveTab(tabId)
    setSearchParams({ tab: tabId })
  }
  
  // Custom builder state for self-intro
  const [introBuilder, setIntroBuilder] = useState({
    name: '',
    techStack: '',
    majorProjects: '',
    keyStrengths: '',
    careerGoals: ''
  })

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text)
    setCopiedText(id)
    setTimeout(() => setCopiedText(null), 2000)
  }

  // Self introduction template preview
  const generatedIntro = `Hello, thank you for giving me this opportunity. My name is ${introBuilder.name || '[Your Name]'}, and I am a software engineer specializing in ${introBuilder.techStack || '[your tech stack, e.g., React and Node.js]'}. 

Recently, I built a few major projects, including ${introBuilder.majorProjects || '[mention 1-2 key projects, e.g., an LMS platform and a real-time chat app]'}. Through these experiences, I gained strong capabilities in ${introBuilder.keyStrengths || '[mention 2 strengths, e.g., full-stack development and responsive design]'}.

I am passionate about solving real-world problems and writing clean, scalable code. I am excited to apply my skills to contribute to your team and continue my professional growth as a ${introBuilder.careerGoals || '[e.g., Full Stack Engineer]'}.`

  // Common HR Questions list
  const hrQuestions = [
    {
      id: 0,
      q: "Tell me about yourself.",
      focus: "Keep it under 2 minutes. Focus on your professional background, key achievements, and relevance to this role.",
      structure: "STAR/Present-Past-Future: Speak about your current status, past project success, and why you are excited for this opportunity.",
      example: "I am a graduate developer specializing in Javascript and backend frameworks. In my recent project, I designed a multi-role learning management system using React, Express, and MySQL, which successfully tracked progress of over 100 students. I'm keen to bring this full-stack experience to your engineering team."
    },
    {
      id: 1,
      q: "What are your strengths and weaknesses?",
      focus: "Be authentic. For strength, match it to the job description. For weakness, show how you are working to improve it.",
      structure: "Positive Trait + Improvement Action: Frame the weakness as a past tendency that you have successfully mitigated.",
      example: "Strength: I have excellent debug skills and value writing self-documenting code. Weakness: Previously, I found it hard to delegate tasks in team projects, fearing code quality issues. However, in my last project, I created API standards and code-review checklists, which helped our team collaborate smoothly."
    },
    {
      id: 2,
      q: "Why do you want to work for us?",
      focus: "Show that you have researched the company. Connect their products/values to your own technical career goals.",
      structure: "Company Impact + Developer Growth: Why this product is exciting + how you can add value.",
      example: "Your team's focus on building real-time collaboration tools aligns perfectly with my interest in Socket.io and high-availability backends. I've been following your recent tech blog updates, and I want to contribute to a culture that values clean testing and developer experience."
    },
    {
      id: 3,
      q: "Tell me about a time you faced a technical challenge.",
      focus: "Choose a project obstacle you solved yourself. Focus on your troubleshooting process and key learnings.",
      structure: "STAR Framework: Describe the Situation, the Task at hand, the Action you took, and the positive Result.",
      example: "While integrating Socket.io on our LMS, we faced connection drops due to strict CORS rules. I analyzed server-side socket lifecycle logs, updated cors configurations to restrict domains securely, and implemented client-side retry logic. The connection rate went to 99.8% stability."
    }
  ]

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={styles.iconBox}><Compass size={24} color="#fff" /></div>
          <div>
            <h1 style={styles.title}>Interview Guidance</h1>
            <p style={styles.subtitle}>Equip yourself with templates, structured tips, and frameworks to crack your next interview.</p>
          </div>
        </div>
      </header>

      {/* Tabs Navbar */}
      <div style={styles.tabBar}>
        {[
          { id: 'intro', label: 'Self Introduction Builder', icon: User },
          { id: 'questions', label: 'Common HR Questions', icon: HelpCircle },
          { id: 'tips', label: 'Tips & Tricks', icon: Lightbulb },
        ].map(tab => {
          const Icon = tab.icon
          const active = activeTab === tab.id
          return (
            <button 
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                ...styles.tabBtn,
                color: active ? '#4f46e5' : '#64748b',
                borderBottom: active ? '3px solid #4f46e5' : '3px solid transparent',
              }}
            >
              <Icon size={16} />
              {tab.label}
            </button>
          )
        })}
      </div>

      <main style={styles.main}>
        {/* Tab 1: Self Introduction */}
        {activeTab === 'intro' && (
          <div style={styles.grid2Col}>
            {/* Input Form */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}><Sparkles size={16} color="#4f46e5" /> Draft Your Bio</h2>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Fill in these fields to generate a tailored pitch structure.</p>
              
              <div style={styles.formGroup}>
                <label style={styles.label}>Your Full Name</label>
                <input 
                  type="text" 
                  placeholder="e.g. Alex Johnson"
                  value={introBuilder.name}
                  onChange={e => setIntroBuilder({...introBuilder, name: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Tech Stack & Skills</label>
                <input 
                  type="text" 
                  placeholder="e.g. React, Node.js, Express, MySQL"
                  value={introBuilder.techStack}
                  onChange={e => setIntroBuilder({...introBuilder, techStack: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Major Projects Completed</label>
                <textarea 
                  placeholder="e.g. a Learning Management System with role-based access control, and a real-time collaborative whiteboarding tool"
                  value={introBuilder.majorProjects}
                  onChange={e => setIntroBuilder({...introBuilder, majorProjects: e.target.value})}
                  style={{ ...styles.input, height: 80, resize: 'none' }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Key Strengths (e.g. technical, teamwork, debugging)</label>
                <input 
                  type="text" 
                  placeholder="e.g. database schema design, troubleshooting runtime issues"
                  value={introBuilder.keyStrengths}
                  onChange={e => setIntroBuilder({...introBuilder, keyStrengths: e.target.value})}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>Target Job / Career Goals</label>
                <input 
                  type="text" 
                  placeholder="e.g. Junior Full Stack Developer"
                  value={introBuilder.careerGoals}
                  onChange={e => setIntroBuilder({...introBuilder, careerGoals: e.target.value})}
                  style={styles.input}
                />
              </div>
            </div>

            {/* Generated Template */}
            <div style={{ ...styles.card, background: '#f8fafc', borderColor: '#e2e8f0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h2 style={styles.cardTitle}><BookOpen size={16} color="#64748b" /> Pitch Template</h2>
                <button 
                  onClick={() => copyToClipboard(generatedIntro, 'intro')}
                  style={styles.copyBtn}
                >
                  {copiedText === 'intro' ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  {copiedText === 'intro' ? 'Copied!' : 'Copy Script'}
                </button>
              </div>

              <div style={styles.bioBox}>
                {generatedIntro.split('\n\n').map((paragraph, index) => (
                  <p key={index} style={{ marginBottom: 12, lineHeight: 1.6 }}>{paragraph}</p>
                ))}
              </div>

              <div style={styles.adviceBox}>
                <h4 style={{ fontWeight: 700, fontSize: 13, color: '#4338ca', marginBottom: 4 }}>💡 Professional Pitching Tips</h4>
                <ul style={{ paddingLeft: 16, fontSize: 12, color: '#475569', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <li>Maintain a calm, smiling expression.</li>
                  <li>Speak at a steady, moderate pace. Avoid rushing.</li>
                  <li>Try memorizing the structural bullet points instead of reading this verbatim.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: HR Questions */}
        {activeTab === 'questions' && (
          <div style={{ maxWidth: 800, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 }}>
            {hrQuestions.map(item => {
              const isOpen = openQuestion === item.id
              return (
                <div key={item.id} style={{ ...styles.card, padding: 0, overflow: 'hidden' }}>
                  <button 
                    onClick={() => setOpenQuestion(isOpen ? null : item.id)}
                    style={styles.accordionHeader}
                  >
                    <span style={styles.accordionTitle}>{item.q}</span>
                    <ChevronDown 
                      size={18} 
                      style={{ 
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.2s' 
                      }} 
                    />
                  </button>
                  
                  {isOpen && (
                    <div style={styles.accordionBody}>
                      <div style={styles.qaMetaBlock}>
                        <strong>💡 Interviewer Focus:</strong>
                        <p>{item.focus}</p>
                      </div>
                      <div style={styles.qaMetaBlock}>
                        <strong>🛠️ Recommended Structure:</strong>
                        <p>{item.structure}</p>
                      </div>
                      <div style={styles.qaExampleBlock}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                          <strong>💬 Model Response:</strong>
                          <button 
                            onClick={() => copyToClipboard(item.example, `q-${item.id}`)}
                            style={styles.copyLinkBtn}
                          >
                            {copiedText === `q-${item.id}` ? <Check size={12} /> : <Copy size={12} />}
                            {copiedText === `q-${item.id}` ? 'Copied' : 'Copy'}
                          </button>
                        </div>
                        <p style={{ fontStyle: 'italic', color: '#334155' }}>"{item.example}"</p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Tab 3: Tips & Tricks */}
        {activeTab === 'tips' && (
          <div style={styles.grid2Col}>
            {/* Checklist */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}><CheckSquare size={16} color="#10b981" /> Virtual Setup Checklist</h2>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Ensure a professional presence during live video calls.</p>
              
              <div style={styles.checklistGrid}>
                {[
                  { title: "Camera Position", desc: "Camera at eye level, stable connection. Background must be clean and quiet." },
                  { title: "Lighting & Audio", desc: "Front lighting (no windows behind you). Use headphones with a clear mic." },
                  { title: "Internet Stability", desc: "Close bandwidth-consuming applications. Perform speed test prior to call." },
                  { title: "Code Sandbox Ready", desc: "Keep standard developer environment, IDE, and terminal tools pre-opened." },
                  { title: "Professional Attire", desc: "Dress professionally, sitting in an upright posture with good screen distance." }
                ].map((item, idx) => (
                  <div key={idx} style={styles.checkItem}>
                    <div style={styles.checkBullet}>✓</div>
                    <div>
                      <strong style={{ fontSize: 14, color: '#1e293b' }}>{item.title}</strong>
                      <p style={{ fontSize: 12, color: '#64748b', margin: '2px 0 0' }}>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Email Templates */}
            <div style={styles.card}>
              <h2 style={styles.cardTitle}><MessageSquare size={16} color="#f59e0b" /> Follow-Up Templates</h2>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 20 }}>Follow up with recruiters within 24 hours after the interview.</p>

              <div style={styles.templateBlock}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={styles.templateTitle}>Post-Interview Thank You Email</span>
                  <button 
                    onClick={() => copyToClipboard(`Subject: Thank you - [Your Name] - [Job Title]\n\nDear [Interviewer Name],\n\nThank you for taking the time to speak with me today regarding the [Job Title] role. I enjoyed learning more about [Company Name] and the team's upcoming plans.\n\nOur discussion confirmed my enthusiasm for the position. I am excited about the opportunity to bring my full-stack development skills, specifically in building robust web applications, to your team.\n\nPlease let me know if you need any additional information. I look forward to hearing from you.\n\nBest regards,\n[Your Name]\n[Contact Info]`, 'thankyou')}
                    style={styles.copyLinkBtn}
                  >
                    {copiedText === 'thankyou' ? <Check size={12} /> : <Copy size={12} />}
                    {copiedText === 'thankyou' ? 'Copied' : 'Copy Template'}
                  </button>
                </div>
                <div style={styles.emailCode}>
                  <strong>Subject:</strong> Thank you - [Your Name] - [Job Title]<br/><br/>
                  Dear [Interviewer Name],<br/><br/>
                  Thank you for taking the time to speak with me today regarding the [Job Title] role. I enjoyed learning more about [Company Name] and the team's plans...
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

const styles = {
  container: {
    padding: '30px',
    backgroundColor: '#f8fafc',
    minHeight: 'calc(100vh - 70px)',
    fontFamily: "'Inter', sans-serif"
  },
  header: {
    marginBottom: '30px'
  },
  iconBox: {
    width: '48px',
    height: '48px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #4f46e5 0%, #4338ca 100%)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 15px -3px rgba(79, 70, 229, 0.3)'
  },
  title: {
    fontSize: '24px',
    fontWeight: 800,
    color: '#0f172a',
    margin: 0
  },
  subtitle: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0'
  },
  tabBar: {
    display: 'flex',
    gap: '24px',
    borderBottom: '1px solid #e2e8f0',
    marginBottom: '28px'
  },
  tabBtn: {
    background: 'none',
    border: 'none',
    padding: '12px 4px',
    fontSize: '14px',
    fontWeight: 700,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease-in-out'
  },
  main: {
    animation: 'fadeIn 0.3s ease'
  },
  grid2Col: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px'
  },
  card: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '1.25rem',
    padding: '24px',
    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.02)'
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  },
  formGroup: {
    marginBottom: '16px'
  },
  label: {
    display: 'block',
    fontSize: '12px',
    fontWeight: 700,
    color: '#475569',
    marginBottom: '6px',
    textTransform: 'uppercase',
    letterSpacing: '0.04em'
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: '10px',
    border: '1px solid #cbd5e1',
    fontSize: '14px',
    outline: 'none',
    transition: 'border 0.2s',
    boxSizing: 'border-box'
  },
  bioBox: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '12px',
    padding: '18px',
    fontSize: '14px',
    color: '#334155',
    minHeight: '260px',
    whiteSpace: 'pre-wrap'
  },
  copyBtn: {
    background: '#f1f5f9',
    border: 'none',
    borderRadius: '8px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    color: '#475569',
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'background 0.2s'
  },
  copyLinkBtn: {
    background: 'none',
    border: 'none',
    color: '#4f46e5',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px'
  },
  adviceBox: {
    marginTop: '20px',
    background: '#e0e7ff',
    border: '1px solid #c7d2fe',
    borderRadius: '12px',
    padding: '16px'
  },
  accordionHeader: {
    width: '100%',
    background: 'none',
    border: 'none',
    padding: '20px 24px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    textAlign: 'left',
    outline: 'none'
  },
  accordionTitle: {
    fontSize: '15px',
    fontWeight: 700,
    color: '#1e293b'
  },
  accordionBody: {
    padding: '0 24px 24px',
    borderTop: '1px solid #f1f5f9'
  },
  qaMetaBlock: {
    marginTop: '16px',
    fontSize: '13px'
  },
  qaExampleBlock: {
    marginTop: '16px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '14px',
    fontSize: '13px'
  },
  checklistGrid: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px'
  },
  checkItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start'
  },
  checkBullet: {
    width: '20px',
    height: '20px',
    borderRadius: '50%',
    background: '#dcfce7',
    color: '#15803d',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '11px',
    fontWeight: 800,
    flexShrink: 0
  },
  templateBlock: {
    marginTop: '12px'
  },
  templateTitle: {
    fontSize: '14px',
    fontWeight: 700,
    color: '#1e293b'
  },
  emailCode: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '10px',
    padding: '16px',
    fontFamily: 'monospace',
    fontSize: '12px',
    lineHeight: '1.5',
    color: '#475569'
  }
}
