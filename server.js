const { createServer } = require('http');
const { parse } = require('url');
const next = require('next');
const { Server } = require('socket.io');

const dev = process.env.NODE_ENV !== 'production';
const hostname = 'localhost';
const port = 3000;
const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

// Unified Socket.io Config (aligned with lib/socket.ts)
const SOCKET_CONFIG = {
  path: '/api/socket/io',
  addTrailingSlash: false,
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
};

app.prepare().then(() => {
  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // Initialize Socket.io on the raw HTTP server
  const io = new Server(server, SOCKET_CONFIG);

  io.on('connection', (socket) => {
    console.log('📱 WebSocket Gateway: Client Connected ->', socket.id);
    
    socket.on('disconnect', () => {
      console.log('📱 WebSocket Gateway: Client Disconnected ->', socket.id);
    });
  });

  // Expose io instance to global scope for Next.js API route/lib access
  global.io = io;

  server.listen(port, (err) => {
    if (err) throw err;
    console.log('\n🚀 NEXUS POS Engine Started');
    console.log(`📡 Dashboard: http://${hostname}:${port}`);
    console.log(`🔌 WebSocket: ${SOCKET_CONFIG.path}\n`);
  });
});
