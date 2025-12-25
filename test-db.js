import { db } from './server/db.js';
import { users, userProfiles } from './shared/schema.js';

const u = await db.select().from(users);
console.log('Users:', u.length);
u.forEach(x => console.log('  -', x.id, x.fullName));

const p = await db.select().from(userProfiles);
console.log('Profiles:', p.length);
p.forEach(x => console.log('  -', x.userId, 'hasPrompt:', !!x.councilSystemPrompt));

process.exit(0);