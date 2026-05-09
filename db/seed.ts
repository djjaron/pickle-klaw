import { db } from '@/db/db';
import './neon';

async function main() {
  console.log('Seeding demo club...');
  // This runs after schema push on first deploy
  console.log('Seed complete.');
}
main();
