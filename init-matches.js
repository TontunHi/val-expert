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
  console.error('Error: DATABASE_URL is not set.');
  process.exit(1);
}

const sql = neon(dbUrl);

const standardAgents = [
  { name: 'Reyna', role: 'Duelists' },
  { name: 'Jett', role: 'Duelists' },
  { name: 'Phoenix', role: 'Duelists' },
  { name: 'Iso', role: 'Duelists' },
  { name: 'Raze', role: 'Duelists' },
  { name: 'Yoru', role: 'Duelists' },
  { name: 'Neon', role: 'Duelists' },
  { name: 'Waylay', role: 'Duelists' },
  { name: 'Chamber', role: 'Sentinels' },
  { name: 'Killjoy', role: 'Sentinels' },
  { name: 'Cypher', role: 'Sentinels' },
  { name: 'Vyse', role: 'Sentinels' },
  { name: 'Sage', role: 'Sentinels' },
  { name: 'Deadlock', role: 'Sentinels' },
  { name: 'Veto', role: 'Sentinels' },
  { name: 'Sova', role: 'Initiators' },
  { name: 'Fade', role: 'Initiators' },
  { name: 'KAY/O', role: 'Initiators' },
  { name: 'Gekko', role: 'Initiators' },
  { name: 'Skye', role: 'Initiators' },
  { name: 'Breach', role: 'Initiators' },
  { name: 'Tejo', role: 'Initiators' },
  { name: 'Clove', role: 'Controllers' },
  { name: 'Viper', role: 'Controllers' },
  { name: 'Omen', role: 'Controllers' },
  { name: 'Brimstone', role: 'Controllers' },
  { name: 'Harbor', role: 'Controllers' },
  { name: 'Astra', role: 'Controllers' },
  { name: 'Miks', role: 'Controllers' }
];

const mockPlayerNames = [
  'Somchai Pro',
  'Somsak Ace',
  'Vichai Sova',
  'Panya Duelist',
  'Mana Sentinel',
  'Manee Smokes',
  'Piti Viper',
  'Chujai Omen',
  'Supa Jett',
  'Napa Breach'
];

async function init() {
  try {
    console.log('1. Creating matches and match_players tables...');
    
    // Create matches table
    await sql`
      CREATE TABLE IF NOT EXISTS matches (
        id SERIAL PRIMARY KEY,
        map_name VARCHAR(100) NOT NULL,
        winner_team VARCHAR(50) NOT NULL,
        played_at TIMESTAMP DEFAULT NOW()
      );
    `;
    console.log('✓ Matches table ready.');

    // Create match_players table
    await sql`
      CREATE TABLE IF NOT EXISTS match_players (
        id SERIAL PRIMARY KEY,
        match_id INT REFERENCES matches(id) ON DELETE CASCADE,
        user_id INT REFERENCES users(id) ON DELETE CASCADE,
        team VARCHAR(50) NOT NULL,
        agent_name VARCHAR(50) NOT NULL,
        kills INT DEFAULT 0,
        deaths INT DEFAULT 0,
        assists INT DEFAULT 0,
        combat_score INT DEFAULT 0,
        is_mvp BOOLEAN DEFAULT FALSE
      );
    `;
    console.log('✓ Match players table ready.');

    // Check existing users
    let users = await sql`SELECT id, name FROM users`;
    console.log(`Current player count in DB: ${users.length}`);

    // If less than 10 players, seed extra players to make it 10
    if (users.length < 10) {
      console.log('Adding additional mock players to have at least 10 players for matches...');
      for (const name of mockPlayerNames) {
        if (!users.some(u => u.name === name)) {
          const userResult = await sql`
            INSERT INTO users (name) VALUES (${name}) RETURNING id, name
          `;
          const newUser = userResult[0];
          users.push(newUser);

          // Seed basic role masteries
          const roles = ['Duelists', 'Initiators', 'Controllers', 'Sentinels'];
          for (let i = 0; i < roles.length; i++) {
            await sql`
              INSERT INTO role_mastery (user_id, role_name, rank)
              VALUES (${newUser.id}, ${roles[i]}, ${i + 1})
            `;
          }

          // Seed basic agent masteries
          const agentsByRole = {
            Duelists: ['Jett', 'Reyna', 'Phoenix', 'Raze'],
            Initiators: ['Sova', 'Fade', 'Gekko', 'Breach'],
            Controllers: ['Omen', 'Clove', 'Brimstone', 'Viper'],
            Sentinels: ['Killjoy', 'Cypher', 'Sage', 'Chamber']
          };

          for (const [role, agents] of Object.entries(agentsByRole)) {
            for (let i = 0; i < agents.length; i++) {
              await sql`
                INSERT INTO agent_mastery (user_id, agent_name, role_name, rank)
                VALUES (${newUser.id}, ${agents[i]}, ${role}, ${i + 1})
              `;
            }
          }
        }
      }
    }

    console.log('2. Seeding matches history...');
    
    // Check if we already have matches seeded
    const existingMatches = await sql`SELECT count(*) FROM matches`;
    if (parseInt(existingMatches[0].count, 10) > 0) {
      console.log('Matches already seeded.');
      process.exit(0);
    }

    const maps = ['Ascent', 'Bind', 'Haven', 'Sunset', 'Split'];
    
    // Let's seed 30 matches
    for (let matchIdx = 1; matchIdx <= 30; matchIdx++) {
      const mapName = maps[Math.floor(Math.random() * maps.length)];
      const winnerTeam = Math.random() > 0.5 ? 'Team A' : 'Team B';
      const playedAt = new Date(Date.now() - (31 - matchIdx) * 24 * 60 * 60 * 1000);
      
      const matchResult = await sql`
        INSERT INTO matches (map_name, winner_team, played_at)
        VALUES (${mapName}, ${winnerTeam}, ${playedAt})
        RETURNING id
      `;
      const matchId = matchResult[0].id;

      // Shuffle players and pick 10
      const shuffledUsers = [...users].sort(() => 0.5 - Math.random());
      const teamAPlayers = shuffledUsers.slice(0, 5);
      const teamBPlayers = shuffledUsers.slice(5, 10);

      const allPlayersInMatch = [];

      // Helper to generate player stats
      const addPlayerToMatch = async (user, team) => {
        // Choose a random standard agent
        const randomAgent = standardAgents[Math.floor(Math.random() * standardAgents.length)];
        const kills = Math.floor(Math.random() * 20) + 8; // 8 to 27
        const deaths = Math.floor(Math.random() * 18) + 8; // 8 to 25
        const assists = Math.floor(Math.random() * 12) + 2; // 2 to 13
        const combatScore = kills * 12 + assists * 6 + Math.floor(Math.random() * 80); // ACS

        allPlayersInMatch.push({
          userId: user.id,
          team,
          agentName: randomAgent.name,
          kills,
          deaths,
          assists,
          combatScore
        });
      };

      for (const p of teamAPlayers) await addPlayerToMatch(p, 'Team A');
      for (const p of teamBPlayers) await addPlayerToMatch(p, 'Team B');

      // Find MVP (highest combat score)
      let mvpIdx = 0;
      let highestACS = -1;
      for (let i = 0; i < allPlayersInMatch.length; i++) {
        if (allPlayersInMatch[i].combatScore > highestACS) {
          highestACS = allPlayersInMatch[i].combatScore;
          mvpIdx = i;
        }
      }

      // Insert all players
      for (let i = 0; i < allPlayersInMatch.length; i++) {
        const p = allPlayersInMatch[i];
        const isMvp = i === mvpIdx;
        
        await sql`
          INSERT INTO match_players (match_id, user_id, team, agent_name, kills, deaths, assists, combat_score, is_mvp)
          VALUES (${matchId}, ${p.userId}, ${p.team}, ${p.agentName}, ${p.kills}, ${p.deaths}, ${p.assists}, ${p.combatScore}, ${isMvp})
        `;
      }
    }

    console.log('✓ Seeded 30 matches successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Seeding matches failed:', err);
    process.exit(1);
  }
}

init();
