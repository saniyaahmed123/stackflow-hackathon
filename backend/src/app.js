import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from './config/env.js';
import { ensureDB } from './config/db.js';
import { detectTransactionSupport } from './utils/transaction.js';
import { asyncHandler } from './utils/http.js';
import routes from './routes/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

const allowedOrigin = (origin, callback) => {
  if (!origin || origin === config.clientUrl || /\.vercel\.app$/.test(origin)) {
    return callback(null, true);
  }
  return callback(new Error('Origin not allowed by CORS'));
};

app.use(cors({ origin: allowedOrigin, credentials: true }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

app.get('/api/health', (_req, res) => res.json({ success: true, message: 'Parcel Point API is running' }));

app.use('/api', asyncHandler(async (_req, _res, next) => {
  await ensureDB();
  await detectTransactionSupport();
  next();
}));
app.use('/api', routes);
app.use('/api', (_req, res) => res.status(404).json({ success: false, message: 'Endpoint not found' }));

const clientDist = path.resolve(__dirname, '../../frontend/dist');
if (fs.existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (_req, res) => res.sendFile(path.join(clientDist, 'index.html')));
}

app.use((error, _req, res, _next) => {
  console.error(error);
  if (error.name === 'CastError') {
    return res.status(400).json({ success: false, message: `Invalid value for ${error.path}` });
  }
  if (error.code === 11000) {
    return res.status(409).json({ success: false, message: 'A record with this value already exists' });
  }
  if (error.name === 'ValidationError') {
    return res.status(400).json({ success: false, message: Object.values(error.errors).map((e) => e.message).join(', ') });
  }
  return res.status(500).json({ success: false, message: 'Server error' });
});

export { app };
