'use client';

import React, { useState, useEffect } from 'react';

interface DBPlayer {
  id: number;
  name: string;
  roles: { role_name: string; rank: number }[];
  agents: { agent_name: string; role_name: string; rank: number }[];
}

interface TeamBuilderClientProps {
  initialPlayers: DBPlayer[];
}

interface AssignmentResult {
  player: DBPlayer;
  role: string;
  agent: string;
  roleRank: number;
  agentRank: number;
  icon: string | null;
  backgroundColor: string;
  isCustom: boolean;
}

export default function TeamBuilderClient({ initialPlayers }: TeamBuilderClientProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [composition, setComposition] = useState<{ [key: string]: number }>({
    Duelists: 1,
    Initiators: 2,
    Controllers: 1,
    Sentinels: 1
  });
  const [playerLocks, setPlayerLocks] = useState<{ [key: number]: string }>({});
  const [playerAgentLocks, setPlayerAgentLocks] = useState<{ [key: number]: string }>({});
  const [generationMode, setGenerationMode] = useState<'optimize' | 'random-balanced'>('optimize');
  const [generatedTeam, setGeneratedTeam] = useState<AssignmentResult[] | null>(null);
  const [teamScore, setTeamScore] = useState<number | null>(null);
  const [teamGrade, setTeamGrade] = useState<string>('');
  
  // Valorant API assets cache
  const [agentAssets, setAgentAssets] = useState<any[]>([]);

  useEffect(() => {
    fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true')
      .then(res => res.json())
      .then(data => {
        setAgentAssets(data.data || []);
      })
      .catch(err => console.error('Failed to load agent assets:', err));
  }, []);

  const handlePlayerCheckbox = (id: number) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(pid => pid !== id));
      // Remove lock if unchecked
      const updatedLocks = { ...playerLocks };
      delete updatedLocks[id];
      setPlayerLocks(updatedLocks);

      const updatedAgentLocks = { ...playerAgentLocks };
      delete updatedAgentLocks[id];
      setPlayerAgentLocks(updatedAgentLocks);
    } else {
      if (selectedPlayerIds.length < 5) {
        setSelectedPlayerIds([...selectedPlayerIds, id]);
        setPlayerLocks({ ...playerLocks, [id]: 'random' });
      }
    }
  };

  const handleCompChange = (role: string, val: number) => {
    const updated = { ...composition, [role]: Math.max(0, val) };
    setComposition(updated);
  };

  const handleLockChange = (playerId: number, role: string) => {
    setPlayerLocks({ ...playerLocks, [playerId]: role });
    // Reset agent lock for this player
    const updatedAgentLocks = { ...playerAgentLocks };
    delete updatedAgentLocks[playerId];
    setPlayerAgentLocks(updatedAgentLocks);
  };

  const handleAgentLockChange = (playerId: number, agent: string) => {
    setPlayerAgentLocks({ ...playerAgentLocks, [playerId]: agent });
  };

  const getCompTotal = () => {
    return Object.values(composition).reduce((a, b) => a + b, 0);
  };

  // Permutation generator helper
  function getPermutations<T>(arr: T[]): T[][] {
    if (arr.length <= 1) return [arr];
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      const subPerms = getPermutations(remaining);
      for (const sub of subPerms) {
        result.push([current, ...sub]);
      }
    }
    return result;
  }

  // Unique agent allocator using backtracking search
  function assignAgentsToRole(
    playersInRole: DBPlayer[],
    roleName: string
  ): { player: DBPlayer; agent: string; rank: number }[] | null {
    // pre-collect all agents present in database rankings for this role
    const roleAgents = Array.from(new Set(
      playersInRole.flatMap(p => p.agents.filter(a => a.role_name === roleName).map(a => a.agent_name))
    ));

    if (roleAgents.length < playersInRole.length) {
      return null; // Not enough unique agents ranked by these players
    }

    let bestAssignment: { player: DBPlayer; agent: string; rank: number }[] | null = null;
    let bestScore = Infinity;

    function search(
      playerIndex: number,
      currentAssignment: { player: DBPlayer; agent: string; rank: number }[],
      assignedAgents: Set<string>,
      currentScore: number
    ) {
      if (playerIndex === playersInRole.length) {
        if (currentScore < bestScore) {
          bestScore = currentScore;
          bestAssignment = [...currentAssignment];
        }
        return;
      }

      const player = playersInRole[playerIndex];
      const agentLock = playerAgentLocks[player.id];
      // Get player's rankings for this role
      const playerRankings = player.agents.filter(a => a.role_name === roleName);

      // Check each agent the player has ranked
      for (const rankObj of playerRankings) {
        if (agentLock && agentLock !== 'random' && rankObj.agent_name !== agentLock) {
          continue;
        }
        if (assignedAgents.has(rankObj.agent_name)) continue;

        assignedAgents.add(rankObj.agent_name);
        currentAssignment.push({ player, agent: rankObj.agent_name, rank: rankObj.rank });

        search(playerIndex + 1, currentAssignment, assignedAgents, currentScore + rankObj.rank);

        currentAssignment.pop();
        assignedAgents.delete(rankObj.agent_name);
      }
    }

    search(0, [], new Set(), 0);
    return bestAssignment;
  }

  const generateTeam = () => {
    if (selectedPlayerIds.length !== 5) {
      alert('กรุณาเลือกผู้เล่นให้ครบ 5 คน');
      return;
    }

    if (getCompTotal() !== 5) {
      alert('กรุณาเลือกสัดส่วนตำแหน่ง (Role Composition) ให้รวมกันได้ครบ 5 คน');
      return;
    }

    // Validate that locked roles do not exceed composition quotas
    const lockedRoleCounts: { [key: string]: number } = {
      Duelists: 0,
      Initiators: 0,
      Controllers: 0,
      Sentinels: 0
    };

    for (const pid of selectedPlayerIds) {
      const lock = playerLocks[pid];
      if (lock && lock !== 'random') {
        lockedRoleCounts[lock] = (lockedRoleCounts[lock] || 0) + 1;
      }
    }

    for (const [role, count] of Object.entries(composition)) {
      const lockedCount = lockedRoleCounts[role] || 0;
      if (lockedCount > count) {
        alert(`ไม่สามารถจัดทีมได้เนื่องจากมีการล็อคตำแหน่ง ${role} จำนวน ${lockedCount} คน ซึ่งเกินโควตาของบทบาทนี้ในคอมพ์ที่กำหนดไว้ (${count} คน)`);
        return;
      }
    }

    const selectedPlayers = initialPlayers.filter(p => selectedPlayerIds.includes(p.id));
    
    // Create slot array, e.g. ['Duelists', 'Initiators', 'Initiators', 'Controllers', 'Sentinels']
    const roleSlots: string[] = [];
    Object.entries(composition).forEach(([role, count]) => {
      for (let i = 0; i < count; i++) {
        roleSlots.push(role);
      }
    });

    // Generate all 120 assignments of players to slots
    const allAssignments = getPermutations(selectedPlayers);
    const validConfigs: {
      team: AssignmentResult[];
      totalScore: number;
    }[] = [];

    allAssignments.forEach(playerPerm => {
      // playerPerm is a list of 5 players corresponding to roleSlots indices
      // Check lock constraints
      let violatesLock = false;
      for (let i = 0; i < 5; i++) {
        const player = playerPerm[i];
        const lock = playerLocks[player.id];
        if (lock && lock !== 'random' && lock !== roleSlots[i]) {
          violatesLock = true;
          break;
        }
      }

      if (violatesLock) return;

      // Group players by assigned role slots
      const playersByRole: { [key: string]: DBPlayer[] } = {
        Duelists: [],
        Initiators: [],
        Controllers: [],
        Sentinels: []
      };

      for (let i = 0; i < 5; i++) {
        playersByRole[roleSlots[i]].push(playerPerm[i]);
      }

      // Assign agents inside each role uniquely
      let configValid = true;
      const assignmentsList: AssignmentResult[] = [];
      let currentConfigScore = 0;

      for (const roleName of Object.keys(playersByRole)) {
        const playersInRole = playersByRole[roleName];
        if (playersInRole.length === 0) continue;

        const allocatedAgents = assignAgentsToRole(playersInRole, roleName);
        if (!allocatedAgents) {
          configValid = false;
          break;
        }

        allocatedAgents.forEach(alloc => {
          const roleRankObj = alloc.player.roles.find(r => r.role_name === roleName);
          const roleRank = roleRankObj ? roleRankObj.rank : 4; // fallback

          // Match assets from Valorant API
          const matchedAsset = agentAssets.find(
            a => a.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === alloc.agent.toLowerCase().replace(/[^a-z0-9]/g, '')
          );

          // Get role-specific color theme
          let themeCol = '#ff4655';
          if (roleName === 'Initiators') themeCol = '#00f0ff';
          if (roleName === 'Controllers') themeCol = '#b026ff';
          if (roleName === 'Sentinels') themeCol = '#ffca28';

          assignmentsList.push({
            player: alloc.player,
            role: roleName,
            agent: alloc.agent,
            roleRank: roleRank,
            agentRank: alloc.rank,
            icon: matchedAsset?.displayIcon || null,
            backgroundColor: themeCol,
            isCustom: !matchedAsset
          });

          // Add to configuration score
          currentConfigScore += roleRank + alloc.rank;
        });
      }

      if (configValid) {
        validConfigs.push({
          team: assignmentsList,
          totalScore: currentConfigScore
        });
      }
    });

    if (validConfigs.length === 0) {
      alert('ไม่พบการจัดคอมพ์ทีมที่สอดคล้องกับล็อคและจำนวนตำแหน่งที่เลือก กรุณาตรวจสอบให้มีเอเจนต์เพียงพอ');
      return;
    }

    // Sort valid configurations by score (lower sum = better)
    validConfigs.sort((a, b) => a.totalScore - b.totalScore);

    // Select based on mode
    let selectedConfig;
    if (generationMode === 'optimize') {
      selectedConfig = validConfigs[0];
    } else {
      // Randomly select from the top 20% configurations
      const cutoff = Math.max(1, Math.ceil(validConfigs.length * 0.2));
      const topConfigs = validConfigs.slice(0, cutoff);
      const randIndex = Math.floor(Math.random() * topConfigs.length);
      selectedConfig = topConfigs[randIndex];
    }

    setGeneratedTeam(selectedConfig.team);
    setTeamScore(selectedConfig.totalScore);

    // Calculate Grade: perfect is 5 players * (rank 1 role + rank 1 agent) = 10
    const scoreVal = selectedConfig.totalScore;
    if (scoreVal <= 14) setTeamGrade('S+ (ดรีมทีมไร้พ่าย)');
    else if (scoreVal <= 18) setTeamGrade('S (ยอดเยี่ยม)');
    else if (scoreVal <= 24) setTeamGrade('A (ชำนาญสูง)');
    else if (scoreVal <= 30) setTeamGrade('B (สมดุลดี)');
    else setTeamGrade('C (พอลุยได้)');
  };

  const getInitials = (n: string) => {
    return n.slice(0, 2).toUpperCase();
  };

  return (
    <div>
      <section className="hero" style={{ padding: '40px 0 24px 0', borderBottom: 'none' }}>
        <h1 className="hero-title" style={{ fontSize: '32px' }}>จัดทีมสุ่ม & บาลานซ์ฝีมือ</h1>
        <p className="hero-subtitle" style={{ margin: 0 }}>
          เลือกผู้เล่น 5 คน กำหนดสัดส่วนตำแหน่ง ล็อคคนเล่นตัวหลัก และระบบจะสุ่มเอเจนต์และตำแหน่งที่เก่งที่สุดเฉลี่ยสมดุลให้ทีมของคุณ
        </p>
      </section>

      <div className="dashboard-grid" style={{ gap: '32px', marginTop: '24px' }}>
        {/* Left Column: Selector Form */}
        <div>
          {/* Step 1: Select 5 Players */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
              1. เลือกผู้เล่น ({selectedPlayerIds.length} / 5 คน)
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              ติ๊กเลือกผู้เล่นที่อยู่ร่วมในทีมขณะนี้ให้ครบ 5 คน
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {initialPlayers.map((player) => {
                const isChecked = selectedPlayerIds.includes(player.id);
                return (
                  <label
                    key={player.id}
                    className="user-list-item"
                    style={{
                      margin: 0,
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      cursor: 'pointer',
                      borderLeft: isChecked ? '3px solid var(--color-valorant)' : '3px solid transparent',
                      background: isChecked ? 'rgba(255, 70, 85, 0.05)' : 'rgba(0,0,0,0.15)',
                      opacity: !isChecked && selectedPlayerIds.length >= 5 ? 0.4 : 1
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => handlePlayerCheckbox(player.id)}
                      disabled={!isChecked && selectedPlayerIds.length >= 5}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: '14px', fontWeight: 600, color: isChecked ? '#fff' : 'var(--color-text-secondary)' }}>
                      {player.name}
                    </span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Step 2: Configure composition */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
              2. กำหนดสัดส่วนตำแหน่ง (ต้องรวมได้ 5 คน)
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              ระบุจำนวนคนในแต่ละตำแหน่งสำหรับคอมพ์ทีมที่ต้องการ
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
              {['Duelists', 'Initiators', 'Controllers', 'Sentinels'].map((role) => {
                const col = `var(--color-${role.toLowerCase().slice(0, -1)})`;
                return (
                  <div key={role} style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <span style={{ fontSize: '11px', fontWeight: 700, color: col, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                      {role}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleCompChange(role, composition[role] - 1)}
                        style={{ padding: '2px 8px', fontSize: '10px' }}
                      >
                        -
                      </button>
                      <span style={{ fontSize: '16px', fontWeight: 750, width: '20px' }}>
                        {composition[role]}
                      </span>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => handleCompChange(role, composition[role] + 1)}
                        style={{ padding: '2px 8px', fontSize: '10px' }}
                      >
                        +
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
            <div style={{ marginTop: '16px', fontSize: '13px', textAlign: 'right', fontWeight: 'bold' }}>
              จำนวนรวมขณะนี้: <span style={{ color: getCompTotal() === 5 ? '#34d399' : '#f87171' }}>{getCompTotal()} / 5 คน</span>
            </div>
          </div>

          {/* Step 3: Player Locks (Only show if 5 players are selected) */}
          {selectedPlayerIds.length === 5 && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
                3. ล็อคตำแหน่งผู้เล่น (Player Lock Settings)
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                เลือกบทบาทที่เจาะจงให้คนเล่น หากไม่ระบุระบบจะสุ่มและเกลี่ยตามความถนัดรวมให้
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {initialPlayers
                  .filter(p => selectedPlayerIds.includes(p.id))
                  .map(player => (
                    <div
                      key={player.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '10px 14px',
                        backgroundColor: 'rgba(0,0,0,0.15)',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.03)'
                      }}
                    >
                      <span style={{ fontWeight: 600, fontSize: '14px' }}>{player.name}</span>
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select
                          className="form-input"
                          value={playerLocks[player.id] || 'random'}
                          onChange={(e) => handleLockChange(player.id, e.target.value)}
                          style={{
                            width: '130px',
                            padding: '6px 10px',
                            fontSize: '13px',
                            backgroundColor: 'rgba(0,0,0,0.4)',
                            borderColor: 'rgba(236,232,225,0.1)'
                          }}
                        >
                          <option value="random">สุ่มตำแหน่ง</option>
                          <option value="Duelists">Locked: Duelists</option>
                          <option value="Initiators">Locked: Initiators</option>
                          <option value="Controllers">Locked: Controllers</option>
                          <option value="Sentinels">Locked: Sentinels</option>
                        </select>

                        {playerLocks[player.id] && playerLocks[player.id] !== 'random' && (
                          <select
                            className="form-input"
                            value={playerAgentLocks[player.id] || 'random'}
                            onChange={(e) => handleAgentLockChange(player.id, e.target.value)}
                            style={{
                              width: '130px',
                              padding: '6px 10px',
                              fontSize: '13px',
                              backgroundColor: 'rgba(0,0,0,0.4)',
                              borderColor: 'rgba(236,232,225,0.1)'
                            }}
                          >
                            <option value="random">สุ่มเอเจนต์</option>
                            {player.agents
                              .filter(a => a.role_name === playerLocks[player.id])
                              .sort((a, b) => a.rank - b.rank)
                              .map(a => (
                                <option key={a.agent_name} value={a.agent_name}>
                                  {a.agent_name} (#{a.rank})
                                </option>
                              ))
                            }
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Generator settings and Action */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>โหมดการจัดทีม:</span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  type="button"
                  onClick={() => setGenerationMode('optimize')}
                  className={`btn ${generationMode === 'optimize' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  จัดทีมเก่งที่สุด
                </button>
                <button
                  type="button"
                  onClick={() => setGenerationMode('random-balanced')}
                  className={`btn ${generationMode === 'random-balanced' ? 'btn-primary' : 'btn-secondary'}`}
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                >
                  จัดทีมสุ่มสมดุล
                </button>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary"
              onClick={generateTeam}
              style={{ width: '100%', padding: '12px', fontSize: '15px' }}
              disabled={selectedPlayerIds.length !== 5 || getCompTotal() !== 5}
            >
              ⚡ วิเคราะห์และจัดทีมคอมพ์ทองคำ
            </button>
          </div>
        </div>

        {/* Right Column: Generated Comp View */}
        <div>
          <h2 className="section-title">ผลลัพธ์การจัดทีมคอมพ์ทีม (Result comp)</h2>
          
          {generatedTeam ? (
            <div>
              {/* Synergy Score Dashboard Card */}
              <div 
                className="card" 
                style={{ 
                  background: 'linear-gradient(135deg, rgba(255, 70, 85, 0.1) 0%, rgba(15, 25, 35, 0.95) 100%)',
                  borderColor: 'rgba(255, 70, 85, 0.2)',
                  boxShadow: '0 4px 30px rgba(255, 70, 85, 0.1)',
                  marginBottom: '24px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '20px'
                }}
              >
                <div>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-valorant)', textTransform: 'uppercase', letterSpacing: '1px' }}>
                    Team Comp Rating
                  </span>
                  <h3 style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginTop: '4px' }}>
                    เกรดคอมพ์: {teamGrade}
                  </h3>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ fontSize: '10px', color: 'var(--color-text-secondary)', textTransform: 'uppercase' }}>คะแนนสะสมความชำนาญ</span>
                  <div style={{ fontSize: '28px', fontWeight: 900, color: 'var(--color-valorant)' }}>
                    #{teamScore}
                  </div>
                  <span style={{ fontSize: '9px', color: 'gray' }}>*(เลขน้อยคือเล่นเข้ามือกันสุด)</span>
                </div>
              </div>

              {/* Roster Cards Grid */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {generatedTeam.map((alloc) => (
                  <div
                    key={alloc.player.id}
                    className="card"
                    style={{
                      borderLeftWidth: '4px',
                      borderLeftColor: alloc.backgroundColor,
                      borderTopColor: 'rgba(255,255,255,0.03)',
                      borderRightColor: 'rgba(255,255,255,0.03)',
                      borderBottomColor: 'rgba(255,255,255,0.03)',
                      background: `linear-gradient(135deg, ${alloc.backgroundColor}10 0%, rgba(20,20,25,0.95) 100%)`,
                      padding: '16px 20px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    {/* Left details: Player and role */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      {/* circular icon */}
                      {alloc.icon ? (
                        <img
                          src={alloc.icon}
                          alt={alloc.agent}
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '8px',
                            objectFit: 'cover',
                            border: `2px solid ${alloc.backgroundColor}`,
                            boxShadow: `0 0 10px ${alloc.backgroundColor}50`,
                            backgroundColor: 'rgba(0,0,0,0.4)'
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '46px',
                            height: '46px',
                            borderRadius: '8px',
                            border: `2px solid ${alloc.backgroundColor}`,
                            backgroundColor: `${alloc.backgroundColor}20`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            color: alloc.backgroundColor,
                            fontSize: '16px'
                          }}
                        >
                          {getInitials(alloc.agent)}
                        </div>
                      )}
                      <div>
                        <h4 style={{ fontSize: '18px', fontWeight: 700, color: 'white' }}>
                          {alloc.player.name}
                        </h4>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                          <span 
                            style={{ 
                              fontSize: '10px', 
                              fontWeight: 700, 
                              color: alloc.backgroundColor,
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px' 
                            }}
                          >
                            {alloc.role}
                          </span>
                          <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>
                            (อันดับบทบาท: #{alloc.roleRank})
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right details: Agent choice */}
                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-secondary)' }}>ให้เล่นเอเจนต์</span>
                      <h5 style={{ fontSize: '18px', fontWeight: 700, color: 'white', textTransform: 'uppercase' }}>
                        {alloc.agent}
                      </h5>
                      <span style={{ fontSize: '11px', color: alloc.backgroundColor, fontWeight: 600 }}>
                        (อันดับเอเจนต์: #{alloc.agentRank})
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div 
              style={{ 
                padding: '48px 24px', 
                border: '2px dashed rgba(236,232,225,0.1)', 
                borderRadius: '8px', 
                textAlign: 'center', 
                color: 'var(--color-text-secondary)',
                fontSize: '14px' 
              }}
            >
              👈 ติ๊กเลือกผู้เล่น 5 คนและกดปุ่มวิเคราะห์ด้านซ้ายเพื่อดูผลลัพธ์จัดทีม
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
