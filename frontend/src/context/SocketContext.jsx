import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { BACKEND_BASE_URL } from '../services/api';

const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    if (user && user.token) {
      const socketUrl = import.meta.env.VITE_SOCKET_URL || BACKEND_BASE_URL || 'http://localhost:5000';
      const newSocket = io(socketUrl, {
        auth: {
          token: user.token
        },
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 3,
        reconnectionDelay: 5000,
        timeout: 5000,
        autoConnect: true
      });

      newSocket.on('connect_error', () => {
        // Handled gracefully without repeating connection refused console spam
      });

      setSocket(newSocket);

      return () => {
        newSocket.close();
      };
    }
  }, [user]);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};
