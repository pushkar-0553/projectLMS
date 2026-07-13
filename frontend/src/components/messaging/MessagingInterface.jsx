import React, { useState, useEffect, useRef } from 'react';
import { 
  X, Send, Search, Users, User, Hash, 
  MoreVertical, Check, CheckCheck, Play, 
  Plus, Megaphone, ArrowLeft, SendHorizontal,
  GraduationCap, Info, MessageCircle, Paperclip,
  Image as ImageIcon, FileText, Camera, Link as LinkIcon,
  Code, BarChart2, Pin, Trash2, Download,
  ChevronUp, ChevronDown, ExternalLink,
  Reply, Smile
} from 'lucide-react';
import { messageAPI, userAPI, adminAPI, notificationAPI, coordinatorAPI } from '../../services/api';
import { useSocket } from '../../context/SocketContext';
import { useAuth } from '../../context/AuthContext';

/**
 * Sub-components for Rich Messaging
 */
const MessageAttachments = ({ attachments, isSent }) => {
  const socket = useSocket();
  if (!attachments || !Array.isArray(attachments)) return null;

  const handleVote = (pollId, optionIndex) => {
    socket?.emit('poll-vote', { pollId, optionIndex });
  };

  return (
    <div className="attachments-container">
      {attachments.map((att, idx) => (
        <div key={idx} className={`attachment-item type-${att.type}`}>
          {att.type === 'image' && (
            <div className="img-attachment animate-pop">
              <img src={att.data} alt={att.name} />
              <div className="img-overlay">
                <a href={att.data} download={att.name}><Download size={18} /></a>
              </div>
            </div>
          )}
          
          {att.type === 'file' && (
            <div className="file-attachment">
              <div className="file-icon"><FileText size={20} /></div>
              <div className="file-info">
                <span className="file-name truncate">{att.name}</span>
                <span className="file-size">{att.size}</span>
              </div>
              <a href={att.data} download={att.name} className="dl-btn"><Download size={16} /></a>
            </div>
          )}

          {att.type === 'link' && (
            <div className="link-preview-bubble">
              <div className="link-header">
                <LinkIcon size={12} />
                <span className="truncate">{att.url}</span>
              </div>
              <div className="link-body">
                <div className="link-text">
                  <h4 className="truncate">{att.url.replace(/https?:\/\//, '').split('/')[0]}</h4>
                  <p>Visit link for more details...</p>
                </div>
                <ExternalLink size={16} className="ext-icon" />
              </div>
              <a href={att.url} target="_blank" rel="noopener noreferrer" className="link-overlay"></a>
            </div>
          )}

          {att.type === 'code' && (
            <div className="code-attachment">
              <div className="code-header">
                <span>{att.language.toUpperCase()} Snippet</span>
                <button onClick={() => navigator.clipboard.writeText(att.code)}><Check size={14} /></button>
              </div>
              <pre><code>{att.code}</code></pre>
            </div>
          )}

          {att.type === 'poll' && (
            <div className="poll-attachment">
              <h4 className="poll-q">{att.question}</h4>
              <div className="poll-options">
                {att.options.map((opt, oIdx) => {
                  const totalVotes = att.options.reduce((sum, o) => sum + (o.votes || 0), 0);
                  const pct = totalVotes > 0 ? Math.round(((opt.votes || 0) / totalVotes) * 100) : 0;
                  return (
                    <button key={oIdx} className="poll-opt" onClick={() => handleVote(att.id, oIdx)}>
                      <div className="opt-bg" style={{ width: `${pct}%` }}></div>
                      <span className="opt-name">{opt.text}</span>
                      <span className="opt-pct">{pct}%</span>
                    </button>
                  );
                })}
              </div>
              <div className="poll-footer">
                <span>Total: {att.options.reduce((sum, o) => sum + (o.votes || 0), 0)} votes</span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const CodeEditorModal = ({ isOpen, onClose, onSave, data, setData }) => {
  if (!isOpen) return null;
  return (
    <div className="sub-modal-overlay" onClick={onClose}>
      <div className="sub-modal-card animate-pop" onClick={e => e.stopPropagation()}>
        <div className="sub-header">
          <h3>Send Code Snippet</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="sub-body">
          <select value={data.language} onChange={e => setData({...data, language: e.target.value})}>
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="sql">SQL</option>
          </select>
          <textarea 
            placeholder="Paste your code here..." 
            value={data.code}
            onChange={e => setData({...data, code: e.target.value})}
            className="code-textarea"
          />
        </div>
        <div className="sub-footer">
          <button onClick={onClose} className="btn-cancel">Cancel</button>
          <button onClick={onSave} className="btn-save">Attach Code</button>
        </div>
      </div>
    </div>
  );
};

const PollModal = ({ isOpen, onClose, onSave, data, setData }) => {
  if (!isOpen) return null;
  
  const addOption = () => setData({...data, options: [...data.options, '']});
  const updateOption = (val, idx) => {
    const newOpts = [...data.options];
    newOpts[idx] = val;
    setData({...data, options: newOpts});
  };

  return (
    <div className="sub-modal-overlay" onClick={onClose}>
      <div className="sub-modal-card animate-pop" onClick={e => e.stopPropagation()}>
        <div className="sub-header">
          <h3>Create Poll</h3>
          <button onClick={onClose}><X size={20} /></button>
        </div>
        <div className="sub-body">
          <input 
            placeholder="What is your question?" 
            value={data.question}
            onChange={e => setData({...data, question: e.target.value})}
            className="poll-q-input"
          />
          <div className="poll-builder custom-scrollbar">
            {data.options.map((opt, idx) => (
              <input 
                key={idx}
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChange={e => updateOption(e.target.value, idx)}
              />
            ))}
            {data.options.length < 5 && (
              <button onClick={addOption} className="add-opt-btn">+ Add Option</button>
            )}
          </div>
        </div>
        <div className="sub-footer">
          <button onClick={onClose} className="btn-cancel">Cancel</button>
          <button onClick={onSave} className="btn-save">Attach Poll</button>
        </div>
      </div>
    </div>
  );
};

/**
 * MessagingInterface Component
 * A premium, full-featured WhatsApp-style messaging interface.
 * Access through top-right Message icon only.
 */
const MessagingInterface = ({ onClose }) => {
  const { user } = useAuth();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState('chats'); // chats, coordinators, students, batches, notifications
  const [activeChat, setActiveChat] = useState(null); // { id, type, name, avatar }
  const [conversations, setConversations] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [chatSearchQuery, setChatSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedForBroadcast, setSelectedForBroadcast] = useState([]);
  
  const [replyTo, setReplyTo] = useState(null);
  const [hoveredMessage, setHoveredMessage] = useState(null);
  const EMOJIS = ['👍', '❤️', '👏', '😂', '😮', '🙏'];
  
  // Notification Sending State
  const [notifData, setNotifData] = useState({
    targetType: 'individual',
    targetId: '',
    title: '',
    message: '',
    link: ''
  });

  const [pinnedMessages, setPinnedMessages] = useState([]);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [selectedAttachments, setSelectedAttachments] = useState([]);
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [codeData, setCodeData] = useState({ code: '', language: 'javascript' });
  const [showPollModal, setShowPollModal] = useState(false);
  const [pollData, setPollData] = useState({ question: '', options: ['', ''] });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  useEffect(() => {
    fetchInbox();
    fetchContacts();
    
    if (socket) {
      const handleNewMessage = (msg) => {
        const isCurrentChat = activeChat && activeChat.id && (
          (activeChat.type === 'direct' && (msg.sender_id === activeChat.id || (msg.sender_id === user.id && msg.receiver_id === activeChat.id))) ||
          (activeChat.type === 'batch' && msg.batch_id === activeChat.id)
        );

        if (isCurrentChat) {
          setMessages(prev => [...prev, msg]);
          if (msg.sender_id === activeChat.id) {
            messageAPI.markAsRead(activeChat.id);
          }
        }
        fetchInbox();
      };

      socket.on('new_message', handleNewMessage);

      socket.on('message-pinned', (data) => {
        fetchPinnedMessages();
        setMessages(prev => prev.map(m => m.id === parseInt(data.id) ? { ...m, is_pinned: true, pinned_by: data.pinned_by } : m));
      });

      socket.on('message-unpinned', (data) => {
        fetchPinnedMessages();
        setMessages(prev => prev.map(m => m.id === parseInt(data.id) ? { ...m, is_pinned: false, pinned_by: null } : m));
      });

      socket.on('poll-vote', (data) => {
        setMessages(prev => prev.map(m => {
          if (m.attachments && m.attachments.some(a => a.type === 'poll' && a.id === data.pollId)) {
            const newAttachments = m.attachments.map(a => {
              if (a.type === 'poll' && a.id === data.pollId) {
                const newOptions = [...a.options];
                newOptions[data.optionIndex].votes = (newOptions[data.optionIndex].votes || 0) + 1;
                return { ...a, options: newOptions };
              }
              return a;
            });
            return { ...m, attachments: newAttachments };
          }
          return m;
        }));
      });

      socket.on('messages_read', (data) => {
        if (activeChat && ((activeChat.id === data.fromUser) || (activeChat.id === data.byUser))) {
          setMessages(prev => prev.map(m => m.is_read ? m : { ...m, is_read: 1, status: 'read' }));
        }
      });

      socket.on('message-reaction', (data) => {
        setMessages(prev => prev.map(m => m.id === parseInt(data.messageId) ? { ...m, reactions: data.reactions } : m));
      });

      return () => {
        socket.off('new_message');
        socket.off('message-pinned');
        socket.off('message-unpinned');
        socket.off('poll-vote');
        socket.off('messages_read');
        socket.off('message-reaction');
      };
    }
  }, [socket, activeChat, user.id]);

  useEffect(() => {
    if (activeChat) {
      setChatSearchQuery('');
      setShowSearchInput(false);
      setReplyTo(null);
      fetchConversation(activeChat);
    }
  }, [activeChat]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchInbox = async () => {
    try {
      const res = await messageAPI.getInbox();
      setConversations(res.data);
    } catch (error) {
      console.error('Inbox fetch error:', error);
    }
  };

  const fetchContacts = async () => {
    try {
      if (activeTab === 'coordinators') {
        const res = await adminAPI.getCoordinators();
        setContacts(res.data);
      } else if (activeTab === 'students' || (activeTab === 'notifications' && notifData.targetType === 'individual')) {
        const res = await adminAPI.getStudents();
        setContacts(res.data);
      } else if (activeTab === 'batches' || (activeTab === 'notifications' && notifData.targetType === 'batch')) {
        const res = await adminAPI.getBatches();
        setContacts(res.data);
      } else if (activeTab === 'notifications' && notifData.targetType === 'sub-batch') {
        const res = await coordinatorAPI.getMySubBatches();
        setContacts(res.data);
      }
    } catch (error) {
      console.error('Contacts fetch error:', error);
    }
  };

  useEffect(() => {
    if (activeTab !== 'chats') {
      fetchContacts();
    }
    if (activeTab === 'notifications') {
      setActiveChat(null);
    }
  }, [activeTab, notifData.targetType]);

  const handleSendNotification = async (e) => {
    e.preventDefault();
    if (!notifData.targetId || !notifData.title || !notifData.message) {
      alert('Please fill all required fields');
      return;
    }

    try {
      await notificationAPI.sendManual({
        target_type: notifData.targetType,
        target_id: notifData.targetId,
        title: notifData.title,
        message: notifData.message,
        link: notifData.link
      });
      alert('Notification sent successfully!');
      setNotifData({ ...notifData, title: '', message: '', link: '' });
    } catch (error) {
      console.error('Send manual notification error:', error);
      alert('Failed to send notification');
    }
  };

  const fetchConversation = async (chat) => {
    setIsLoading(true);
    try {
      let res;
      if (chat.type === 'direct') {
        res = await messageAPI.getConversation(chat.id);
        await messageAPI.markAsRead(chat.id);
      } else {
        res = await messageAPI.getBatchAnnouncements(chat.id, user.role === 'student'); 
        // Note: is_announcement: true is handled by backend for getBatchAnnouncements
      }
      setMessages(res.data);
      fetchPinnedMessages();
    } catch (error) {
      console.error('Conversation fetch error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPinnedMessages = async () => {
    if (!activeChat) return;
    try {
      const res = await messageAPI.getPinnedMessages(activeChat.type === 'batch' ? 'batch' : 'direct', activeChat.id);
      setPinnedMessages(res.data);
    } catch (error) {
      console.error('Fetch pins error:', error);
    }
  };

  const handlePinMessage = async (msgId) => {
    try {
      await messageAPI.pinMessage(msgId);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: true, pinned_by: user.id } : m));
      fetchPinnedMessages();
    } catch (error) {
      console.error('Pin error:', error);
    }
  };

  const handleUnpinMessage = async (msgId) => {
    try {
      await messageAPI.unpinMessage(msgId);
      setMessages(prev => prev.map(m => m.id === msgId ? { ...m, is_pinned: false, pinned_by: null } : m));
      fetchPinnedMessages();
    } catch (error) {
      console.error('Unpin error:', error);
    }
  };

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedAttachments(prev => [...prev, {
          type,
          name: file.name,
          size: (file.size / 1024).toFixed(1) + ' KB',
          data: reader.result,
          id: Date.now() + Math.random()
        }]);
      };
      reader.readAsDataURL(file);
    });
    setShowAttachmentMenu(false);
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if ((!newMessage.trim() && selectedAttachments.length === 0) || !activeChat) return;

    try {
      const payload = {
        content: newMessage,
        is_announcement: activeChat.type === 'batch',
        attachments: selectedAttachments.length > 0 ? selectedAttachments : null,
        reply_to_id: replyTo ? replyTo.id : null
      };

      if (activeChat.type === 'direct') {
        payload.receiver_id = activeChat.id;
      } else {
        payload.batch_id = activeChat.id;
      }

      await messageAPI.sendMessage(payload);
      setNewMessage('');
      setSelectedAttachments([]);
      setReplyTo(null);
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const handleBroadcast = async () => {
    if (!newMessage.trim() || selectedForBroadcast.length === 0) return;
    try {
      for (const targetId of selectedForBroadcast) {
        await messageAPI.sendMessage({
          receiver_id: targetId,
          content: newMessage,
          is_announcement: false
        });
      }
      setNewMessage('');
      setSelectedForBroadcast([]);
      setShowBroadcastModal(false);
      alert('Broadcast sent successfully!');
    } catch (error) {
      console.error('Broadcast error:', error);
    }
  };

  const handleToggleReaction = async (msgId, emoji) => {
    try {
      const res = await messageAPI.toggleReaction(msgId, emoji);
      if (res.data && res.data.reactions) {
        setMessages(prev => prev.map(m => m.id === msgId ? { ...m, reactions: res.data.reactions } : m));
      }
    } catch (error) {
      console.error('Toggle reaction error:', error);
    }
  };

  const toggleSelectBroadcast = (id) => {
    setSelectedForBroadcast(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const renderSidebarItem = (item) => {
    const isSelected = activeChat && activeChat.id === item.id;
    return (
      <div 
        key={item.uniqueKey || item.id}
        onClick={() => setActiveChat(item)}
        className={`sidebar-item ${isSelected ? 'active' : ''}`}
      >
        <div className="item-avatar" style={{ backgroundColor: item.type === 'batch' ? '#e0f2fe' : '#f1f5f9' }}>
          {item.type === 'batch' ? <Hash size={20} className="text-sky-600" /> : <User size={20} className="text-slate-600" />}
          {item.is_read === 0 && item.unread_count > 0 && <span className="status-dot" />}
        </div>
        <div className="item-info">
          <div className="item-top">
            <span className="item-name truncate">{item.name}</span>
            <span className="item-time">{item.created_at ? new Date(item.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : ''}</span>
          </div>
          <div className="item-bottom">
            <p className="item-snippet truncate">{item.content || item.role?.toUpperCase() || 'Chat'}</p>
            {item.unread_count > 0 && <span className="unread-count">{item.unread_count}</span>}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="messaging-overlay" onClick={onClose}>
      <div className="messaging-modal animate-modal" onClick={(e) => e.stopPropagation()}>
        {/* Sidebar */}
        <div className="messaging-sidebar">
          <div className="sidebar-header">
            <div className="header-top">
              <h2>Messaging Hub</h2>
              <button onClick={onClose} className="close-btn"><X size={20} /></button>
            </div>
            <div className="search-bar">
              <Search size={18} />
              <input 
                type="text" 
                placeholder="Search..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          <div className="sidebar-tabs">
            <button className={activeTab === 'chats' ? 'active' : ''} onClick={() => setActiveTab('chats')}>All</button>
            <button className={activeTab === 'coordinators' ? 'active' : ''} onClick={() => setActiveTab('coordinators')}>Coordinators</button>
            <button className={activeTab === 'students' ? 'active' : ''} onClick={() => setActiveTab('students')}>Students</button>
            <button className={activeTab === 'batches' ? 'active' : ''} onClick={() => setActiveTab('batches')}>Batches</button>
            {(user.role === 'coordinator' || user.role === 'faculty') && (
              <button className={activeTab === 'notifications' ? 'active' : ''} onClick={() => setActiveTab('notifications')}>
                <Megaphone size={14} className="mr-1 inline" /> Notifications
              </button>
            )}
          </div>

          <div className="sidebar-list custom-scrollbar">
            {(user.role === 'faculty' || user.role === 'admin') && activeTab === 'coordinators' && (
              <div className="broadcast-trigger" onClick={() => setShowBroadcastModal(true)}>
                <Megaphone size={18} />
                <span>Broadcast message</span>
              </div>
            )}

            {activeTab === 'chats' ? (
              conversations.length > 0 ? conversations.map(conv => renderSidebarItem({
                id: conv.sender_id === user.id ? conv.receiver_id : conv.sender_id,
                name: conv.sender_name,
                content: conv.content,
                type: 'direct',
                is_read: conv.is_read,
                unread_count: conv.unread_count,
                created_at: conv.created_at,
                uniqueKey: `conv-${conv.id}`
              })) : <div className="p-8 text-center text-slate-400 text-sm">No recent chats</div>
            ) : activeTab === 'notifications' ? (
              <div className="p-4 text-center text-slate-500 text-xs italic">
                Send official alerts to recipients.
              </div>
            ) : (
              contacts.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase())).map(contact => renderSidebarItem({
                id: contact.id,
                name: contact.name,
                type: activeTab === 'batches' ? 'batch' : 'direct',
                uniqueKey: `contact-${contact.id}`
              }))
            )}
          </div>
        </div>

        {/* Messaging Content Area */}
        <div className="messaging-content">
          {activeTab === 'notifications' ? (
            <div className="notification-composer custom-scrollbar">
              <div className="composer-header">
                <h3>Official Notification</h3>
                <p>Compose a manual alert that will appear in recipients' Bell icons.</p>
              </div>

              <form className="composer-form" onSubmit={handleSendNotification}>
                <div className="form-row">
                  <div className="input-group">
                    <label>Target Type</label>
                    <select 
                      value={notifData.targetType} 
                      onChange={e => setNotifData({...notifData, targetType: e.target.value, targetId: ''})}
                    >
                      <option value="individual">Individual Student</option>
                      <option value="batch">Entire Batch</option>
                      <option value="sub-batch">Entire Sub-Batch</option>
                    </select>
                  </div>

                  <div className="input-group">
                    <label>Receiver {notifData.targetType === 'individual' ? 'Student' : 'Group'}</label>
                    <select 
                      value={notifData.targetId} 
                      onChange={e => setNotifData({...notifData, targetId: e.target.value})}
                    >
                      <option value="">-- Select Target --</option>
                      {contacts.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="input-group">
                  <label>Subject / Title</label>
                  <input 
                    type="text" 
                    placeholder="Enter notification title..." 
                    value={notifData.title}
                    onChange={e => setNotifData({...notifData, title: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label>Message Content</label>
                  <textarea 
                    placeholder="Write the official notice here..." 
                    rows="6"
                    value={notifData.message}
                    onChange={e => setNotifData({...notifData, message: e.target.value})}
                  />
                </div>

                <div className="input-group">
                  <label>Action Link (Optional)</label>
                  <input 
                    type="text" 
                    placeholder="e.g. /tasks or /project-learning" 
                    value={notifData.link}
                    onChange={e => setNotifData({...notifData, link: e.target.value})}
                  />
                </div>

                <button type="submit" className="composer-submit">
                  <Megaphone size={18} /> Send Official Notification
                </button>
              </form>
            </div>
          ) : activeChat ? (
            <>
              <header className="chat-header">
                <div className="chat-info">
                  <div className="chat-avatar">
                   {activeChat.type === 'batch' ? <Hash size={20} /> : <User size={20} />}
                  </div>
                  <div>
                    <h3 className="chat-name">{activeChat.name}</h3>
                    <div className="status-flex">
                      <div className="status-pin online"></div>
                      <span className="status-text">Active Now</span>
                    </div>
                  </div>
                </div>
                <div className="chat-tools">
                  {showSearchInput ? (
                    <div className="chat-inline-search fade-in">
                      <Search size={16} className="text-slate-400" />
                      <input 
                        type="text" 
                        placeholder="Search in chat..." 
                        value={chatSearchQuery} 
                        onChange={e => setChatSearchQuery(e.target.value)} 
                        autoFocus 
                      />
                      <button onClick={() => { setShowSearchInput(false); setChatSearchQuery(''); }}><X size={16} /></button>
                    </div>
                  ) : (
                    <button className="tool-btn" onClick={() => setShowSearchInput(true)}><Search size={20} /></button>
                  )}
                </div>
              </header>



              {pinnedMessages.length > 0 && (
                <div className="pinned-messages-banner">
                  <div className="pin-icon-box"><Pin size={16} fill="currentColor" /></div>
                  <div className="pinned-content-carousel">
                    {pinnedMessages.slice(0, 3).map((pin, index) => (
                      <div key={pin.id} className="pin-item">
                        <span className="pin-title">Pinned Message {pinnedMessages.length > 1 ? `#${index + 1}` : ''}</span>
                        <p className="pin-preview truncate">{pin.content}</p>
                        {(pin.pinned_by === user.id || user.role === 'coordinator' || user.role === 'faculty') && (
                          <button onClick={() => handleUnpinMessage(pin.id)} className="unpin-btn">Unpin</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="messages-area custom-scrollbar">
                {isLoading ? (
                  <div className="chat-loader">
                    <div className="spinner"></div>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div 
                      key={msg.id || i} 
                      className={`msg-wrap ${msg.sender_id === user.id ? 'sent' : 'received'}`}
                      onMouseEnter={() => setHoveredMessage(msg.id)}
                      onMouseLeave={() => setHoveredMessage(null)}
                      style={{ display: chatSearchQuery && !msg.content?.toLowerCase().includes(chatSearchQuery.toLowerCase()) ? 'none' : 'flex' }}
                    >
                      <div className="msg-bubble-container">
                        {hoveredMessage === msg.id && (
                          <div className={`reaction-bar animate-pop ${msg.sender_id === user.id ? 'left' : 'right'}`}>
                            {EMOJIS.map(e => (
                              <button key={e} onClick={(ev) => { ev.stopPropagation(); handleToggleReaction(msg.id, e); }}>{e}</button>
                            ))}
                          </div>
                        )}
                        <div className="msg-bubble">
                          {msg.reply_to_id && (
                            <div className="quote-preview">
                              <span className="quote-sender">{msg.reply_sender_name}</span>
                              <p className="truncate">{msg.reply_content || 'Attachment'}</p>
                            </div>
                          )}
                          {msg.attachments && <MessageAttachments attachments={msg.attachments} isSent={msg.sender_id === user.id} />}
                          {msg.content && (
                            <p dangerouslySetInnerHTML={{
                              __html: chatSearchQuery ? msg.content.replace(new RegExp(chatSearchQuery, 'gi'), match => `<mark>${match}</mark>`) : msg.content
                            }} />
                          )}
                          <div className="msg-meta">
                            <span>{new Date(msg.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            {msg.sender_id === user.id && (
                              msg.is_read || msg.status === 'read' ? <CheckCheck size={14} className="tick-read text-blue-500" /> :
                              msg.status === 'delivered' ? <CheckCheck size={14} className="tick-deliv text-slate-400" /> :
                              <Check size={14} className="tick-sent text-slate-400" />
                            )}
                          </div>
                          
                          {msg.reactions && Object.keys(msg.reactions).length > 0 && (
                            <div className="reactions-display">
                              {Object.entries(msg.reactions).map(([emoji, users]) => (
                                <button key={emoji} className={`react-chip ${users.some(u => u.userId === user.id) ? 'active' : ''}`} onClick={() => handleToggleReaction(msg.id, emoji)}>
                                  {emoji} {users.length > 1 && <span>{users.length}</span>}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="bubble-actions">
                          <button onClick={() => setReplyTo(msg)} title="Reply"><Reply size={14} /></button>
                          {(!msg.is_pinned) && (
                            <button onClick={() => handlePinMessage(msg.id)} title="Pin message"><Pin size={14} /></button>
                          )}
                          {msg.is_pinned && (
                            <span className="pin-indicator"><Pin size={10} fill="currentColor" /></span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {selectedAttachments.length > 0 && (
                <div className="attachment-previews">
                  {selectedAttachments.map(att => (
                    <div key={att.id} className="preview-card">
                      {att.type === 'image' ? <img src={att.data} alt="" /> : <FileText size={20} />}
                      <span className="truncate">{att.name}</span>
                      <button onClick={() => setSelectedAttachments(prev => prev.filter(a => a.id !== att.id))}><X size={14} /></button>
                    </div>
                  ))}
                </div>
              )}

              <form className="chat-footer" onSubmit={handleSendMessage}>
                <div className="footer-actions">
                  <button type="button" className={`action-btn ${showAttachmentMenu ? 'active' : ''}`} onClick={() => setShowAttachmentMenu(!showAttachmentMenu)}>
                    <Plus size={22} />
                  </button>
                  {showAttachmentMenu && (
                    <div className="attachment-menu animate-pop">
                      <div className="menu-grid">
                        <button type="button" onClick={() => fileInputRef.current.click()}>
                          <div className="grid-icon bg-blue-100 text-blue-600"><FileText size={20} /></div>
                          <span>File</span>
                        </button>
                        <button type="button" onClick={() => imageInputRef.current.click()}>
                          <div className="grid-icon bg-pink-100 text-pink-600"><ImageIcon size={20} /></div>
                          <span>Image</span>
                        </button>
                        <button type="button" onClick={() => alert('Camera support simulation')}>
                          <div className="grid-icon bg-orange-100 text-orange-600"><Camera size={20} /></div>
                          <span>Camera</span>
                        </button>
                        <button type="button" onClick={() => {
                          const url = prompt('Enter Link URL:');
                          if (url) setSelectedAttachments(prev => [...prev, { type: 'link', url, id: Date.now() }]);
                        }}>
                          <div className="grid-icon bg-green-100 text-green-600"><LinkIcon size={20} /></div>
                          <span>Link</span>
                        </button>
                        <button type="button" onClick={() => setShowCodeModal(true)}>
                          <div className="grid-icon bg-purple-100 text-purple-600"><Code size={20} /></div>
                          <span>Code</span>
                        </button>
                        <button type="button" onClick={() => setShowPollModal(true)}>
                          <div className="grid-icon bg-sky-100 text-sky-600"><BarChart2 size={20} /></div>
                          <span>Poll</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={(e) => handleFileUpload(e, 'file')} />
                <input type="file" ref={imageInputRef} style={{ display: 'none' }} accept="image/*" multiple onChange={(e) => handleFileUpload(e, 'image')} />

                <div className="compose-area-wrapper">
                  {replyTo && (
                    <div className="reply-composer-preview">
                      <div className="reply-left">
                        <Reply size={14} className="text-indigo-500" />
                        <div>
                          <span>Replying to {replyTo.sender_name}</span>
                          <p className="truncate">{replyTo.content || 'Attachment'}</p>
                        </div>
                      </div>
                      <button type="button" onClick={() => setReplyTo(null)} className="close-reply"><X size={16} /></button>
                    </div>
                  )}
                  <div className="compose-area">
                    <input 
                      placeholder="Type your message..." 
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                    />
                  </div>
                </div>
                <button type="submit" className="send-action" disabled={!newMessage.trim() && selectedAttachments.length === 0}>
                  <SendHorizontal size={20} />
                </button>
              </form>
            </>
          ) : (
            <div className="welcome-chat">
              <div className="welcome-image">
                <MessageCircle size={80} strokeWidth={1.5} />
              </div>
              <h2>Select a conversation</h2>
              <p>Connect with your mentors, students and batches in real-time.</p>
            </div>
          )}
        </div>
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="broadcast-modal-overlay" onClick={() => setShowBroadcastModal(false)}>
          <div className="broadcast-card animate-pop" onClick={e => e.stopPropagation()}>
            <div className="card-header">
              <h3>Broadcast Message</h3>
              <button onClick={() => setShowBroadcastModal(false)}><X size={20} /></button>
            </div>
            <div className="card-body">
              <p className="description">Sends this message to all selected coordinators instantly.</p>
              <div className="target-selector custom-scrollbar">
                {contacts.map(c => (
                  <div 
                    key={c.id} 
                    className={`target-item ${selectedForBroadcast.includes(c.id) ? 'selected' : ''}`}
                    onClick={() => toggleSelectBroadcast(c.id)}
                  >
                    <User size={18} />
                    <span className="name">{c.name}</span>
                    <div className="checkbox">{selectedForBroadcast.includes(c.id) && <Check size={14} />}</div>
                  </div>
                ))}
              </div>
              <textarea 
                placeholder="Write your broadcast message..."
                value={newMessage}
                onChange={e => setNewMessage(e.target.value)}
                className="mt-4"
              />
            </div>
            <div className="card-footer">
              <button className="cancel-btn" onClick={() => setShowBroadcastModal(false)}>Cancel</button>
              <button 
                className="btn-send" 
                onClick={handleBroadcast}
                disabled={!newMessage.trim() || selectedForBroadcast.length === 0}
              >
                Send to {selectedForBroadcast.length} contacts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Code Editor Modal */}
      <CodeEditorModal 
        isOpen={showCodeModal} 
        onClose={() => setShowCodeModal(false)} 
        data={codeData}
        setData={setCodeData}
        onSave={() => {
          setSelectedAttachments(prev => [...prev, { type: 'code', ...codeData, id: Date.now() }]);
          setShowCodeModal(false);
          setCodeData({ code: '', language: 'javascript' });
        }}
      />

      {/* Poll Modal */}
      <PollModal 
        isOpen={showPollModal} 
        onClose={() => setShowPollModal(false)} 
        data={pollData}
        setData={setPollData}
        onSave={() => {
          setSelectedAttachments(prev => [...prev, { type: 'poll', ...pollData, id: Date.now(), options: pollData.options.map((o, i) => ({ text: o, votes: 0 })) }]);
          setShowPollModal(false);
          setPollData({ question: '', options: ['', ''] });
        }}
      />

      <style>{`
        .messaging-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.5); backdrop-filter: blur(10px);
          z-index: 99999; display: flex; align-items: center; justify-content: center;
          padding: 24px;
        }
        .messaging-modal {
          width: 100%; max-width: 1100px; height: 100%; max-height: 800px;
          background: white; border-radius: 28px; display: flex; overflow: hidden;
          box-shadow: 0 40px 100px -20px rgba(0,0,0,0.3);
        }
        .messaging-sidebar {
          width: 320px; border-right: 1px solid #f1f5f9; display: flex; flex-direction: column; background: #fafafa;
        }
        .sidebar-header { padding: 24px; background: white; }
        .header-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
        .header-top h2 { font-size: 20px; font-weight: 800; color: #1e293b; margin: 0; }
        .close-btn { border: none; background: #f1f5f9; color: #64748b; padding: 6px; border-radius: 10px; cursor: pointer; }
        .search-bar { background: #f1f5f9; padding: 10px 16px; border-radius: 12px; display: flex; align-items: center; gap: 10px; color: #94a3b8; }
        .search-bar input { border: none; background: transparent; outline: none; width: 100%; font-size: 14px; color: #1e293b; }
        .sidebar-tabs { display: flex; padding: 10px 16px; gap: 8px; background: white; border-bottom: 1px solid #f1f5f9; }
        .sidebar-tabs button { flex: 1; padding: 8px; border: none; background: transparent; font-size: 12px; font-weight: 700; color: #64748b; cursor: pointer; border-radius: 8px; transition: 0.2s; }
        .sidebar-tabs button.active { background: #6366f1; color: white; }
        .sidebar-list { flex: 1; overflow-y: auto; }
        .broadcast-trigger { margin: 12px; padding: 14px; background: #6366f1; color: white; border-radius: 14px; display: flex; align-items: center; gap: 12px; font-weight: 700; cursor: pointer; transition: 0.2s; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2); }
        .broadcast-trigger:hover { transform: translateY(-2px); box-shadow: 0 6px 16px rgba(99, 102, 241, 0.3); }
        
        .sidebar-item { padding: 16px 20px; display: flex; gap: 16px; cursor: pointer; transition: 0.2s; border-right: 3px solid transparent; }
        .sidebar-item:hover { background: #f8fafc; }
        .sidebar-item.active { background: white; border-right-color: #6366f1; box-shadow: inset 20px 0 40px rgba(0,0,0,0.01); }
        .item-avatar { width: 48px; height: 48px; border-radius: 16px; display: flex; align-items: center; justify-content: center; position: relative; }
        .status-dot { position: absolute; top: -2px; right: -2px; width: 10px; height: 10px; background: #6366f1; border: 2px solid white; border-radius: 50%; box-shadow: 0 0 8px #6366f1; }
        .item-info { flex: 1; min-width: 0; }
        .item-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
        .item-name { font-weight: 700; color: #1e293b; font-size: 14.5px; }
        .item-time { font-size: 10px; color: #94a3b8; }
        .item-snippet { font-size: 12.5px; color: #64748b; margin: 0; }

        .messaging-content { flex: 1; display: flex; flex-direction: column; background: white; }
        .chat-header { padding: 16px 28px; border-bottom: 1px solid #f1f5f9; display: flex; justify-content: space-between; align-items: center; }
        .chat-info { display: flex; gap: 14px; align-items: center; }
        .chat-avatar { width: 44px; height: 44px; background: #f8fafc; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #6366f1; }
        .chat-name { font-size: 16px; font-weight: 800; color: #0f172a; margin: 0; }
        .status-flex { display: flex; align-items: center; gap: 6px; }
        .status-pin { width: 6px; height: 6px; border-radius: 50%; }
        .status-pin.online { background: #10b981; box-shadow: 0 0 8px #10b981; }
        .status-text { font-size: 11px; font-weight: 700; color: #94a3b8; }
        .chat-tools { display: flex; gap: 10px; }
        .tool-btn { border: none; background: transparent; color: #94a3b8; cursor: pointer; padding: 6px; border-radius: 8px; transition: 0.2s; }
        .tool-btn:hover { background: #f1f5f9; color: #64748b; }

        .messages-area { flex: 1; overflow-y: auto; padding: 24px 32px; display: flex; flex-direction: column; gap: 12px; background: #fff; background-image: radial-gradient(#f1f5f9 1.5px, transparent 1.5px); background-size: 24px 24px; }
        .msg-wrap { display: flex; width: 100%; transition: all 0.3s; }
        .msg-bubble { max-width: 65%; padding: 12px 16px; border-radius: 20px; position: relative; }
        .sent { justify-content: flex-end; }
        .sent .msg-bubble { background: #6366f1; color: white; border-bottom-right-radius: 4px; box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2); }
        .received { justify-content: flex-start; }
        .received .msg-bubble { background: #f1f5f9; color: #1e293b; border-bottom-left-radius: 4px; }
        .msg-bubble p { margin: 0; font-size: 14px; line-height: 1.6; font-weight: 500; }
        .msg-meta { display: flex; justify-content: flex-end; align-items: center; gap: 6px; margin-top: 6px; font-size: 9.5px; opacity: 0.8; font-weight: 700; }
        
        .chat-footer { padding: 20px 32px; display: flex; gap: 16px; align-items: center; background: white; }
        .compose-area { flex: 1; background: #f8fafc; border-radius: 16px; padding: 4px 16px; border: 1px solid #f1f5f9; }
        .compose-area input { width: 100%; height: 44px; border: none; background: transparent; outline: none; font-size: 14px; color: #1e293b; }
        .send-action { width: 44px; height: 44px; background: #6366f1; color: white; border-radius: 14px; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 8px 20px -6px #6366f1; transition: 0.2s; }
        .send-action:hover:not(:disabled) { transform: translateY(-2px) scale(1.05); }
        .send-action:disabled { opacity: 0.5; box-shadow: none; cursor: not-allowed; }

        .welcome-chat { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: #94a3b8; text-align: center; }
        .welcome-image { margin-bottom: 24px; color: #f1f5f9; animation: float 3s ease-in-out infinite; }
        .welcome-chat h2 { color: #1e293b; margin-bottom: 8px; font-weight: 800; }
        .welcome-chat p { max-width: 280px; font-size: 14px; }

        .broadcast-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 100000; display: flex; align-items: center; justify-content: center; }
        .broadcast-card { width: 400px; background: white; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 60px rgba(0,0,0,0.2); }
        .card-header { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
        .card-body { padding: 24px; }
        .target-selector { max-height: 200px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; }
        .target-item { padding: 10px 14px; background: #f8fafc; border-radius: 10px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: 0.2s; border: 1px solid transparent; }
        .target-item.selected { background: #eef2ff; border-color: #6366f1; color: #6366f1; }
        .card-body textarea { width: 100%; min-height: 100px; padding: 12px; background: #f8fafc; border: 1px solid #f1f5f9; border-radius: 12px; resize: none; outline: none; transition: 0.2s; }
        .card-body textarea:focus { border-color: #6366f1; background: white; }
        .card-footer { padding: 20px 24px; display: flex; gap: 12px; }
        .btn-send { flex: 1; background: #6366f1; color: white; padding: 12px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; }
        .cancel-btn { padding: 12px 20px; background: #f1f5f9; color: #64748b; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; }

        @keyframes float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-15px); } }
        .animate-modal { animation: modalEnter 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        @keyframes modalEnter { from { opacity: 0; transform: scale(0.95) translateY(30px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }

        /* Pinned Messages Style */
        .pinned-messages-banner {
          background: #f8fafc; border-bottom: 1px solid #e2e8f0; padding: 10px 24px;
          display: flex; gap: 16px; align-items: center; position: sticky; top: 0; z-index: 20;
        }
        .pin-icon-box { color: #6366f1; }
        .pinned-content-carousel { flex: 1; display: flex; gap: 20px; overflow-x: auto; padding-bottom: 4px; }
        .pin-item { min-width: 200px; max-width: 300px; display: flex; flex-direction: column; position: relative; }
        .pin-title { font-size: 10px; font-weight: 800; color: #6366f1; text-transform: uppercase; }
        .pin-preview { font-size: 13px; color: #1e293b; margin: 0; font-weight: 600; }
        .unpin-btn { font-size: 10px; background: none; border: none; color: #ef4444; font-weight: 700; cursor: pointer; padding: 0; margin-top: 2px; text-align: left; }
        
        /* Attachment Menu & Previews */
        .footer-actions { position: relative; }
        .attachment-menu {
          position: absolute; bottom: 60px; left: 0; width: 280px; background: white;
          border-radius: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.15); padding: 16px;
          z-index: 100; border: 1px solid #f1f5f9;
        }
        .menu-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
        .menu-grid button {
          display: flex; flex-direction: column; align-items: center; gap: 8px;
          border: none; background: transparent; cursor: pointer; padding: 10px; border-radius: 12px; transition: 0.2s;
        }
        .menu-grid button:hover { background: #f8fafc; transform: translateY(-2px); }
        .grid-icon { width: 44px; height: 44px; border-radius: 14px; display: flex; align-items: center; justify-content: center; }
        .menu-grid span { font-size: 11px; font-weight: 700; color: #64748b; }

        .attachment-previews {
          padding: 12px 24px; border-top: 1px solid #f1f5f9; display: flex; gap: 12px;
          overflow-x: auto; background: #fafafa;
        }
        .preview-card {
          width: 100px; height: 100px; background: white; border-radius: 12px;
          border: 1px solid #e2e8f0; position: relative; flex-shrink: 0;
          display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 10px;
        }
        .preview-card img { width: 100%; height: 60px; object-fit: cover; border-radius: 6px; }
        .preview-card span { font-size: 10px; color: #64748b; margin-top: 6px; width: 100%; text-align: center; }
        .preview-card button { position: absolute; top: -6px; right: -6px; background: #ef4444; color: white; border: none; border-radius: 50%; width: 20px; height: 20px; cursor: pointer; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 8px rgba(239, 68, 68, 0.3); }

        /* Rich Content Rendering */
        .attachments-container { margin-bottom: 8px; display: flex; flex-direction: column; gap: 8px; }
        .img-attachment { position: relative; border-radius: 12px; overflow: hidden; border: 1px solid rgba(0,0,0,0.05); }
        .img-attachment img { width: 100%; max-height: 300px; object-fit: cover; }
        .img-overlay { position: absolute; inset: 0; background: rgba(0,0,0,0.3); opacity: 0; transition: 0.2s; display: flex; align-items: center; justify-content: center; }
        .img-attachment:hover .img-overlay { opacity: 1; }
        .img-overlay a { color: white; background: rgba(255,255,255,0.2); backdrop-filter: blur(4px); padding: 8px; border-radius: 50%; }

        .file-attachment { background: rgba(255,255,255,0.1); border: 1px solid rgba(255,255,255,0.2); border-radius: 12px; padding: 10px; display: flex; align-items: center; gap: 12px; }
        .received .file-attachment { background: white; border-color: #e2e8f0; }
        .file-icon { width: 36px; height: 36px; background: rgba(255,255,255,0.2); border-radius: 10px; display: flex; align-items: center; justify-content: center; color: white; }
        .received .file-icon { background: #f1f5f9; color: #6366f1; }
        .file-info { flex: 1; min-width: 0; }
        .file-name { display: block; font-size: 13px; font-weight: 700; color: inherit; }
        .file-size { font-size: 10px; opacity: 0.7; font-weight: 600; }
        .dl-btn { color: inherit; opacity: 0.6; }

        .link-preview-bubble { background: rgba(255,255,255,0.1); border-radius: 12px; overflow: hidden; position: relative; border: 1px solid rgba(0,0,0,0.05); }
        .received .link-preview-bubble { background: white; border: 1px solid #e2e8f0; }
        .link-header { padding: 8px 12px; background: rgba(0,0,0,0.05); display: flex; gap: 8px; align-items: center; font-size: 10px; font-weight: 700; }
        .link-body { padding: 12px; display: flex; justify-content: space-between; align-items: center; }
        .link-text h4 { margin: 0; font-size: 14px; font-weight: 800; }
        .link-text p { margin: 4px 0 0; font-size: 11px; opacity: 0.7; }
        .link-overlay { position: absolute; inset: 0; z-index: 1; }

        .code-attachment { background: #1e293b; border-radius: 12px; overflow: hidden; }
        .code-header { background: #0f172a; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-weight: 700; color: #94a3b8; }
        .code-attachment pre { padding: 16px; margin: 0; overflow-x: auto; color: #e2e8f0; font-size: 12px; font-family: 'JetBrains Mono', monospace; }

        .poll-attachment { background: rgba(255,255,255,0.1); border-radius: 16px; padding: 16px; border: 1px solid rgba(255,255,255,0.2); }
        .received .poll-attachment { background: white; border-color: #e2e8f0; }
        .poll-q { font-size: 16px; font-weight: 800; margin: 0 0 16px; }
        .poll-options { display: flex; flex-direction: column; gap: 8px; }
        .poll-opt {
          position: relative; height: 48px; border: none; background: rgba(0,0,0,0.05);
          border-radius: 10px; overflow: hidden; cursor: pointer; color: inherit;
          display: flex; justify-content: space-between; align-items: center; padding: 0 16px;
        }
        .opt-bg { position: absolute; inset: 0; background: #6366f1; opacity: 0.3; transition: 0.4s ease; }
        .opt-name { position: relative; font-weight: 700; font-size: 13px; }
        .opt-pct { position: relative; font-weight: 800; font-size: 13px; }
        .poll-footer { margin-top: 12px; font-size: 11px; font-weight: 700; opacity: 0.7; }

        /* Bubble Actions & Pins */
        .msg-bubble-container { position: relative; max-width: 65%; display: flex; gap: 8px; align-items: flex-start; }
        .sent .msg-bubble-container { flex-direction: row-reverse; }
        .bubble-actions { opacity: 0; transition: 0.2s; display: flex; flex-direction: column; gap: 4px; padding-top: 4px; }
        .msg-wrap:hover .bubble-actions { opacity: 1; }
        .bubble-actions button { background: white; border: 1px solid #e2e8f0; color: #64748b; width: 26px; height: 26px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .pin-indicator { color: #6366f1; padding: 4px; border-radius: 50%; background: #eef2ff; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 10px rgba(99, 102, 241, 0.2); }

        /* Sub-Modals */
        .sub-modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.4); z-index: 200000; display: flex; align-items: center; justify-content: center; }
        .sub-modal-card { width: 450px; background: white; border-radius: 24px; box-shadow: 0 40px 80px rgba(0,0,0,0.25); }
        .sub-header { padding: 20px 24px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f1f5f9; }
        .sub-header h3 { margin: 0; font-size: 18px; font-weight: 800; }
        .sub-body { padding: 24px; display: flex; flex-direction: column; gap: 16px; }
        .code-textarea { width: 100%; height: 300px; padding: 16px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; font-family: monospace; }
        .poll-builder input { padding: 12px; border-radius: 10px; border: 1px solid #e2e8f0; width: 100%; margin-bottom: 8px; }
        .add-opt-btn { background: none; border: 1px dashed #6366f1; color: #6366f1; padding: 10px; border-radius: 10px; font-weight: 700; cursor: pointer; }
        .sub-footer { padding: 20px 24px; display: flex; gap: 12px; }
        .btn-save { flex: 1; background: #6366f1; color: white; padding: 12px; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; }
        .btn-cancel { padding: 12px 20px; background: #f1f5f9; color: #64748b; border-radius: 12px; border: none; font-weight: 700; cursor: pointer; }

        /* Notification Composer Styles */
        .notification-composer { flex: 1; display: flex; flex-direction: column; padding: 40px; background: #fff; }
        .composer-header { margin-bottom: 32px; border-bottom: 1px solid #f1f5f9; padding-bottom: 20px; }
        .composer-header h3 { font-size: 24px; font-weight: 800; color: #0f172a; margin-bottom: 8px; }
        .composer-header p { color: #64748b; font-size: 14px; }
        
        .composer-form { display: flex; flex-direction: column; gap: 24px; max-width: 600px; }
        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .input-group { display: flex; flex-direction: column; gap: 8px; }
        .input-group label { font-size: 13px; font-weight: 700; color: #475569; }
        .input-group input, .input-group select, .input-group textarea {
          padding: 12px 16px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px;
          font-size: 14px; outline: none; transition: 0.2s;
        }
        .input-group input:focus, .input-group select:focus, .input-group textarea:focus {
          border-color: #6366f1; background: #fff; box-shadow: 0 0 0 4px rgba(99, 102, 241, 0.1);
        }
        .composer-submit {
          margin-top: 10px; background: #6366f1; color: white; padding: 14px; border: none;
          border-radius: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center;
          justify-content: center; gap: 10px; transition: 0.2s; box-shadow: 0 10px 20px -5px rgba(99, 102, 241, 0.4);
        }
        .composer-submit:hover { transform: translateY(-2px); background: #4f46e5; }
        .composer-submit:active { transform: translateY(0); }

        /* Messaging Polishes */
        .reaction-bar { position: absolute; top: -32px; background: white; border-radius: 20px; padding: 4px 8px; display: flex; gap: 4px; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #f1f5f9; z-index: 5; }
        .reaction-bar::before { content: ""; position: absolute; bottom: -10px; left: 0; right: 0; height: 10px; }
        .reaction-bar.left { left: 0; }
        .reaction-bar.right { right: 0; }
        .reaction-bar button { background: transparent; border: none; font-size: 16px; cursor: pointer; padding: 4px; transition: 0.2s; border-radius: 50%; display: flex; align-items: center; justify-content: center;}
        .reaction-bar button:hover { transform: scale(1.2); background: #f8fafc; }

        .chat-inline-search { display: flex; align-items: center; gap: 8px; background: #f1f5f9; padding: 6px 12px; border-radius: 20px; }
        .chat-inline-search input { border: none; outline: none; background: transparent; font-size: 13px; width: 150px; color: #1e293b; }
        .chat-inline-search button { background: transparent; border: none; cursor: pointer; color: #64748b; display: flex; align-items: center; }

        .reactions-display { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 8px; }
        .react-chip { background: rgba(255,255,255,0.2); border: 1px solid rgba(0,0,0,0.05); padding: 2px 6px; border-radius: 10px; font-size: 11px; display: flex; align-items: center; gap: 4px; cursor: pointer; font-weight: 700; color: inherit; }
        .received .react-chip { background: #e2e8f0; border-color: transparent; color: #475569; }
        .react-chip.active { background: #eef2ff; color: #6366f1; border-color: #c7d2fe; }

        .quote-preview { background: rgba(0,0,0,0.05); border-left: 3px solid #6366f1; padding: 8px 12px; border-radius: 4px 8px 8px 4px; margin-bottom: 8px; font-size: 12px; }
        .sent .quote-preview { background: rgba(255,255,255,0.15); border-left-color: white; }
        .quote-sender { font-weight: 800; color: #6366f1; display: block; margin-bottom: 2px; }
        .sent .quote-sender { color: white; }

        .compose-area-wrapper { flex: 1; display: flex; flex-direction: column; background: #f8fafc; border-radius: 16px; border: 1px solid #f1f5f9; overflow: hidden; }
        .reply-composer-preview { background: #eef2ff; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; }
        .reply-left { display: flex; align-items: center; gap: 12px; font-size: 12px; }
        .reply-left span { font-weight: 800; color: #6366f1; }
        .reply-left p { margin: 0; color: #475569; max-width: 300px; }
        .close-reply { background: transparent; border: none; cursor: pointer; color: #94a3b8; padding: 4px; }
        .compose-area-wrapper .compose-area { border: none; background: transparent; border-radius: 0; padding: 0; }
        .compose-area-wrapper .compose-area input { padding: 4px 16px; }

        mark { background: #fef08a; color: #854d0e; padding: 0 2px; border-radius: 2px; }

        .chat-loader { display: flex; align-items: center; justify-content: center; padding: 40px; height: 100%; flex-direction: column; gap: 16px; color: #94a3b8; font-size: 14px; font-weight: 600; }
        .spinner { width: 32px; height: 32px; border: 3px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default MessagingInterface;
