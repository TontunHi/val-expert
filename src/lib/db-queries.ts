import { sql } from './db';
import { ParsedRoleRank, ParsedAgentRank } from './parser';

export interface User {
  id: number;
  name: string;
  created_at: string;
}

export interface UserRoleRank {
  id: number;
  user_id: number;
  role_name: string;
  rank: number;
}

export interface UserAgentRank {
  id: number;
  user_id: number;
  agent_name: string;
  role_name: string;
  rank: number;
}

export interface AgentBest {
  agent_name: string;
  role_name: string;
  rank: number;
  user_id: number;
  user_name: string;
}

export interface RoleBest {
  role_name: string;
  rank: number;
  user_id: number;
  user_name: string;
}

// Get all users
export async function getAllUsers(): Promise<User[]> {
  try {
    const rows = await sql`SELECT id, name, created_at::text FROM users ORDER BY name ASC`;
    return rows as User[];
  } catch (error) {
    console.error('Error fetching users:', error);
    return [];
  }
}

// Get user by ID
export async function getUserById(id: number): Promise<User | null> {
  try {
    const rows = await sql`SELECT id, name, created_at::text FROM users WHERE id = ${id}`;
    if (rows.length === 0) return null;
    return rows[0] as User;
  } catch (error) {
    console.error(`Error fetching user ${id}:`, error);
    return null;
  }
}

// Get user role rankings
export async function getUserRoleRanks(userId: number): Promise<UserRoleRank[]> {
  try {
    const rows = await sql`SELECT id, user_id, role_name, rank FROM role_mastery WHERE user_id = ${userId} ORDER BY rank ASC`;
    return rows as UserRoleRank[];
  } catch (error) {
    console.error(`Error fetching roles for user ${userId}:`, error);
    return [];
  }
}

// Get user agent rankings
export async function getUserAgentRanks(userId: number): Promise<UserAgentRank[]> {
  try {
    const rows = await sql`SELECT id, user_id, agent_name, role_name, rank FROM agent_mastery WHERE user_id = ${userId} ORDER BY role_name ASC, rank ASC`;
    return rows as UserAgentRank[];
  } catch (error) {
    console.error(`Error fetching agents for user ${userId}:`, error);
    return [];
  }
}

// Get leaderboards for roles (who is best in each role)
export async function getRoleLeaderboard(): Promise<RoleBest[]> {
  try {
    const rows = await sql`
      WITH ranked_roles AS (
        SELECT 
          role_name,
          user_id,
          rank,
          DENSE_RANK() OVER (PARTITION BY role_name ORDER BY rank ASC) as rnk
        FROM role_mastery
      )
      SELECT 
        rr.role_name,
        rr.rank,
        rr.user_id,
        u.name as user_name
      FROM ranked_roles rr
      JOIN users u ON rr.user_id = u.id
      WHERE rr.rnk = 1
      ORDER BY rr.role_name ASC, rr.rank ASC;
    `;
    return rows as RoleBest[];
  } catch (error) {
    console.error('Error fetching role leaderboard:', error);
    return [];
  }
}

// Get leaderboards for agents (who is best in each agent)
export async function getAgentLeaderboard(): Promise<AgentBest[]> {
  try {
    const rows = await sql`
      WITH ranked_agents AS (
        SELECT 
          agent_name,
          role_name,
          user_id,
          rank,
          DENSE_RANK() OVER (PARTITION BY agent_name ORDER BY rank ASC) as rnk
        FROM agent_mastery
      )
      SELECT 
        ra.agent_name,
        ra.role_name,
        ra.rank,
        ra.user_id,
        u.name as user_name
      FROM ranked_agents ra
      JOIN users u ON ra.user_id = u.id
      WHERE ra.rnk = 1
      ORDER BY ra.role_name ASC, ra.agent_name ASC;
    `;
    return rows as AgentBest[];
  } catch (error) {
    console.error('Error fetching agent leaderboard:', error);
    return [];
  }
}

// Add user with roles and agents
export async function addUserWithData(
  name: string,
  roles: ParsedRoleRank[],
  agents: ParsedAgentRank[]
): Promise<{ success: boolean; userId?: number; error?: string }> {
  try {
    // 1. Insert user
    const userResult = await sql`
      INSERT INTO users (name) VALUES (${name}) RETURNING id
    `;
    
    if (userResult.length === 0) {
      throw new Error('Failed to create user record.');
    }
    
    const userId = userResult[0].id as number;

    // 2. Insert role mastery
    for (const r of roles) {
      await sql`
        INSERT INTO role_mastery (user_id, role_name, rank) 
        VALUES (${userId}, ${r.roleName}, ${r.rank}) 
        ON CONFLICT (user_id, role_name) 
        DO UPDATE SET rank = ${r.rank}
      `;
    }

    // 3. Insert agent mastery
    for (const a of agents) {
      await sql`
        INSERT INTO agent_mastery (user_id, agent_name, role_name, rank) 
        VALUES (${userId}, ${a.agentName}, ${a.roleName}, ${a.rank}) 
        ON CONFLICT (user_id, agent_name) 
        DO UPDATE SET rank = ${a.rank}
      `;
    }

    return { success: true, userId };
  } catch (error: any) {
    console.error('Error adding user with data:', error);
    // If user name already exists
    if (error.message && error.message.includes('unique constraint')) {
      return { success: false, error: 'มีผู้ใช้งานชื่อนี้อยู่ในระบบแล้ว (User with this name already exists)' };
    }
    return { success: false, error: String(error) };
  }
}

// Delete user
export async function deleteUser(id: number): Promise<boolean> {
  try {
    await sql`DELETE FROM users WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error(`Error deleting user ${id}:`, error);
    return false;
  }
}

// Update user name
export async function updateUsername(id: number, newName: string): Promise<boolean> {
  try {
    await sql`UPDATE users SET name = ${newName} WHERE id = ${id}`;
    return true;
  } catch (error) {
    console.error(`Error updating username for user ${id}:`, error);
    throw error;
  }
}

export interface UserWithTopAgent {
  id: number;
  name: string;
  created_at: string;
  top_role_name: string | null;
  top_agent_name: string | null;
}

// Fetch all users with their top agent within their top role
export async function getAllUsersWithTopAgent(): Promise<UserWithTopAgent[]> {
  try {
    const rows = await sql`
      WITH user_top_role AS (
        SELECT 
          user_id,
          role_name,
          ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY rank ASC) as rn
        FROM role_mastery
      ),
      user_top_agent AS (
        SELECT 
          am.user_id,
          am.agent_name,
          am.role_name,
          ROW_NUMBER() OVER (PARTITION BY am.user_id, am.role_name ORDER BY am.rank ASC) as rn
        FROM agent_mastery am
      )
      SELECT 
        u.id,
        u.name,
        u.created_at::text,
        utr.role_name as top_role_name,
        uta.agent_name as top_agent_name
      FROM users u
      LEFT JOIN user_top_role utr ON u.id = utr.user_id AND utr.rn = 1
      LEFT JOIN user_top_agent uta ON u.id = uta.user_id AND uta.role_name = utr.role_name AND uta.rn = 1
      ORDER BY u.name ASC;
    `;
    return rows as UserWithTopAgent[];
  } catch (error) {
    console.error('Error fetching users with top agent:', error);
    return [];
  }
}

export interface PlayerWithRankings {
  id: number;
  name: string;
  roles: { role_name: string; rank: number }[];
  agents: { agent_name: string; role_name: string; rank: number }[];
}

// Fetch all users with their complete role and agent rankings in one go
export async function getAllPlayersWithRankings(): Promise<PlayerWithRankings[]> {
  try {
    const users = await sql`SELECT id, name FROM users ORDER BY name ASC`;
    const roles = await sql`SELECT user_id, role_name, rank FROM role_mastery`;
    const agents = await sql`SELECT user_id, agent_name, role_name, rank FROM agent_mastery`;

    return users.map((u: any) => {
      const userRoles = roles
        .filter((r: any) => r.user_id === u.id)
        .map((r: any) => ({ role_name: r.role_name, rank: r.rank }));
      const userAgents = agents
        .filter((a: any) => a.user_id === u.id)
        .map((a: any) => ({ agent_name: a.agent_name, role_name: a.role_name, rank: a.rank }));

      return {
        id: u.id,
        name: u.name,
        roles: userRoles,
        agents: userAgents
      };
    });
  } catch (error) {
    console.error('Error fetching all players with rankings:', error);
    return [];
  }
}




