import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { initDatabase } from './db.js';
import authRoutes from './routes/auth.js';
import gamesRoutes from './routes/games.js';
import adminRoutes from './routes/admin.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Initialize DB and Seed Data
initDatabase();

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'BlockVerse Cloud Game Service',
    timestamp: new Date().toISOString()
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/games', gamesRoutes);
app.use('/api/admin', adminRoutes);

app.listen(PORT, () => {
  console.log(`====================================================`);
  console.log(`🚀 BlockVerse Cloud Game Service active on port ${PORT}`);
  console.log(`🌐 Health endpoint: http://localhost:${PORT}/api/health`);
  console.log(`🎮 Game Catalog:    http://localhost:${PORT}/api/games`);
  console.log(`====================================================`);
});
