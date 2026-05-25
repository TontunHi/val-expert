'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { parseRankingsText } from '@/lib/parser';
import { addUserWithData, deleteUser, updateUsername, updateUserWithData, addMatchWithPlayers, checkMatchExists, getUserById, getAllUsers } from '@/lib/db-queries';

export interface ActionResponse {
  success: boolean;
  error?: string;
  userId?: number;
}

export async function createUserAction(formData: FormData): Promise<ActionResponse> {
  const name = formData.get('name') as string;
  const rawText = formData.get('rankingsText') as string;

  if (!name || name.trim().length === 0) {
    return { success: false, error: 'กรุณากรอกชื่อผู้ใช้งาน (Please enter username)' };
  }

  if (!rawText || rawText.trim().length === 0) {
    return { success: false, error: 'กรุณากรอกข้อมูลลำดับความชำนาญ (Please enter ranking data)' };
  }

  // Parse text
  const parsed = parseRankingsText(rawText);
  if (parsed.errors.length > 0 && parsed.roles.length === 0 && parsed.agents.length === 0) {
    return { 
      success: false, 
      error: `ไม่สามารถนำเข้าข้อมูลได้: \n${parsed.errors.slice(0, 3).join('\n')}` 
    };
  }

  if (parsed.roles.length === 0) {
    return { success: false, error: 'ไม่พบข้อมูล Role ในข้อความที่กรอก กรุณาตรวจสอบรูปแบบข้อมูล' };
  }

  if (parsed.agents.length === 0) {
    return { success: false, error: 'ไม่พบข้อมูล Agent ในข้อความที่กรอก กรุณาตรวจสอบรูปแบบข้อมูล' };
  }

  // Save to DB
  const result = await addUserWithData(name.trim(), parsed.roles, parsed.agents);
  
  if (result.success) {
    revalidatePath('/');
    revalidatePath(`/users/${encodeURIComponent(name.trim())}`);
  }

  return result;
}

export async function deleteUserAction(userId: number) {
  const success = await deleteUser(userId);
  if (success) {
    revalidatePath('/');
    redirect('/');
  }
  return success;
}

export async function updateUsernameAction(userId: number, newName: string): Promise<ActionResponse> {
  if (!newName || newName.trim().length === 0) {
    return { success: false, error: 'กรุณากรอกชื่อผู้ใช้งาน' };
  }

  try {
    const user = await getUserById(userId);
    const oldName = user ? user.name : '';
    await updateUsername(userId, newName.trim());
    revalidatePath('/');
    if (oldName) {
      revalidatePath(`/users/${encodeURIComponent(oldName)}`);
    }
    revalidatePath(`/users/${encodeURIComponent(newName.trim())}`);
    return { success: true };
  } catch (error: any) {
    console.error('Error updating username:', error);
    if (error.message && error.message.includes('unique constraint')) {
      return { success: false, error: 'มีผู้ใช้งานชื่อนี้อยู่ในระบบแล้ว' };
    }
    return { success: false, error: String(error) };
  }
}

export async function updateUserAction(userId: number, formData: FormData): Promise<ActionResponse> {
  const name = formData.get('name') as string;
  const rawText = formData.get('rankingsText') as string;

  if (!name || name.trim().length === 0) {
    return { success: false, error: 'กรุณากรอกชื่อผู้ใช้งาน (Please enter username)' };
  }

  if (!rawText || rawText.trim().length === 0) {
    return { success: false, error: 'กรุณากรอกข้อมูลลำดับความชำนาญ (Please enter ranking data)' };
  }

  // Parse text
  const parsed = parseRankingsText(rawText);
  if (parsed.errors.length > 0 && parsed.roles.length === 0 && parsed.agents.length === 0) {
    return { 
      success: false, 
      error: `ไม่สามารถนำเข้าข้อมูลได้: \n${parsed.errors.slice(0, 3).join('\n')}` 
    };
  }

  if (parsed.roles.length === 0) {
    return { success: false, error: 'ไม่พบข้อมูล Role ในข้อความที่กรอก กรุณาตรวจสอบรูปแบบข้อมูล' };
  }

  if (parsed.agents.length === 0) {
    return { success: false, error: 'ไม่พบข้อมูล Agent ในข้อความที่กรอก กรุณาตรวจสอบรูปแบบข้อมูล' };
  }

  // Update DB
  const result = await updateUserWithData(userId, name.trim(), parsed.roles, parsed.agents);
  
  if (result.success) {
    revalidatePath('/');
    revalidatePath(`/users/${encodeURIComponent(name.trim())}`);
  }

  return result;
}

export async function createMatchAction(
  mapName: string,
  winnerTeam: string,
  players: {
    user_id: number;
    team: string;
    agent_name: string;
    kills: number;
    deaths: number;
    assists: number;
    combat_score: number;
    is_mvp: boolean;
  }[]
): Promise<ActionResponse> {
  if (!mapName) {
    return { success: false, error: 'กรุณาเลือกแผนที่' };
  }
  if (!winnerTeam) {
    return { success: false, error: 'กรุณาเลือกทีมที่ชนะ' };
  }
  if (players.length !== 10) {
    return { success: false, error: 'กรุณากรอกข้อมูลผู้เล่นให้ครบ 10 คน (ฝั่งละ 5 คน)' };
  }

  // Validate players
  const userIds = new Set(players.map(p => p.user_id));
  if (userIds.size !== 10) {
    return { success: false, error: 'กรุณาเลือกผู้เล่นที่ไม่ซ้ำกันในการแข่งขัน' };
  }

  const teamA = players.filter(p => p.team === 'Team A');
  const teamB = players.filter(p => p.team === 'Team B');
  if (teamA.length !== 5 || teamB.length !== 5) {
    return { success: false, error: 'ข้อมูลทีมต้องมีฝั่งละ 5 คน' };
  }

  // Check that there is exactly 1 MVP
  const mvpCount = players.filter(p => p.is_mvp).length;
  if (mvpCount !== 1) {
    return { success: false, error: 'ต้องมีผู้เล่น MVP ของเกมนี้เพียง 1 คน' };
  }

  const result = await addMatchWithPlayers(mapName, winnerTeam, players);
  if (result.success) {
    revalidatePath('/');
    revalidatePath('/team-builder');
  }
  return result;
}

export async function syncMatchHistoryAction(userId: number): Promise<ActionResponse & { message?: string }> {
  try {
    const user = await getUserById(userId);
    if (!user) {
      return { success: false, error: 'ไม่พบผู้ใช้งานในระบบ' };
    }

    const riotId = user.name.trim();
    if (!riotId.includes('#')) {
      return { 
        success: false, 
        error: `Riot ID รูปแบบไม่ถูกต้อง: "${riotId}" \nกรุณาตั้งชื่อผู้ใช้งานเป็นรูปแบบ Name#Tag (เช่น Apotoxin#ComeB) เพื่อให้ระบบสามารถดึงข้อมูลจริงจากเกมได้` 
      };
    }

    const [name, tag] = riotId.split('#');
    const apiKey = process.env.VALORANT_API_KEY;
    if (!apiKey) {
      return { 
        success: false, 
        error: 'กรุณากำหนดค่า VALORANT_API_KEY ในไฟล์ .env.local ในโฟลเดอร์โปรเจกต์ เพื่อดึงข้อมูล API จากระบบจริง' 
      };
    }

    let importedCount = 0;
    const dbUsers = await getAllUsers();

    // 1. Fetch live matches (up to 10) to get full 10-player stats and MVPs
    try {
      // Fetch both Competitive and Unrated live matches
      const liveModes = ['competitive', 'unrated'];
      for (const mode of liveModes) {
      const liveUrl = `https://api.henrikdev.xyz/valorant/v3/matches/ap/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${apiKey}&size=10&mode=${mode}`;
      const liveRes = await fetch(liveUrl, { next: { revalidate: 0 } });
      
      if (liveRes.status === 403 || liveRes.status === 401) {
        return { success: false, error: 'VALORANT_API_KEY ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง (Unauthorized)' };
      }
      
      if (liveRes.ok) {
        const json = await liveRes.json();
        if (json.status === 200 && json.data) {
          for (const match of json.data) {
            const externalMatchId = match.metadata?.matchid;
            if (!externalMatchId) continue;

            const exists = await checkMatchExists(externalMatchId);
            if (exists) continue;

            const mapName = match.metadata.map || 'Unknown Map';
            let winnerTeam = 'Red';
            if (match.teams?.blue?.has_won) {
              winnerTeam = 'Blue';
            } else if (match.teams?.red?.has_won) {
              winnerTeam = 'Red';
            }

            const matchPlayersInput: any[] = [];
            const allPlayersInMatch = match.players?.all_players || [];
            
            let highestScore = -1;
            let mvpPuuid = '';
            for (const p of allPlayersInMatch) {
              const score = p.stats?.score || 0;
              if (score > highestScore) {
                highestScore = score;
                mvpPuuid = p.puuid;
              }
            }

            for (const p of allPlayersInMatch) {
              const playerRiotId = `${p.name}#${p.tag}`;
              const matchedDbUser = dbUsers.find(
                u => u.name.toLowerCase().trim() === playerRiotId.toLowerCase().trim()
              );

              if (matchedDbUser) {
                matchPlayersInput.push({
                  user_id: matchedDbUser.id,
                  team: p.team,
                  agent_name: p.character,
                  kills: p.stats?.kills || 0,
                  deaths: p.stats?.deaths || 0,
                  assists: p.stats?.assists || 0,
                  combat_score: p.stats?.score || 0,
                  is_mvp: p.puuid === mvpPuuid
                });
              }
            }

            if (matchPlayersInput.length > 0) {
              const playedAt = match.metadata.game_start 
                ? new Date(match.metadata.game_start * 1000).toISOString() 
                : new Date().toISOString();

              const saveResult = await addMatchWithPlayers(mapName, winnerTeam, matchPlayersInput, externalMatchId, playedAt);
              if (saveResult.success) {
                importedCount++;
              }
            }
          }
        }
      }
      } // end for mode
    } catch (liveErr) {
      console.error('Error fetching live matches:', liveErr);
    }

    // 2. Fetch historical stored matches (Page 1 & 2, size=20) for deeper map stats history
    const pages = [1, 2];
    for (const page of pages) {
      try {
        // Fetch both Competitive and Unrated stored matches
        const storedModes = ['competitive', 'unrated'];
        for (const storedMode of storedModes) {
        const storedUrl = `https://api.henrikdev.xyz/valorant/v1/stored-matches/ap/${encodeURIComponent(name)}/${encodeURIComponent(tag)}?api_key=${apiKey}&size=20&page=${page}&mode=${storedMode}`;
        const storedRes = await fetch(storedUrl, { next: { revalidate: 0 } });
        
        if (storedRes.status === 403 || storedRes.status === 401) {
          return { success: false, error: 'VALORANT_API_KEY ไม่ถูกต้อง หรือไม่มีสิทธิ์เข้าถึง (Unauthorized)' };
        }

        if (storedRes.ok) {
          const json = await storedRes.json();
          if (json.status === 200 && json.data) {
            for (const match of json.data) {
              const externalMatchId = match.meta?.id;
              if (!externalMatchId) continue;

              const exists = await checkMatchExists(externalMatchId);
              if (exists) continue;

              const mapName = match.meta.map?.name || 'Unknown Map';
              
              let winnerTeam = 'Red';
              const redScore = match.teams?.red || 0;
              const blueScore = match.teams?.blue || 0;
              if (blueScore > redScore) {
                winnerTeam = 'Blue';
              } else if (redScore > blueScore) {
                winnerTeam = 'Red';
              }

              const stats = match.stats;
              if (stats) {
                const matchPlayersInput = [{
                  user_id: userId,
                  team: stats.team,
                  agent_name: stats.character?.name || 'Unknown Agent',
                  kills: stats.kills || 0,
                  deaths: stats.deaths || 0,
                  assists: stats.assists || 0,
                  combat_score: stats.score || 0,
                  is_mvp: false
                }];

                // Only import if we have a valid date — don't fall back to today to avoid wrong dates
                const playedAt = match.meta.started_at;
                if (!playedAt) continue; // skip matches with no timestamp to avoid wrong date labeling

                const saveResult = await addMatchWithPlayers(mapName, winnerTeam, matchPlayersInput, externalMatchId, playedAt);
                if (saveResult.success) {
                  importedCount++;
                }
              }
            }
          }
        }
        } // end for storedMode
      } catch (storedErr) {
        console.error(`Error fetching stored matches page ${page}:`, storedErr);
      }
    }

    revalidatePath('/');
    revalidatePath('/team-builder');
    if (user) {
      revalidatePath(`/users/${encodeURIComponent(user.name)}`);
    }

    return { 
      success: true, 
      message: `ซิงค์ข้อมูลประวัติการแข่งเสร็จสิ้น! นำเข้าข้อมูลสถิติใหม่ (รวมประวัติแบบ Season ย้อนหลัง) ทั้งหมด ${importedCount} แมตช์` 
    };
  } catch (error: any) {
    console.error('Error syncing match history:', error);
    return { success: false, error: String(error) };
  }
}
