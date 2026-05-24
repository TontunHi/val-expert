const fs = require('fs');
const path = require('path');
const { neon } = require('@neondatabase/serverless');

// Load DATABASE_URL from .env.local manually
const envPath = path.resolve(__dirname, '.env.local');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  const match = envContent.match(/DATABASE_URL\s*=\s*["']?([^"'\r\n]+)/);
  if (match) {
    process.env.DATABASE_URL = match[1];
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Error: DATABASE_URL is not set.');
  process.exit(1);
}

const sql = neon(dbUrl);

async function run() {
  try {
    console.log('Running migration: add external_match_id to matches...');
    await sql`
      ALTER TABLE matches 
      ADD COLUMN IF NOT EXISTS external_match_id VARCHAR(100) UNIQUE;
    `;
    console.log('✓ Migration completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

run();
