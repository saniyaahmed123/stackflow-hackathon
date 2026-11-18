import mongoose from 'mongoose';
import { config } from './env.js';

let connectionPromise = null;

export const connectDB = async (uri = config.mongoUri) => {
  if (!uri) throw new Error('MONGO_URI is missing. Set it in the deployment environment');
  if (!connectionPromise) {
    mongoose.set('strictQuery', true);
    connectionPromise = mongoose.connect(uri).catch((error) => {
      connectionPromise = null;
      throw error;
    });
  }
  await connectionPromise;
  return mongoose.connection;
};

export const ensureDB = () => connectDB();

export const disconnectDB = async () => {
  if (connectionPromise) {
    await mongoose.disconnect();
    connectionPromise = null;
  }
};
