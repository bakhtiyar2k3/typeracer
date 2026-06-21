// Starts the real server backed by an in-memory MongoDB — handy for local demos
// and browser tests when you don't have Mongo installed. Stays up until killed.
import http from 'node:http';
import { MongoMemoryServer } from 'mongodb-memory-server';

async function main() {
  const mongo = await MongoMemoryServer.create();
  process.env.MONGODB_URI = mongo.getUri('typeracer_dev');
  process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-mem-secret';
  process.env.PORT = process.env.PORT || '4000';
  process.env.RACE_DURATION_MS = process.env.RACE_DURATION_MS || '15000';
  process.env.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  const { connectDB } = await import('../config/db.js');
  const { createApp } = await import('../app.js');
  const { initSocket } = await import('../socket/index.js');

  await connectDB();
  const app = createApp();
  const server = http.createServer(app);
  initSocket(server);
  server.listen(Number(process.env.PORT), () =>
    console.log(`MEMSERVER READY on ${process.env.PORT} (race ${process.env.RACE_DURATION_MS}ms)`)
  );

  const stop = async () => {
    server.close();
    await mongo.stop();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
