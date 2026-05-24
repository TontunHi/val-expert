export interface ParsedRoleRank {
  roleName: string;
  rank: number;
}

export interface ParsedAgentRank {
  agentName: string;
  roleName: string;
  rank: number;
}

export interface ParseResult {
  roles: ParsedRoleRank[];
  agents: ParsedAgentRank[];
  errors: string[];
}

export function parseRankingsText(text: string): ParseResult {
  const result: ParseResult = {
    roles: [],
    agents: [],
    errors: []
  };

  const lines = text.split('\n');
  let currentRole: string | null = null;

  // Normalization maps
  const roleKeywords: { [key: string]: string } = {
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
    const rawLine = lines[i];
    const line = rawLine.trim();
    if (!line) continue;

    // Check if line is a role header
    // e.g. "Duelists (ดูเอลิสต์) 1" or "Controllers 4"
    let isRoleLine = false;
    for (const [kw, normalizedRole] of Object.entries(roleKeywords)) {
      if (line.toLowerCase().includes(kw)) {
        isRoleLine = true;
        // Extract the rank (last digits on the line)
        const match = line.match(/\d+$/);
        if (match) {
          const rank = parseInt(match[0], 10);
          // Check if already parsed this role
          if (!result.roles.some(r => r.roleName === normalizedRole)) {
            result.roles.push({ roleName: normalizedRole, rank });
          }
          currentRole = normalizedRole;
        } else {
          result.errors.push(`Line ${i + 1}: Found role "${normalizedRole}" but couldn't parse rank: "${line}"`);
        }
        break;
      }
    }

    if (isRoleLine) continue;

    // If it's not a role header, check if it's an agent ranking
    // e.g. "Phoenix 3" or "KAY/O 3" or "Harbor  6"
    if (currentRole) {
      // Look for agent name + rank. Match word characters and symbols, then spacing, then digits
      // Agent name can contain alphanumeric characters, slash (KAY/O), spaces, etc.
      const match = line.match(/^(.+?)\s+(\d+)$/);
      if (match) {
        const agentName = match[1].trim();
        const rank = parseInt(match[2], 10);
        result.agents.push({
          agentName,
          roleName: currentRole,
          rank
        });
      } else {
        result.errors.push(`Line ${i + 1}: Couldn't parse agent ranking: "${line}"`);
      }
    } else {
      result.errors.push(`Line ${i + 1}: Found text before any role header was specified: "${line}"`);
    }
  }

  return result;
}
