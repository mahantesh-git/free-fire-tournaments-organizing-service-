import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

import playerRoutes from "./routes/playerRoutes.js";
import conductorRoutes from "./routes/conductorRoutes.js";
import playerKillsRoutes from './routes/playerKillsRoutes.js';
import { authMiddleware } from "./middlewares/accessProtect.js";
import gameStateRoutes from './routes/gameStateRoutes.js';
import squadGameRoutes from './routes/squadGameRoutes.js';


dotenv.config();
const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true
}));
app.use(express.json());

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.static(path.join(__dirname, "public")));

// Protected player registration
app.get('/playerRegistration', (req,res)=>{
  res.sendFile(path.join(__dirname,'public','playerRegistration.html'));
});

app.get('/squadScoreCard',authMiddleware,(req,res)=>{
  res.sendFile(path.join(__dirname,'public','scoreboardUpdating.html'))
})

app.get('/conducters',authMiddleware,(req,res)=>{
  res.sendFile(path.join(__dirname,'public','conductors.html'))
})

app.get('/blueprint',(req,res)=>{
  res.sendFile(path.join(__dirname,'public','blueprint.html'))
})

app.get('/scoreboard',(req,res)=>{
  res.sendFile(path.join(__dirname,'public','scoreboard.html'))
});

app.get('/squadscoreboard',(req,res)=>{
  res.sendFile(path.join(__dirname,'public','scoreboardUI.html'))
})

// MongoDB connection
mongoose.connect(process.env.MONGO_URI)
  .then(()=>console.log("✅ MongoDB connected"))
  .catch(err=>console.error(err));

// API routes
app.use("/api/players", playerRoutes);
app.use("/api/conductors", conductorRoutes);
app.use('/api/kills',playerKillsRoutes);
app.use('/api/gamestate', gameStateRoutes);
app.use('/api/squadGame', squadGameRoutes);


const PORT = process.env.PORT || 9000;
app.listen(PORT, ()=>console.log(`🚀 Server running at http://localhost:${PORT}`));
