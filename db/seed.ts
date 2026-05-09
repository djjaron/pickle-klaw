import { db } from './db';
import { clubs, knowledgeChunks } from './schema';
import { seedClubKnowledge } from '../lib/tools';
import './neon';

async function main() {
  console.log('Seeding demo club...');

  // Create demo club
  const club = await db.insert(clubs).values({
    name: 'Pickleball Pro Club',
    slug: 'pickleball-pro-club',
    description: 'Premier pickleball facility with 8 courts, pro shop, and lessons.',
  }).returning();

  const clubId = club[0].id;
  console.log(`Created club: ${clubId}`);

  // Seed knowledge
  await seedClubKnowledge(clubId);
  console.log('Seeded club knowledge.');

  console.log('Seed complete!');
}
main().catch(console.error);
