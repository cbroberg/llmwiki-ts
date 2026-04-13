import { runMigrations, initFTS } from '@llmwiki/db';
import { createApp } from './app.js';

const PORT = Number(process.env.PORT ?? 3001);

runMigrations();
initFTS();

const app = createApp();

const server = Bun.serve({
  port: PORT,
  fetch: app.fetch,
});

console.log(`LLM Wiki server running on http://localhost:${server.port}`);
