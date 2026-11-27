import mongoose from 'mongoose';
import { config } from './env.js';

if (!global._mongoose) {
  global._mongoose = { conn: null, promise: null };
}

export const connectDB = async (uri = config.mongoUri) => {
  if (global._mongoose.conn && mongoose.connection.readyState === 1) {
    return global._mongoose.conn;
  }
  if (global._mongoose.conn) {
    global._mongoose.conn = null;
    global._mongoose.promise = null;
  }
  if (!uri) throw new Error('MONGO_URI is missing. Set it in the deployment environment');
  if (!global._mongoose.promise) {
    mongoose.set('strictQuery', true);
    global._mongoose.promise = mongoose
      .connect(uri)
      .then(() => {
        global._mongoose.conn = mongoose.connection;
        return global._mongoose.conn;
      })
      .catch((error) => {
        global._mongoose.promise = null;
        throw error;
      });
  }
  global._mongoose.conn = await global._mongoose.promise;
  return global._mongoose.conn;
};

export const ensureDB = () => connectDB();

export const disconnectDB = async () => {
  if (global._mongoose?.conn || global._mongoose?.promise) {
    await mongoose.disconnect();
    global._mongoose.conn = null;
    global._mongoose.promise = null;
  }
};
