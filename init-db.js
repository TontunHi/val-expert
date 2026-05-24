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
    console.log('Loaded DATABASE_URL from .env.local');
  }
}

const dbUrl = process.env.DATABASE_URL;
if (!dbUrl) {
  console.error('Error: DATABASE_URL is not set in .env.local or environment.');
  process.exit(1);
}

const sql = neon(dbUrl);

async function run() {
  try {
    console.log('Initializing database tables...');
    
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('✓ Users table ready.');

    // Create role_mastery table
    await sql`
      CREATE TABLE IF NOT EXISTS role_mastery (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        role_name VARCHAR(50) NOT NULL,
        rank INT NOT NULL,
        UNIQUE(user_id, role_name)
      );
    `;
    console.log('✓ Role mastery table ready.');

    // Create agent_mastery table
    await sql`
      CREATE TABLE IF NOT EXISTS agent_mastery (
        id SERIAL PRIMARY KEY,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        agent_name VARCHAR(50) NOT NULL,
        role_name VARCHAR(50) NOT NULL,
        rank INT NOT NULL,
        UNIQUE(user_id, agent_name)
      );
    `;
    console.log('✓ Agent mastery table ready.');

    console.log('Database initialization completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Database initialization failed:', error);
    process.exit(1);
  }
}

run();
