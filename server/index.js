import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from 'fs';

// Routes
import conductorRoutes from "./routes/conductorRoutes.js";
import playerKillsRoutes from './routes/playerKillsRoutes.js';
import gameStateRoutes from './routes/gameStateRoutes.js';
import squadGameRoutes from './routes/squadGameRoutes.js';
import roomRoutes from './routes/roomRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';
import organizerRoutes from './routes/organizerRoutes.js';
import playerRoutes from './routes/playerRoutes.js';
import squadRoutes from './routes/squadRoutes.js';
import moderatorRoutes from './routes/moderatorRoutes.js';
import historyRoutes from './routes/historyRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';

// Multi-tenant imports
import { connectGlobalDB } from "./config/dbManager.js";
import { tenantResolver } from "./middlewares/tenantResolver.js";
import { attachHistoryService } from "./middlewares/auditMiddleware.js";

dotenv.config();
const app = express();
const httpServer = createServer(app);

// CORS setup
app.use(cors({
  origin: (origin, callback) => {
    // Allow all origins for now to support various tenant subdomains
    // In production, we should validate against the Tenant list in Global DB
    callback(null, true);
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token', 'x-tenant-id'],
  credentials: true
}));

app.use(express.json());
app.set('trust proxy', true);

// Socket.io setup
const io = new Server(httpServer, {
  cors: {
    origin: "*", // allow tenant subdomains
    methods: ['GET', 'POST'],
    credentials: true,
    allowedHeaders: ['x-tenant-id']
  }
});
app.set('io', io);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Global DB Connection
connectGlobalDB().then(() => {
  console.log('🌍 Global System Initialized');
});

// GLOBAL ROUTES (No Tenant Context Required)
app.use('/api/organizers', organizerRoutes);

// Tenant Resolution Middleware for API routes
app.use("/api", tenantResolver);

// Attach History Service to all tenant API routes
app.use("/api", attachHistoryService);

// API routes
app.use("/api/conductors", conductorRoutes);
app.use('/api/kills', playerKillsRoutes);
app.use('/api/gamestate', gameStateRoutes);
app.use('/api/squadGame', squadGameRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/players', playerRoutes);
app.use('/api/squads', squadRoutes);
app.use('/api/moderators', moderatorRoutes);
app.use('/api/history', historyRoutes);
app.use('/api/audit', historyRoutes); // Audit routes are also in historyRoutes
app.use('/api/analytics', analyticsRoutes);

// Socket.io connection handler
io.on('connection', (socket) => {
  const socketId = socket.id;
  console.log(`🔌 [Socket] New connection: ${socketId}`);

  // 1. Handshake Identification
  const tenantId = socket.handshake.auth?.tenantId || socket.handshake.headers['x-tenant-id'];
  if (tenantId) {
    console.log(`🔌 [Socket] ${socketId} identified as tenant: ${tenantId} via handshake`);
    socket.join(tenantId);
  }

  // 2. Explicit Join (Safety net for SPAs)
  socket.on('join_tenant', (targetTenantId) => {
    if (!targetTenantId) return;
    console.log(`🔌 [Socket] ${socketId} explicitly joining tenant: ${targetTenantId}`);

    // Safety: Leave other tenant rooms (but keep own socket.id room)
    const currentRooms = Array.from(socket.rooms);
    currentRooms.forEach(room => {
      if (room !== socketId) socket.leave(room);
    });

    socket.join(targetTenantId);
    socket.emit('joined_tenant', { tenantId: targetTenantId, success: true });
  });

  socket.on('disconnect', (reason) => {
    console.log(`🔌 [Socket] ${socketId} disconnected. Reason: ${reason}`);
  });
});

// Serve React app static files (production)
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// SPA fallback - serve React app for all other routes (production)
app.get(/^\/(?!api|socket\.io).*/, (req, res) => {
  const indexPath = path.join(__dirname, 'client', 'dist', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).send('React app not built yet. Run: cd client && npm run build');
  }
});

const PORT = process.env.PORT || 9000;
httpServer.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));