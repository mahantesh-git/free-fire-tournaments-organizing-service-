import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { createServer } from "http";
import { Server } from "socket.io";

import playerRoutes from "./routes/playerRoutes.js";
import conductorRoutes from "./routes/conductorRoutes.js";
import playerKillsRoutes from './routes/playerKillsRoutes.js';
import { authMiddleware } from "./middlewares/accessProtect.js";
import gameStateRoutes from './routes/gameStateRoutes.js';
import squadGameRoutes from './routes/squadGameRoutes.js';


dotenv.config();
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Make io accessible to routes
app.set('io', io);

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

// Protected player registration
app.get('/playerRegistration', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'playerRegistration.html'));
});

app.get('/squadScoreCard', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scoreboardUpdating.html'))
})

app.get('/conducters', authMiddleware, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'conductors.html'))
})

app.get('/blueprint', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'blueprint.html'))
})

app.get('/scoreboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scoreboard.html'))
});

app.get('/squadscoreboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scoreboardUI.html'))
})

// New modern pages
app.get('/scoreboard-realtime', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'scoreboard-realtime.html'))
})

app.get('/registration-modern', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'registration-modern.html'))
})

app.get('/admin-dashboard', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'admin-dashboard.html'))
})

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error(err));

// API routes
app.use("/api/players", playerRoutes);
app.use("/api/conductors", conductorRoutes);
app.use('/api/kills', playerKillsRoutes);
app.use('/api/gamestate', gameStateRoutes);
app.use('/api/squadGame', squadGameRoutes);

// Socket.io connection handler
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);

  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 9000;
httpServer.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));
