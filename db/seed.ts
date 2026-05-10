import { ensureDemoClub } from '../lib/db';
import './neon';

async function main() {
  console.log('Seeding demo club...');

  const club = await ensureDemoClub();
  console.log(`Demo club ready: ${club.id}`);

  console.log('Seed complete!');
}
main().catch(console.error);
