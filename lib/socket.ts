import { Server as SocketIOServer } from 'socket.io';
import { Server as NetServer } from 'http';

// Use a global variable to persist the socket server across HMR in development
/* eslint-disable no-var */
declare global {
  var io: SocketIOServer | undefined;
}

export const SOCKET_PATH = '/api/socket/io';

export const SOCKET_CONFIG = {
  path: SOCKET_PATH,
  addTrailingSlash: false,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
};

export function initSocket(server: NetServer) {
  if (!global.io) {
    global.io = new SocketIOServer(server, SOCKET_CONFIG);
    
    global.io.on('connection', (socket) => {
      console.log('📱 WebSocket Client Connected:', socket.id);
      
      socket.on('disconnect', () => {
        console.log('📱 WebSocket Client Disconnected:', socket.id);
      });
    });

    console.log('✅ Socket.io Initialization Complete');
  }
  return global.io;
}

export function getIO() {
  return global.io;
}

export function emitEvent(event: string, data: any) {
  if (global.io) {
    global.io.emit(event, data);
  } else {
    console.warn(`⚠️ Failed to emit ${event}: Socket.io not initialized`);
  }
}
