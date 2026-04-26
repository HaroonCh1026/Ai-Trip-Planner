import app from './app';
import connectDB from './config/database';
import config from './config/config';

const startServer = async (): Promise<void> => {
  // Connect to MongoDB before accepting requests
  await connectDB();

  const server = app.listen(config.port, () => {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`  🚀  VoyageurAI Backend`);
    console.log(`  🌍  Mode     : ${config.nodeEnv}`);
    console.log(`  📡  Server   : http://localhost:${config.port}`);
    console.log(`  🩺  Health   : http://localhost:${config.port}/health`);
    console.log(`  🔑  Admin    : ${config.adminEmail}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  });


  // ─── Graceful shutdown ───────────────────────────────────────────────────
  const shutdown = (signal: string) => {
    console.log(`\n${signal} received — shutting down gracefully...`);
    server.close(() => {
      console.log('✅  HTTP server closed');
      process.exit(0);
    });
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason: unknown) => {
    console.error('💥  Unhandled Promise Rejection:', reason);
    server.close(() => process.exit(1));
  });
};

startServer();
