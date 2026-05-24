export interface AgentInfo {
  uuid?: string;
  displayName: string;
  roleName: string;
  displayIcon: string | null;
  bustPortrait: string | null;
  backgroundColor: string; // Theme color for background
  bgGradient: string; // Background gradient matching role
  description?: string;
  isCustom?: boolean;
}

// Memory cache for Valorant API agents
let cachedAgents: any[] | null = null;
let cacheTimestamp = 0;
const CACHE_DURATION = 1000 * 60 * 60; // 1 hour cache

async function fetchPlayableAgents(): Promise<any[]> {
  const now = Date.now();
  const localCache = cachedAgents;
  if (localCache && (now - cacheTimestamp < CACHE_DURATION)) {
    return localCache;
  }

  try {
    const res = await fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true', {
      next: { revalidate: 3600 } // Cache in Next.js fetch cache for 1 hour
    });
    if (!res.ok) {
      throw new Error(`Failed to fetch agents: ${res.status}`);
    }
    const data = await res.json();
    const agentsList = data.data || [];
    cachedAgents = agentsList;
    cacheTimestamp = now;
    return agentsList;
  } catch (error) {
    console.error('Error fetching agents from Valorant API:', error);
    return cachedAgents || []; // Return cached if exists, else empty
  }
}

// Normalize strings for matching (e.g. "KAY/O" -> "kayo", "Brimstone" -> "brimstone")
function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Role specific colors
export const ROLE_THEMES: { [key: string]: { primary: string; glow: string; bgGradient: string } } = {
  Duelists: {
    primary: '#ff4655', // Valorant Red
    glow: 'rgba(255, 70, 85, 0.4)',
    bgGradient: 'linear-gradient(135deg, rgba(255, 70, 85, 0.15) 0%, rgba(20, 20, 25, 0.95) 100%)'
  },
  Initiators: {
    primary: '#00f0ff', // Electric Neon Cyan
    glow: 'rgba(0, 240, 255, 0.4)',
    bgGradient: 'linear-gradient(135deg, rgba(0, 240, 255, 0.12) 0%, rgba(20, 20, 25, 0.95) 100%)'
  },
  Controllers: {
    primary: '#b026ff', // Neon Violet
    glow: 'rgba(176, 38, 255, 0.4)',
    bgGradient: 'linear-gradient(135deg, rgba(176, 38, 255, 0.12) 0%, rgba(20, 20, 25, 0.95) 100%)'
  },
  Sentinels: {
    primary: '#ffca28', // Neon Gold/Amber
    glow: 'rgba(255, 202, 40, 0.4)',
    bgGradient: 'linear-gradient(135deg, rgba(255, 202, 40, 0.12) 0%, rgba(20, 20, 25, 0.95) 100%)'
  },
  Unknown: {
    primary: '#ece8e1', // Off-white
    glow: 'rgba(236, 232, 225, 0.2)',
    bgGradient: 'linear-gradient(135deg, rgba(236, 232, 225, 0.05) 0%, rgba(20, 20, 25, 0.95) 100%)'
  }
};

export async function getAgentInfo(name: string, roleName: string): Promise<AgentInfo> {
  const agents = await fetchPlayableAgents();
  const normalizedSearch = normalizeName(name);

  // Find standard agent
  const matched = agents.find(agent => normalizeName(agent.displayName) === normalizedSearch);

  const theme = ROLE_THEMES[roleName] || ROLE_THEMES.Unknown;

  if (matched) {
    return {
      uuid: matched.uuid,
      displayName: matched.displayName,
      roleName: roleName,
      displayIcon: matched.displayIcon,
      bustPortrait: matched.bustPortrait || matched.fullPortrait || null,
      backgroundColor: theme.primary,
      bgGradient: theme.bgGradient,
      description: matched.description,
      isCustom: false
    };
  }

  // Fallback for custom agents
  return {
    displayName: name,
    roleName: roleName,
    displayIcon: null,
    bustPortrait: null,
    backgroundColor: theme.primary,
    bgGradient: theme.bgGradient,
    description: `เอเจนต์พิเศษในตำแหน่ง ${roleName}`,
    isCustom: true
  };
}
