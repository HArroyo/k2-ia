const http = require('http');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');
const Redis = require('ioredis');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 3001;
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = process.env.REDIS_PORT || 6379;

console.log(`[Realtime Gateway] Iniciando en puerto ${PORT}...`);

// Conexión Redis Subscriber
let redisSub;
try {
  redisSub = new Redis({
    host: REDIS_HOST,
    port: parseInt(REDIS_PORT),
    retryStrategy(times) {
      const delay = Math.min(times * 100, 3000);
      return delay;
    }
  });

  redisSub.on('connect', () => {
    console.log(`[Redis] Conectado a ${REDIS_HOST}:${REDIS_PORT}`);
    redisSub.subscribe('k2:alerts', (err, count) => {
      if (err) {
        console.error('[Redis] Error al suscribir a k2:alerts:', err);
      } else {
        console.log(`[Redis] Suscrito a k2:alerts (${count} canal activo)`);
      }
    });
  });

  redisSub.on('message', (channel, message) => {
    if (channel === 'k2:alerts') {
      try {
        const eventData = JSON.parse(message);
        console.log(`[Realtime] Retransmitiendo evento: ${eventData.modulo}/${eventData.subtipo}`);
        io.emit('k2:alert', eventData);
      } catch (e) {
        console.error('[Realtime] Error al parsear mensaje de Redis:', e);
      }
    }
  });

  redisSub.on('error', (err) => {
    console.warn(`[Redis] Advertencia de conexión (${err.message}) - esperando reconexión.`);
  });
} catch (e) {
  console.warn('[Redis] No se pudo inicializar cliente Redis:', e.message);
}

// Eventos Socket.io
io.on('connection', (socket) => {
  console.log(`[Socket.io] Cliente conectado: ${socket.id}`);

  socket.on('disconnect', () => {
    console.log(`[Socket.io] Cliente desconectado: ${socket.id}`);
  });

  // Permitir pruebas de simulación manual
  socket.on('simulate_alert', (data) => {
    io.emit('k2:alert', data);
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'k2-realtime-gateway', timestamp: new Date().toISOString() });
});

server.listen(PORT, () => {
  console.log(`[Realtime Gateway] Escuchando en http://0.0.0.0:${PORT}`);
});
