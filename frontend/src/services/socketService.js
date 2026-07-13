// Socket.IO Client Service
// Student Execution & Mentorship Platform

import io from 'socket.io-client'
import { useAuthStore } from '../store/authStore'
import { BACKEND_BASE_URL } from './api'

class SocketService {
  constructor() {
    this.socket = null
    this.connected = false
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 1000
    this.listeners = new Map()
  }

  initialize(token) {
    if (this.socket?.connected) {
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      try {
        this.socket = io(import.meta.env.VITE_SOCKET_URL || BACKEND_BASE_URL || 'http://localhost:5000', {
          auth: {
            token: token
          },
          transports: ['websocket', 'polling'],
          timeout: 10000,
          reconnection: true,
          reconnectionAttempts: this.maxReconnectAttempts,
          reconnectionDelay: this.reconnectDelay
        })

        // Connection events
        this.socket.on('connect', () => {
          console.log('Socket connected successfully')
          this.connected = true
          this.reconnectAttempts = 0
          this.emit('socket:connected', { timestamp: new Date() })
          resolve()
        })

        this.socket.on('disconnect', (reason) => {
          console.log('Socket disconnected:', reason)
          this.connected = false
          this.emit('socket:disconnected', { reason, timestamp: new Date() })
        })

        this.socket.on('connect_error', (error) => {
          console.error('Socket connection error:', error)
          this.reconnectAttempts++
          
          if (this.reconnectAttempts >= this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached')
            this.emit('socket:connection_failed', { error, attempts: this.reconnectAttempts })
            reject(error)
          }
        })

        // Platform-specific events
        this.setupPlatformEvents()

        // Authentication events
        this.socket.on('auth_error', (error) => {
          console.error('Socket authentication error:', error)
          this.emit('auth:failed', error)
          this.disconnect()
        })

      } catch (error) {
        console.error('Failed to initialize socket:', error)
        reject(error)
      }
    })
  }

  setupPlatformEvents() {
    // Session events
    this.socket.on('session-started', (data) => {
      console.log('Session started:', data)
      this.emit('session:started', data)
    })

    this.socket.on('session-ended', (data) => {
      console.log('Session ended:', data)
      this.emit('session:ended', data)
    })

    this.socket.on('user-joined-session', (data) => {
      console.log('User joined session:', data)
      this.emit('session:user_joined', data)
    })

    this.socket.on('user-left-session', (data) => {
      console.log('User left session:', data)
      this.emit('session:user_left', data)
    })

    this.socket.on('session-action', (data) => {
      console.log('Session action:', data)
      this.emit('session:action', data)
    })

    this.socket.on('session-participant-count', (data) => {
      this.emit('session:participant_count', data)
    })

    // Notification events
    this.socket.on('notification', (data) => {
      console.log('New notification:', data)
      this.emit('notification:new', data)
      
      // Show browser notification if permission granted
      if (Notification.permission === 'granted') {
        new Notification(data.title, {
          body: data.message,
          icon: '/favicon.ico',
          tag: data.id
        })
      }
    })

    this.socket.on('notification-count', (data) => {
      this.emit('notification:count', data)
    })

    // Project events
    this.socket.on('project-update', (data) => {
      console.log('Project update:', data)
      this.emit('project:updated', data)
    })

    // Batch activity events
    this.socket.on('batch-activity', (data) => {
      console.log('Batch activity:', data)
      this.emit('batch:activity', data)
    })

    // User presence events
    this.socket.on('online-users', (data) => {
      this.emit('users:online', data)
    })

    this.socket.on('user-typing', (data) => {
      this.emit('user:typing', data)
    })

    // Performance events
    this.socket.on('performance-update', (data) => {
      this.emit('performance:updated', data)
    })

    // Risk alerts
    this.socket.on('risk-alert', (data) => {
      console.log('Risk alert:', data)
      this.emit('risk:alert', data)
    })
  }

  // Connection management
  async connect(token) {
    if (!token) {
      throw new Error('Authentication token required')
    }
    
    return this.initialize(token)
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect()
      this.socket = null
      this.connected = false
    }
  }

  reconnect() {
    if (this.socket) {
      this.socket.connect()
    }
  }

  // Room management
  joinRoom(room) {
    if (this.socket?.connected) {
      this.socket.emit('join-room', room)
    }
  }

  leaveRoom(room) {
    if (this.socket?.connected) {
      this.socket.emit('leave-room', room)
    }
  }

  // Session management
  joinSession(sessionId) {
    if (this.socket?.connected) {
      this.socket.emit('join-session', { sessionId })
      this.joinRoom(`session:${sessionId}`)
    }
  }

  leaveSession(sessionId) {
    if (this.socket?.connected) {
      this.socket.emit('leave-session', { sessionId })
      this.leaveRoom(`session:${sessionId}`)
    }
  }

  startSession(sessionId) {
    if (this.socket?.connected) {
      this.socket.emit('session-action', { sessionId, action: 'start' })
    }
  }

  endSession(sessionId) {
    if (this.socket?.connected) {
      this.socket.emit('session-action', { sessionId, action: 'end' })
    }
  }

  sendSessionAction(sessionId, action, payload = {}) {
    if (this.socket?.connected) {
      this.socket.emit('session-action', { sessionId, action, payload })
    }
  }

  // Notification management
  markNotificationRead(notificationId) {
    if (this.socket?.connected) {
      this.socket.emit('notification-read', { notificationId })
    }
  }

  // Project updates
  sendProjectUpdate(projectId, update, studentId = null) {
    if (this.socket?.connected) {
      this.socket.emit('project-update', { projectId, update, studentId })
    }
  }

  // Typing indicators
  sendTyping(sessionId, isTyping) {
    if (this.socket?.connected) {
      this.socket.emit('typing', { sessionId, isTyping })
    }
  }

  // Event listener management
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event).add(callback)
  }

  off(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback)
    }
  }

  emit(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data)
        } catch (error) {
          console.error('Error in socket event listener:', error)
        }
      })
    }
  }

  // Utility methods
  isConnected() {
    return this.connected && this.socket?.connected
  }

  getConnectionStatus() {
    return {
      connected: this.isConnected(),
      reconnectAttempts: this.reconnectAttempts,
      socketId: this.socket?.id
    }
  }

  // Request browser notification permission
  async requestNotificationPermission() {
    if ('Notification' in window) {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    }
    return false
  }
}

// Create singleton instance
const socketService = new SocketService()

// React hook for socket integration
export const useSocket = () => {
  const { token } = useAuthStore()
  const [isConnected, setIsConnected] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState('disconnected')

  useEffect(() => {
    if (token) {
      socketService.connect(token)
        .then(() => {
          setIsConnected(true)
          setConnectionStatus('connected')
        })
        .catch((error) => {
          console.error('Failed to connect socket:', error)
          setIsConnected(false)
          setConnectionStatus('failed')
        })

      // Listen to connection events
      const handleConnected = () => {
        setIsConnected(true)
        setConnectionStatus('connected')
      }

      const handleDisconnected = () => {
        setIsConnected(false)
        setConnectionStatus('disconnected')
      }

      const handleConnectionFailed = () => {
        setIsConnected(false)
        setConnectionStatus('failed')
      }

      socketService.on('socket:connected', handleConnected)
      socketService.on('socket:disconnected', handleDisconnected)
      socketService.on('socket:connection_failed', handleConnectionFailed)

      return () => {
        socketService.off('socket:connected', handleConnected)
        socketService.off('socket:disconnected', handleDisconnected)
        socketService.off('socket:connection_failed', handleConnectionFailed)
      }
    } else {
      socketService.disconnect()
      setIsConnected(false)
      setConnectionStatus('disconnected')
    }
  }, [token])

  return {
    socket: socketService,
    isConnected,
    connectionStatus,
    joinSession: socketService.joinSession.bind(socketService),
    leaveSession: socketService.leaveSession.bind(socketService),
    startSession: socketService.startSession.bind(socketService),
    endSession: socketService.endSession.bind(socketService),
    sendSessionAction: socketService.sendSessionAction.bind(socketService),
    markNotificationRead: socketService.markNotificationRead.bind(socketService),
    sendProjectUpdate: socketService.sendProjectUpdate.bind(socketService),
    sendTyping: socketService.sendTyping.bind(socketService),
    on: socketService.on.bind(socketService),
    off: socketService.off.bind(socketService)
  }
}

export default socketService
