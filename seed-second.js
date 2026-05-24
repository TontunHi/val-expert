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

function parseRankingsText(text) {
  const result = { roles: [], agents: [], errors: [] };
  const lines = text.split('\n');
  let currentRole = null;

  const roleKeywords = {
    duelist: 'Duelists',
    duelists: 'Duelists',
    ดูเอลิสต์: 'Duelists',
    initiator: 'Initiators',
    initiators: 'Initiators',
    อินิชิเอเตอร์: 'Initiators',
    controller: 'Controllers',
    controllers: 'Controllers',
    คอนโทรลเลอร์: 'Controllers',
    sentinel: 'Sentinels',
    sentinels: 'Sentinels',
    เซนทิเนล: 'Sentinels'
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    let isRoleLine = false;
    for (const [kw, normalizedRole] of Object.entries(roleKeywords)) {
      if (line.toLowerCase().includes(kw)) {
        isRoleLine = true;
        const match = line.match(/\d+$/);
        if (match) {
          const rank = parseInt(match[0], 10);
          if (!result.roles.some(r => r.roleName === normalizedRole)) {
            result.roles.push({ roleName: normalizedRole, rank });
          }
          currentRole = normalizedRole;
        }
        break;
      }
    }

    if (isRoleLine) continue;

    if (currentRole) {
      const match = line.match(/^(.+?)\s+(\d+)$/);
      if (match) {
        result.agents.push({
          agentName: match[1].trim(),
          roleName: currentRole,
          rank: parseInt(match[2], 10)
        });
      }
    }
  }

  return result;
}

const rawText = `Duelists (ดูเอลิสต์) 2

Phoenix 5
Jett 2
Reyna 4
Raze 3
Yoru 7
Neon 6
Iso 1
Waylay 8

 Initiators (อินิชิเอเตอร์) 3

Sova 4
Breach 1
Skye 2
KAY/O 6
Fade 7
Gekko 5
Tejo 3

Controllers (คอนโทรลเลอร์) 1

Brimstone 4
Viper 2
Omen 3
Astra 1
Harbor 5
Clove 6
Miks 7

Sentinels (เซนทิเนล) 4

Killjoy 2
Cypher 5
Sage 3
Chamber 4
Deadlock 1
Vyse 6
Veto 7`;

async function seed() {
  try {
    const name = 'ผู้ชำนาญเอเจนต์ 2 (Sample Player 2)';
    
    // Check if user already exists
    const existing = await sql`SELECT id FROM users WHERE name = ${name}`;
    if (existing.length > 0) {
      console.log('Sample Player 2 already seeded.');
      process.exit(0);
    }

    const parsed = parseRankingsText(rawText);
    console.log('Seeding user...');
    
    const userResult = await sql`
      INSERT INTO users (name) VALUES (${name}) RETURNING id
    `;
    const userId = userResult[0].id;
    console.log(`User created with ID: ${userId}`);

    // Insert roles
    for (const r of parsed.roles) {
      await sql`
        INSERT INTO role_mastery (user_id, role_name, rank) 
        VALUES (${userId}, ${r.roleName}, ${r.rank})
      `;
    }
    console.log('Role mastery seeded.');

    // Insert agents
    for (const a of parsed.agents) {
      await sql`
        INSERT INTO agent_mastery (user_id, agent_name, role_name, rank) 
        VALUES (${userId}, ${a.agentName}, ${a.roleName}, ${a.rank})
      `;
    }
    console.log('Agent mastery seeded.');
    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding failed:', err);
    process.exit(1);
  }
}

seed();
