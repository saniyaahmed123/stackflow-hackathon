import { app } from './app.js';
import { config } from './config/env.js';
import { connectDB } from './config/db.js';
import { detectTransactionSupport } from './utils/transaction.js';

const start = async () => {
  try {
    await connectDB(config.mongoUri);
    const transactional = await detectTransactionSupport();
    console.log(`MongoDB connected (transactions: ${transactional ? 'enabled' : 'standalone mode'})`);
    app.listen(config.port, () => console.log(`StockFlow API listening on http://localhost:${config.port}`));
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

start();
