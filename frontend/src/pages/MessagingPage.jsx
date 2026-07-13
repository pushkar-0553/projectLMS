import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Send, Inbox, Megaphone, Plus, User, 
  ChevronRight, MoreVertical, Paperclip, Smile
} from 'lucide-react';
import { messageAPI, userAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import Button from '../components/common/Button';

const MessagingPage = () => {
  const { user } = useAuth();
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState('inbox');
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewMsgModal, setShowNewMsgModal] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState('');
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    fetchMessages();
    if (user.role !== 'student') {
        fetchUsers();
    }
  }, [activeTab]);

  useEffect(() => {
    if (socket) {
      const handleNewMessage = (message) => {
        // If message is for currently selected conversation, add to messages
        if (selectedConversation && 
            (message.sender_id === selectedConversation.id || message.receiver_id === selectedConversation.id)) {
          setMessages(prev => [...prev, message]);
        }
        
        // Update conversions list with latest message
        setConversations(prev => {
          const otherId = message.sender_id === user.id ? message.receiver_id : message.sender_id;
          const existingConvoIndex = prev.findIndex(c => c.id === otherId);
          
          const updatedConvo = {
            id: otherId,
            name: message.sender_name,
            lastMsg: message.content,
            time: new Date(message.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: message.sender_id !== user.id && (!selectedConversation || selectedConversation.id !== otherId)
          };

          if (existingConvoIndex > -1) {
            const newConvos = [...prev];
            newConvos.splice(existingConvoIndex, 1);
            return [updatedConvo, ...newConvos];
          } else {
            return [updatedConvo, ...prev];
          }
        });
      };

      socket.on('new_message', handleNewMessage);
      return () => socket.off('new_message', handleNewMessage);
    }
  }, [socket, selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const res = await messageAPI.getInbox();
      
      // Extract unique conversations
      const convos = [];
      const seen = new Set();
      res.data.forEach(m => {
        const otherId = m.sender_id === user.id ? m.receiver_id : m.sender_id;
        if (!seen.has(otherId) && otherId) {
          seen.add(otherId);
          convos.push({
            id: otherId,
            name: m.sender_id === user.id ? 'Loading...' : m.sender_name, // Actual name might need fetching or being in object
            displayName: m.sender_id === user.id ? (m.receiver_name || 'User') : m.sender_name,
            lastMsg: m.content,
            time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            unread: false
          });
        }
      });
      setConversations(convos);
    } catch (error) {
      console.error('Fetch messages error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
      try {
          const res = await userAPI.getAllStudents();
          setUsers(res.data);
      } catch (error) {
          console.error('Fetch users error:', error);
      }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      const msgContent = newMessage;
      setNewMessage('');
      
      await messageAPI.sendMessage({
        receiver_id: selectedConversation.id,
        content: msgContent,
        is_announcement: false
      });
      // Message will be added via socket event
    } catch (error) {
      console.error('Send message error:', error);
    }
  };

  const selectConversation = async (convo) => {
    setSelectedConversation(convo);
    // Mark as read locally
    setConversations(prev => prev.map(c => c.id === convo.id ? { ...c, unread: false } : c));
    try {
      const res = await messageAPI.getConversation(convo.id);
      setMessages(res.data);
    } catch (error) {
      console.error('Select conversation error:', error);
    }
  };

  return (
    <div className="messaging-page h-[calc(100vh-100px)] flex flex-col p-4 bg-slate-50">
      <div className="flex-1 bg-white rounded-[2.5rem] border border-slate-200 shadow-xl overflow-hidden flex">
        
        {/* Sidebar */}
        <div className="w-96 border-r border-slate-100 flex flex-col bg-white">
          <div className="p-8 pb-4">
            <div className="flex items-center justify-between mb-8">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Messages</h1>
              <button 
                className="w-10 h-10 flex items-center justify-center bg-indigo-600 text-white rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95"
                onClick={() => setShowNewMsgModal(true)}
              >
                <Plus size={24} />
              </button>
            </div>
            
            <div className="relative mb-6 group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="Search conversations..."
                className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border-none rounded-[1.25rem] text-sm focus:ring-2 focus:ring-indigo-500/20 transition-all placeholder-slate-400 font-medium"
              />
            </div>

            <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl mb-4">
              <button 
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'inbox' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('inbox')}
              >
                Direct
              </button>
              <button 
                className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${activeTab === 'announcements' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
                onClick={() => setActiveTab('announcements')}
              >
                Alerts
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-1">
            {conversations.length > 0 ? conversations.map(convo => (
              <button 
                key={convo.id}
                className={`w-full flex items-center gap-4 p-4 rounded-[1.5rem] transition-all relative ${selectedConversation?.id === convo.id ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                onClick={() => selectConversation(convo)}
              >
                <div className="relative">
                    <div className="w-14 h-14 bg-indigo-100 rounded-2xl flex items-center justify-center font-black text-indigo-600 text-lg">
                    {convo.displayName?.charAt(0) || convo.name?.charAt(0)}
                    </div>
                    <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-emerald-500 border-4 border-white rounded-full"></div>
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-sm font-bold text-slate-900 truncate pr-2">{convo.displayName || convo.name}</span>
                    <span className="text-[10px] font-bold text-slate-400">{convo.time}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <p className={`text-xs truncate ${convo.unread ? 'font-bold text-indigo-600' : 'text-slate-500'}`}>{convo.lastMsg}</p>
                    {convo.unread && <div className="w-2 h-2 bg-indigo-600 rounded-full"></div>}
                  </div>
                </div>
              </button>
            )) : (
                <div className="flex flex-col items-center justify-center h-40 opacity-50">
                    <p className="text-xs font-bold text-slate-400">No conversations</p>
                </div>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="flex-1 flex flex-col bg-slate-50/20 backdrop-blur-3xl">
          {selectedConversation ? (
            <>
              <div className="px-10 py-5 bg-white border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-white shadow-xl shadow-indigo-100">
                      {(selectedConversation.displayName || selectedConversation.name)?.charAt(0)}
                    </div>
                  </div>
                  <div>
                    <h2 className="text-base font-black text-slate-900 leading-tight">{selectedConversation.displayName || selectedConversation.name}</h2>
                    <span className="text-[11px] text-emerald-500 font-bold flex items-center gap-1.5 mt-0.5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div> Active Now
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-3 text-slate-400 hover:text-slate-900 hover:bg-slate-50 rounded-2xl transition-all"><MoreVertical size={20} /></button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-10 space-y-8 scrollbar-hide">
                {messages.map((m, index) => {
                    const isMe = m.sender_id === user.id;
                    const showHeader = index === 0 || messages[index-1].sender_id !== m.sender_id;
                    
                    return (
                        <div key={m.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                            {showHeader && (
                                <span className="text-[10px] font-bold text-slate-400 mb-2 px-1 uppercase tracking-widest">
                                    {isMe ? 'You' : m.sender_name} • {new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            )}
                            <div className={`max-w-[75%] px-5 py-4 ${isMe ? 'bg-indigo-600 text-white rounded-[1.5rem] rounded-tr-none shadow-2xl shadow-indigo-100' : 'bg-white border border-slate-100 text-slate-800 rounded-[1.5rem] rounded-tl-none shadow-lg shadow-slate-200/50'}`}>
                                <p className="text-[15px] leading-relaxed font-medium">{m.content}</p>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
              </div>

              <div className="p-8 bg-white border-t border-slate-100">
                <form onSubmit={handleSendMessage} className="flex items-center gap-4 bg-slate-50 rounded-[2rem] p-2 pl-6 border border-slate-100 focus-within:ring-4 focus-within:ring-indigo-500/5 transition-all">
                  <button type="button" className="text-slate-400 hover:text-indigo-600 transition-colors"><Paperclip size={22} /></button>
                  <input 
                    type="text" 
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type your message here..."
                    className="flex-1 bg-transparent border-none py-4 text-[15px] font-medium focus:ring-0 placeholder-slate-400"
                  />
                  <div className="flex items-center gap-3 pr-2">
                    <button type="button" className="text-slate-400 hover:text-amber-500 transition-colors"><Smile size={22} /></button>
                    <button 
                      type="submit"
                      disabled={!newMessage.trim()}
                      className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-200 hover:shadow-indigo-300 hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 active:scale-95"
                    >
                      <Send size={22} className="relative -right-0.5" />
                    </button>
                  </div>
                </form>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center">
              <div className="w-32 h-32 bg-indigo-50 text-indigo-400 rounded-complete flex items-center justify-center mb-10 shadow-inner">
                <MessageSquareIcon size={64} className="opacity-40" />
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">Select a conversation</h2>
              <p className="text-slate-500 max-w-sm leading-relaxed font-medium">Connect with mentors, coordinators, or students to start collaborating on projects in real-time.</p>
              <button 
                onClick={() => setShowNewMsgModal(true)}
                className="mt-8 px-10 py-4 bg-indigo-600 text-white font-black rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 hover:shadow-indigo-200 active:scale-95"
              >
                Start New Chat
              </button>
            </div>
          )}
        </div>
      </div>

      {/* New Message Modal */}
      {showNewMsgModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-xl p-4 animate-in fade-in duration-300">
              <div className="bg-white rounded-[3rem] w-full max-w-lg overflow-hidden shadow-[0_32px_64px_-16px_rgba(0,0,0,0.2)] animate-in zoom-in-95 duration-300 border border-slate-100">
                  <div className="p-10 pb-6 flex items-center justify-between">
                      <h2 className="text-2xl font-black text-slate-900 tracking-tight">New Message</h2>
                      <button onClick={() => setShowNewMsgModal(false)} className="w-10 h-10 flex items-center justify-center bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-2xl transition-all font-black text-xl">
                          &times;
                      </button>
                  </div>
                  <div className="px-10 pb-10 space-y-8">
                      <div>
                          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Search Personnel</label>
                          <div className="relative group">
                              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
                              <input 
                                type="text"
                                placeholder="Search by name or email..."
                                className="w-full pl-14 pr-4 py-5 bg-slate-50 border-none rounded-[1.5rem] focus:ring-4 focus:ring-indigo-500/5 transition-all text-sm font-bold shadow-inner"
                                onChange={(e) => {
                                    setRecipientSearch(e.target.value);
                                    if(e.target.value.length > 2) {
                                        setFilteredUsers(users.filter(u => u.name.toLowerCase().includes(e.target.value.toLowerCase())));
                                    } else {
                                        setFilteredUsers([]);
                                    }
                                }}
                              />
                          </div>

                          <div className="mt-6 max-h-[300px] overflow-y-auto space-y-2 pr-2">
                              {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                  <button 
                                    key={u.id}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-indigo-50/50 rounded-[1.25rem] transition-all border border-transparent hover:border-indigo-100 group"
                                    onClick={() => {
                                        selectConversation({ id: u.id, name: u.name, displayName: u.name });
                                        setShowNewMsgModal(false);
                                    }}
                                  >
                                      <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center text-sm font-black group-hover:bg-indigo-100 group-hover:text-indigo-600 transition-colors">{u.name.charAt(0)}</div>
                                      <div className="text-left">
                                        <span className="block text-sm font-black text-slate-800">{u.name}</span>
                                        <span className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider">{u.role}</span>
                                      </div>
                                  </button>
                              )) : (
                                  <div className="py-10 text-center opacity-30">
                                      <User size={40} className="mx-auto mb-2" />
                                      <p className="text-xs font-black uppercase tracking-widest">Global Search</p>
                                  </div>
                              )}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

const MessageSquareIcon = ({ size, className }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
    </svg>
);

export default MessagingPage;
