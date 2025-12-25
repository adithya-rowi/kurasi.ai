import { runCouncilForUser } from './server/services/llmCouncil.js';

const userId = '0cfa3737-e508-4dd2-8235-e656c3acd99b'; // Adithya Rowi

console.log('Starting council...');
const result = await runCouncilForUser(userId);

console.log('\n=== RESULT ===');
console.log('Success:', result.success);
if (result.error) console.log('Error:', result.error);
if (result.finalBrief) {
  console.log('Brief date:', result.finalBrief.briefDate);
  console.log('Critical:', result.finalBrief.critical?.length || 0);
  console.log('Important:', result.finalBrief.important?.length || 0);
}

process.exit(0);