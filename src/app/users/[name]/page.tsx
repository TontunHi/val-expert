import React from 'react';
import { notFound } from 'next/navigation';
import { getUserByName, getUserRoleRanks, getUserAgentRanks, getUserMatches } from '@/lib/db-queries';
import { getAgentInfo, fetchPlayableAgents, fetchPlayableMaps } from '@/lib/agents-service';
import { deleteUserAction } from '../../actions';
import ProfileHeader from '@/app/components/ProfileHeader';

interface PageProps {
  params: Promise<{ name: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const decodedName = decodeURIComponent(resolvedParams.name);

  // Fetch the user by name first
  const user = await getUserByName(decodedName);
  if (!user) {
    notFound();
  }

  const userId = user.id;

  // Fetch rankings, matches, playable agents, and maps in parallel using the resolved ID
  const [roleRanks, agentRanks, matches, playableAgents, playableMaps] = await Promise.all([
    getUserRoleRanks(userId),
    getUserAgentRanks(userId),
    getUserMatches(userId),
    fetchPlayableAgents(),
    fetchPlayableMaps()
  ]);

  // Fetch agent assets from Valorant API in parallel for ranked agents
  const agentRanksWithAssets = await Promise.all(
    agentRanks.map(async (ar) => {
      const info = await getAgentInfo(ar.agent_name, ar.role_name);
      return {
        ...ar,
        info,
      };
    })
  );

  // Find the top role (role with lowest rank number)
  const actualTopRole = roleRanks.length > 0 
    ? [...roleRanks].sort((a, b) => a.rank - b.rank)[0] 
    : null;

  // Find the top agent in that top role
  const topAgentInTopRole = actualTopRole
    ? agentRanksWithAssets
        .filter((a) => a.role_name === actualTopRole.role_name)
        .sort((a, b) => a.rank - b.rank)[0]
    : null;

  const avatarUrl = topAgentInTopRole?.info?.displayIcon || null;
  const avatarFallbackText = topAgentInTopRole?.agent_name
    ? topAgentInTopRole.agent_name.slice(0, 2).toUpperCase()
    : user.name.slice(0, 2).toUpperCase();
  const avatarThemeColor = topAgentInTopRole?.info?.backgroundColor || 'var(--color-valorant)';
  const topAgentName = topAgentInTopRole?.agent_name || null;
  const topRoleName = actualTopRole?.role_name || null;

  // Group agent rankings by role
  const roles = ['Duelists', 'Initiators', 'Controllers', 'Sentinels'];
  
  // Sort roles according to user's role_mastery rank (lower rank = higher preference)
  const sortedRoles = [...roleRanks].sort((a, b) => a.rank - b.rank);
  
  // Identify if any roles are missing from the user's rankings, append them at the end
  roles.forEach(r => {
    if (!sortedRoles.some(sr => sr.role_name === r)) {
      sortedRoles.push({
        id: -1,
        user_id: userId,
        role_name: r,
        rank: 99 // unranked
      });
    }
  });

  // Client delete handler proxy
  const handleDelete = async () => {
    'use server';
    await deleteUserAction(userId);
  };

  return (
    <div>
      <ProfileHeader 
        user={user} 
        deleteAction={handleDelete} 
        avatarUrl={avatarUrl}
        avatarFallbackText={avatarFallbackText}
        avatarThemeColor={avatarThemeColor}
        topAgentName={topAgentName}
        topRoleName={topRoleName}
      />

      <h2 className="section-title">ลำดับความชำนาญตามบทบาท (Role Proficiencies)</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
        แสดงบทบาทที่ถนัดที่สุดเรียงจากซ้ายไปขวา (อันดับน้อยกว่าคือชำนาญกว่า) และความถนัดของแต่ละเอเจนต์ภายใต้บทบาทนั้นๆ
      </p>

      <div className="role-rankings-container" style={{ marginBottom: '40px' }}>
        {sortedRoles.map((roleRank) => {
          const roleName = roleRank.role_name;
          const agentsInRole = agentRanksWithAssets
            .filter((a) => a.role_name === roleName)
            .sort((a, b) => a.rank - b.rank); // Sort agents by rank

          return (
            <div key={roleName} className={`card role-ranking-card ${roleName}`}>
              <div className="role-card-header">
                <h3 className="role-card-title">{roleName}</h3>
                <span className="role-card-rank">
                  อันดับ {roleRank.rank === 99 ? '-' : roleRank.rank}
                </span>
              </div>

              <div className="agent-rank-list">
                {agentsInRole.length === 0 ? (
                  <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', fontStyle: 'italic' }}>
                    ไม่มีข้อมูลลำดับเอเจนต์
                  </p>
                ) : (
                  agentsInRole.map((agent) => (
                    <div key={agent.id} className="agent-rank-item">
                      <div className="agent-rank-name-area">
                        {agent.info.displayIcon ? (
                          <img
                            src={agent.info.displayIcon}
                            alt={agent.agent_name}
                            className="agent-mini-icon"
                          />
                        ) : (
                          <div className="agent-mini-fallback">
                            {agent.agent_name.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>
                          {agent.agent_name} {agent.info.isCustom && <span style={{ fontSize: '9px', opacity: 0.5 }}>(Custom)</span>}
                        </span>
                      </div>
                      <span className="agent-rank-val">อันดับ {agent.rank}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Match History Section */}
      <h2 className="section-title">ประวัติการแข่งขันล่าสุด (Match History)</h2>
      <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: '15px' }}>
        แสดงผลงานการเล่นจากระบบและการซิงค์ข้อมูลจริงจากเกมในแมตช์ล่าสุด
      </p>

      {matches.length === 0 ? (
        <div 
          className="card" 
          style={{ 
            padding: '32px', 
            textAlign: 'center', 
            color: 'var(--color-text-secondary)',
            border: '2px dashed rgba(236,232,225,0.08)'
          }}
        >
          ℹ️ ยังไม่พบประวัติการแข่งขันของล็อกเกอร์นี้ 
          <br/>
          <span style={{ fontSize: '13px', opacity: 0.7, display: 'block', marginTop: '6px' }}>
            กรุณาใช้ชื่อ Riot ID แล้วกดปุ่ม <strong>"ซิงค์ประวัติการเล่นจริง"</strong> ด้านบนเพื่อนำข้อมูลเข้าจากประวัติในเกมของคุณ
          </span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {matches.map((match) => {
            const agentAsset = playableAgents.find(
              (a: any) => a.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === match.agent_name.toLowerCase().replace(/[^a-z0-9]/g, '')
            );
            const isWin = match.has_won;
            const kd = match.deaths > 0 ? (match.kills / match.deaths).toFixed(2) : match.kills.toFixed(2);
            
            // Format date — use Thailand timezone (UTC+7) so the match date matches in-game time
            const dateStr = new Date(match.played_at).toLocaleString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'Asia/Bangkok'
            });

            // Find map asset for background
            const mapAsset = playableMaps.find(
              (m: any) => m.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === match.map_name.toLowerCase().replace(/[^a-z0-9]/g, '')
            );
            const mapBgImage = mapAsset?.listViewIcon || mapAsset?.splash || null;

            return (
              <div 
                key={match.match_id} 
                className="card match-card"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '16px',
                  padding: '16px 20px',
                  borderLeft: `5px solid ${isWin ? '#10b981' : '#ef4444'}`,
                  position: 'relative',
                  overflow: 'hidden',
                  background: 'rgba(20, 20, 25, 0.75)',
                  backdropFilter: 'blur(5px)',
                }}
              >
                {/* Background Map Image Overlay */}
                {mapBgImage && (
                  <div 
                    className="match-card-map-bg"
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: '100%',
                      backgroundImage: `url(${mapBgImage})`,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      opacity: 0.08,
                      transition: 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.4s ease',
                      pointerEvents: 'none',
                      zIndex: 0
                    }}
                  />
                )}

                {/* Result, Agent Icon, Map & Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', minWidth: '250px', flex: '1 1 auto', position: 'relative', zIndex: 1 }}>
                  <div 
                    style={{ 
                      fontSize: '11px', 
                      fontWeight: 800, 
                      padding: '4px 8px', 
                      borderRadius: '4px',
                      backgroundColor: isWin ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: isWin ? '#34d399' : '#f87171',
                      textTransform: 'uppercase',
                      textAlign: 'center',
                      width: '50px'
                    }}
                  >
                    {isWin ? 'WIN' : 'LOSE'}
                  </div>

                  {agentAsset?.displayIcon ? (
                    <img 
                      src={agentAsset.displayIcon} 
                      alt={match.agent_name}
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.05)'
                      }}
                    />
                  ) : (
                    <div 
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '6px',
                        backgroundColor: 'rgba(255, 70, 85, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 'bold',
                        color: 'var(--color-valorant)'
                      }}
                    >
                      {match.agent_name.slice(0, 2).toUpperCase()}
                    </div>
                  )}

                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>
                        {match.agent_name}
                      </span>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        on {match.map_name}
                      </span>
                    </div>
                    <span style={{ fontSize: '11px', color: 'gray' }}>
                      {dateStr}
                    </span>
                  </div>
                </div>

                {/* KDA Stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '20px', minWidth: '160px', position: 'relative', zIndex: 1 }}>
                  <div>
                    <div style={{ fontSize: '15px', fontWeight: 800, color: '#fff', letterSpacing: '0.5px' }}>
                      {match.kills} <span style={{ color: 'gray', fontWeight: 400 }}>/</span> {match.deaths} <span style={{ color: 'gray', fontWeight: 400 }}>/</span> {match.assists}
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      KDA Ratio: <span style={{ color: parseFloat(kd) >= 1 ? '#34d399' : '#f87171', fontWeight: 600 }}>{kd}</span>
                    </div>
                  </div>
                  {match.is_mvp && (
                    <span 
                      style={{ 
                        fontSize: '10px', 
                        fontWeight: 900, 
                        backgroundColor: '#ffca28', 
                        color: '#000', 
                        padding: '2px 6px', 
                        borderRadius: '3px',
                        boxShadow: '0 0 8px rgba(255,202,40,0.4)',
                        textTransform: 'uppercase'
                      }}
                    >
                      MVP
                    </span>
                  )}
                </div>

                {/* Combat Score / ACS */}
                <div style={{ textAlign: 'right', minWidth: '100px', position: 'relative', zIndex: 1 }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>
                    {match.combat_score > 1000 ? 'Score' : 'ACS'}
                  </span>
                  <div style={{ fontSize: '18px', fontWeight: 900, color: 'var(--color-valorant)' }}>
                    {match.combat_score.toLocaleString()}
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
