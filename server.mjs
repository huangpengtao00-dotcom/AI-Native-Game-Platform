import { createRuntime } from './src/http.mjs';

const runtime = await createRuntime();
const address = await runtime.listen();

console.log(`AI Native Game Platform running at http://${address.address === '::' ? '127.0.0.1' : address.address}:${address.port}`);
console.log('Demo accounts: creator@example.com / password123, player@example.com / password123');

const shutdown = async (signal) => {
  console.log(`\n${signal} received. Closing server...`);
  await runtime.close();
  process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));