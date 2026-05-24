import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.warn('WARNING: DATABASE_URL environment variable is not defined. Using dummy URL for build step.');
}

// Fallback to a dummy URL during build if undefined so next build doesn't crash
export const sql = neon(process.env.DATABASE_URL || 'postgresql://dummy:dummy@dummy/dummy');

// Helper to initialize tables
export async function initializeDatabase() {
  try {
    // Create users table
    await sql`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `;

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

    console.log('Database initialized successfully.');
    return { success: true, message: 'Database initialized successfully.' };
  } catch (error) {
    console.error('Failed to initialize database:', error);
    return { success: false, error: String(error) };
  }
}
