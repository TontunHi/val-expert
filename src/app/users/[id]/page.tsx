import React from 'react';
import { notFound } from 'next/navigation';
import { getUserById, getUserRoleRanks, getUserAgentRanks } from '@/lib/db-queries';
import { getAgentInfo } from '@/lib/agents-service';
import { deleteUserAction } from '../../actions';
import ProfileHeader from '@/app/components/ProfileHeader';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: PageProps) {
  const resolvedParams = await params;
  const userId = parseInt(resolvedParams.id, 10);

  if (isNaN(userId)) {
    notFound();
  }

  const user = await getUserById(userId);
  if (!user) {
    notFound();
  }

  // Fetch rankings
  const roleRanks = await getUserRoleRanks(userId);
  const agentRanks = await getUserAgentRanks(userId);

  // Fetch agent assets from Valorant API in parallel
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

      <div className="role-rankings-container">
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
    </div>
  );
}
