import { getDatabase } from './database';

async function init() {
  console.log('Initializing database...');
  await getDatabase();
  console.log('✓ Database initialized successfully');
  process.exit(0);
}

init();

