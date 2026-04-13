import { runMigrations, initFTS } from './index.js';

console.log('Running migrations...');
runMigrations();
initFTS();
console.log('Migrations complete.');
