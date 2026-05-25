import React from 'react';
import { getAllUsersWithTopAgent, getAgentLeaderboard, getRoleLeaderboard } from '@/lib/db-queries';
import { getAgentInfo } from '@/lib/agents-service';

export const revalidate = 0; // Disable static caching so data updates instantly

export default async function DashboardPage() {
  // Fetch data in parallel
  const [users, agentLeaderboard, roleLeaderboard] = await Promise.all([
    getAllUsersWithTopAgent(),
    getAgentLeaderboard(),
    getRoleLeaderboard()
  ]);

  // Fetch agent details (portraits) for both the leaderboard and user avatars
  const uniqueAgentsSet = new Set(agentLeaderboard.map((a) => `${a.agent_name}||${a.role_name}`));
  users.forEach((u) => {
    if (u.top_agent_name && u.top_role_name) {
      uniqueAgentsSet.add(`${u.top_agent_name}||${u.top_role_name}`);
    }
  });
  const uniqueAgents = Array.from(uniqueAgentsSet);
  const agentInfoCache: { [key: string]: any } = {};
  
  await Promise.all(
    uniqueAgents.map(async (key) => {
      const [name, role] = key.split('||');
      const info = await getAgentInfo(name, role);
      agentInfoCache[key] = info;
    })
  );

  // Group agent leaders to handle ties
  const groupedAgentLeaders: {
    [agentName: string]: {
      roleName: string;
      rank: number;
      users: { id: number; name: string }[];
      info: any;
    };
  } = {};

  agentLeaderboard.forEach((lead) => {
    const name = lead.agent_name;
    const cacheKey = `${lead.agent_name}||${lead.role_name}`;
    if (!groupedAgentLeaders[name]) {
      groupedAgentLeaders[name] = {
        roleName: lead.role_name,
        rank: lead.rank,
        users: [],
        info: agentInfoCache[cacheKey],
      };
    }
    groupedAgentLeaders[name].users.push({
      id: lead.user_id,
      name: lead.user_name,
    });
  });

  // Group role leaders to handle ties
  const groupedRoleLeaders: {
    [roleName: string]: {
      rank: number;
      users: { id: number; name: string }[];
    };
  } = {};

  roleLeaderboard.forEach((lead) => {
    const role = lead.role_name;
    if (!groupedRoleLeaders[role]) {
      groupedRoleLeaders[role] = {
        rank: lead.rank,
        users: [],
      };
    }
    groupedRoleLeaders[role].users.push({
      id: lead.user_id,
      name: lead.user_name,
    });
  });

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const roles = ['Duelists', 'Initiators', 'Controllers', 'Sentinels'];

  return (
    <div>
      {/* Hero Section */}
      <section className="hero" style={{ padding: '60px 0 40px 0', borderBottom: 'none' }}>
        <h1 className="hero-title" style={{ fontSize: '44px', letterSpacing: '4px', textShadow: '0 0 20px rgba(255, 70, 85, 0.2)' }}>
          VAL<span style={{ color: 'var(--color-valorant)' }}>-Expert</span>
        </h1>
        <p className="hero-subtitle" style={{ fontSize: '15px', marginTop: '8px', color: 'var(--color-text-secondary)' }}>
          ระบบสรุปและจัดอันดับความชำนาญเอเจนต์ของทีม ค้นหาผู้เล่นที่ชำนาญที่สุดในแต่ละบทบาทหลักและรายเอเจนต์
        </p>
      </section>

      {users.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '48px 24px', margin: '20px 0' }}>
          <h2 style={{ fontSize: '20px', marginBottom: '12px' }}>ยังไม่มีข้อมูลผู้เล่นในระบบ</h2>
          <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px' }}>
            กรุณาป้อนข้อมูลผู้เล่นพร้อมความชำนาญตามบทบาทของทีมเพื่อเริ่มต้นใช้งานแดชบอร์ด
          </p>
          <a href="/users/add" className="btn btn-primary">
            เพิ่มผู้เล่นใหม่
          </a>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          {/* Top Banner: Role Leaders (Hall of Fame) */}
          <section>
            <h2 className="section-title" style={{ marginBottom: '20px' }}>บทบาทยอดฝีมือ (Role Leaders)</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px' }}>
              {roles.map((role) => {
                const leader = groupedRoleLeaders[role];
                const col = `var(--color-${role.toLowerCase().slice(0, -1)})`;
                const bgGrad = `linear-gradient(135deg, rgba(${
                  role === 'Duelists' ? '255, 70, 85' : role === 'Initiators' ? '0, 240, 255' : role === 'Controllers' ? '176, 38, 255' : '255, 202, 40'
                }, 0.1) 0%, rgba(15, 25, 35, 0.95) 100%)`;
                const glow = `0 0 15px rgba(${
                  role === 'Duelists' ? '255, 70, 85' : role === 'Initiators' ? '0, 240, 255' : role === 'Controllers' ? '176, 38, 255' : '255, 202, 40'
                }, 0.15)`;

                return (
                  <div 
                    key={role} 
                    className="card" 
                    style={{ 
                      borderLeftWidth: '4px',
                      borderLeftColor: col,
                      borderTopColor: 'rgba(255, 255, 255, 0.05)',
                      borderRightColor: 'rgba(255, 255, 255, 0.05)',
                      borderBottomColor: 'rgba(255, 255, 255, 0.05)',
                      background: bgGrad,
                      position: 'relative',
                      overflow: 'hidden',
                      padding: '20px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      height: '140px',
                      boxShadow: glow
                    }}
                  >
                    {/* Giant background letter */}
                    <div 
                      style={{ 
                        position: 'absolute', 
                        right: '-8px', 
                        bottom: '-16px', 
                        fontSize: '110px', 
                        fontWeight: 900, 
                        color: 'rgba(255, 255, 255, 0.02)', 
                        userSelect: 'none', 
                        pointerEvents: 'none' 
                      }}
                    >
                      {role[0]}
                    </div>

                    <div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '1.5px' }}>
                        {role}
                      </span>
                      <h3 style={{ fontSize: '20px', fontWeight: 700, marginTop: '8px', color: 'white', textTransform: 'uppercase' }}>
                        {leader ? leader.users.map(u => u.name.split('#')[0]).join(', ') : 'ไม่มีข้อมูล'}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 1 }}>
                      <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                        {leader ? 'ชำนาญสูงสุดในทีม' : 'รอข้อมูลการจัดอันดับ'}
                      </span>
                      {leader && (
                        <span className="badge-rank" style={{ backgroundColor: col }}>
                          #{leader.rank}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Main Content Layout */}
          <div className="dashboard-grid" style={{ gap: '40px' }}>
            {/* Left Column: Agent Leaders grouped by Role */}
            <div>
              <h2 className="section-title">ทำเนียบเอเจนต์ยอดฝีมือ (Agent Leaders)</h2>
              <p style={{ color: 'var(--color-text-secondary)', marginBottom: '32px', fontSize: '15px' }}>
                ผู้เล่นที่ได้รับการจัดอันดับให้ชำนาญสูงสุดของแต่ละเอเจนต์ (เรียงลำดับตามตำแหน่ง)
              </p>

              {roles.map((role) => {
                const agentsInRole = Object.keys(groupedAgentLeaders)
                  .filter((key) => groupedAgentLeaders[key].roleName === role)
                  .map((key) => ({
                    name: key,
                    ...groupedAgentLeaders[key],
                  }));

                if (agentsInRole.length === 0) return null;

                const col = `var(--color-${role.toLowerCase().slice(0, -1)})`;

                return (
                  <div key={role} style={{ marginBottom: '40px' }}>
                    <h3 
                      style={{ 
                        fontSize: '18px', 
                        fontWeight: 700, 
                        textTransform: 'uppercase', 
                        letterSpacing: '1.5px',
                        color: col,
                        marginBottom: '20px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                        paddingBottom: '8px'
                      }}
                    >
                      <span 
                        style={{ 
                          width: '8px', 
                          height: '8px', 
                          backgroundColor: col,
                          display: 'inline-block',
                          clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)'
                        }}
                      ></span>
                      {role} ({agentsInRole.length})
                    </h3>

                    <div className="agents-grid">
                      {agentsInRole.map((agent) => (
                        <div 
                          key={agent.name} 
                          className={`agent-master-card ${agent.roleName}`}
                          style={{
                            background: agent.info.bgGradient,
                            borderColor: 'rgba(255, 255, 255, 0.05)'
                          }}
                        >
                          <div className="agent-portrait-container">
                            {agent.info.bustPortrait ? (
                              <img
                                src={agent.info.bustPortrait}
                                alt={agent.name}
                                className="agent-portrait"
                                loading="lazy"
                              />
                            ) : (
                              <div className="custom-agent-avatar">
                                {getInitials(agent.name)}
                              </div>
                            )}
                          </div>

                          <div className="agent-info-overlay" style={{ background: 'linear-gradient(0deg, rgba(15,25,35,0.95) 0%, rgba(15,25,35,0.6) 70%, transparent 100%)' }}>
                            <h4 className="agent-name" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span>{agent.name}</span>
                              {agent.info.isCustom && <span style={{ fontSize: '9px', opacity: 0.5, border: '1px solid rgba(255,255,255,0.15)', padding: '1px 4px', borderRadius: '3px' }}>Custom</span>}
                            </h4>
                            <p className="agent-role-name" style={{ color: col, fontWeight: 700 }}>{agent.roleName}</p>
                            
                            <div className="best-user-container" style={{ background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(4px)', borderLeftWidth: '3px' }}>
                              <span className="best-label">ชำนาญสุด</span>
                              <span className="best-value" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                {agent.users.map((u, idx) => (
                                  <a 
                                    key={u.id}
                                    href={`/users/${encodeURIComponent(u.name)}`} 
                                    style={{ color: 'inherit', textDecoration: 'none', fontWeight: 700 }}
                                  >
                                    {u.name.split('#')[0]}{idx < agent.users.length - 1 ? ', ' : ''}
                                  </a>
                                ))}
                                <span className="badge-rank" style={{ marginLeft: '4px' }}>
                                  #{agent.rank}
                                </span>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right Column: Sleek Users List */}
            <div>
              <div className="card" style={{ background: 'rgba(22, 28, 35, 0.45)', borderColor: 'rgba(255, 255, 255, 0.05)', boxShadow: '0 4px 30px rgba(0,0,0,0.3)' }}>
                <h2 className="section-title">รายชื่อผู้เล่นทั้งหมด ({users.length})</h2>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: '24px', fontSize: '14px' }}>
                  คลิกที่แถวของผู้เล่นเพื่อเข้าไปดูเจาะลึกอันดับความถนัดทั้งหมด
                </p>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {users.map((user) => {
                    const cacheKey = `${user.top_agent_name}||${user.top_role_name}`;
                    const info = user.top_agent_name ? agentInfoCache[cacheKey] : null;
                    const initials = getInitials(user.name);
                    const borderCol = info?.backgroundColor || 'rgba(236, 232, 225, 0.15)';
                    const glowShadow = info?.backgroundColor ? `0 0 12px ${info.backgroundColor}30` : 'none';

                    return (
                      <a 
                        key={user.id} 
                        href={`/users/${encodeURIComponent(user.name)}`} 
                        className="user-list-item"
                        style={{ 
                          textDecoration: 'none', 
                          margin: 0,
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '14px 18px',
                          borderLeftWidth: '3px',
                          borderLeftColor: borderCol,
                          borderTopColor: 'rgba(255, 255, 255, 0.03)',
                          borderRightColor: 'rgba(255, 255, 255, 0.03)',
                          borderBottomColor: 'rgba(255, 255, 255, 0.03)',
                          boxShadow: glowShadow,
                          background: 'rgba(0,0,0,0.25)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                          {info?.displayIcon ? (
                            <img
                              src={info.displayIcon}
                              alt={user.top_agent_name || ''}
                              style={{
                                width: '38px',
                                height: '38px',
                                borderRadius: '50%',
                                objectFit: 'cover',
                                border: `2px solid ${borderCol}`,
                                boxShadow: `0 0 8px ${borderCol}50`,
                                backgroundColor: 'rgba(0, 0, 0, 0.4)'
                              }}
                            />
                          ) : (
                            <div 
                              className="user-avatar-placeholder"
                              style={{
                                width: '38px',
                                height: '38px',
                                border: `2px solid ${borderCol}`,
                                backgroundColor: borderCol === 'rgba(236, 232, 225, 0.15)' ? 'rgba(236, 232, 225, 0.05)' : borderCol,
                                color: borderCol === 'rgba(236, 232, 225, 0.15)' ? 'var(--color-text-primary)' : '#000',
                                fontWeight: 700,
                                fontSize: '14px'
                              }}
                            >
                              {user.top_agent_name ? user.top_agent_name.slice(0, 2).toUpperCase() : initials}
                            </div>
                          )}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontWeight: 700, fontSize: '15px', color: 'white' }}>
                              {user.name.split('#')[0]}
                              {user.name.includes('#') && (
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)', fontWeight: 400, marginLeft: '4px' }}>
                                  #{user.name.split('#')[1]}
                                </span>
                              )}
                            </span>
                            {user.top_agent_name ? (
                              <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                                ชำนาญสุด: <span style={{ color: borderCol, fontWeight: 600 }}>{user.top_agent_name}</span> ({user.top_role_name})
                              </span>
                            ) : (
                              <span style={{ fontSize: '11px', color: 'gray', fontStyle: 'italic' }}>ยังไม่ระบุการจัดอันดับ</span>
                            )}
                          </div>
                        </div>
                        
                        <span 
                          className="btn btn-secondary" 
                          style={{ 
                            padding: '6px 12px', 
                            fontSize: '11px', 
                            letterSpacing: '0.5px',
                            border: '1px solid rgba(255,255,255,0.05)',
                            pointerEvents: 'none'
                          }}
                        >
                          ดูข้อมูล
                        </span>
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
