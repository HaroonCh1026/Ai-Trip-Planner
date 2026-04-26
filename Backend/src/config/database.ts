import mongoose from 'mongoose';
import config from './config';

const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.mongoUri);
    console.log(`✅  MongoDB connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌  MongoDB connection failed:', error);
    process.exit(1);
  }
};

mongoose.connection.on('disconnected', () =>
  console.warn('⚠️   MongoDB disconnected')
);

export default connectDB;
