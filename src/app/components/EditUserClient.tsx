'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateUserAction } from '../actions';

interface DbRole {
  role_name: string;
  rank: number;
}

interface DbAgent {
  agent_name: string;
  role_name: string;
  rank: number;
}

interface User {
  id: number;
  name: string;
}

interface PageProps {
  user: User;
  dbRoles: DbRole[];
  dbAgents: DbAgent[];
}

interface RoleState {
  name: string;
  rank: number;
}

interface AgentState {
  name: string;
  role: string;
  rank: number;
  isCustom?: boolean;
}

const ROLE_ICONS: Record<string, string> = {
  Duelists: 'https://media.valorant-api.com/agents/roles/dbe8757e-9e92-4ed4-b39f-9dfc589691d4/displayicon.png',
  Initiators: 'https://media.valorant-api.com/agents/roles/1b47567f-8f7b-444b-aae3-b0c634622d10/displayicon.png',
  Sentinels: 'https://media.valorant-api.com/agents/roles/5fc02f99-4091-4486-a531-98459a3e95e9/displayicon.png',
  Controllers: 'https://media.valorant-api.com/agents/roles/4ee40330-ecdd-4f2f-98a8-eb1243428373/displayicon.png'
};

const standardAgents = [
  // Duelists
  { name: 'Reyna', role: 'Duelists' },
  { name: 'Jett', role: 'Duelists' },
  { name: 'Phoenix', role: 'Duelists' },
  { name: 'Iso', role: 'Duelists' },
  { name: 'Raze', role: 'Duelists' },
  { name: 'Yoru', role: 'Duelists' },
  { name: 'Neon', role: 'Duelists' },
  { name: 'Waylay', role: 'Duelists' },
  // Sentinels
  { name: 'Chamber', role: 'Sentinels' },
  { name: 'Killjoy', role: 'Sentinels' },
  { name: 'Cypher', role: 'Sentinels' },
  { name: 'Vyse', role: 'Sentinels' },
  { name: 'Sage', role: 'Sentinels' },
  { name: 'Deadlock', role: 'Sentinels' },
  { name: 'Veto', role: 'Sentinels' },
  // Initiators
  { name: 'Sova', role: 'Initiators' },
  { name: 'Fade', role: 'Initiators' },
  { name: 'KAY/O', role: 'Initiators' },
  { name: 'Gekko', role: 'Initiators' },
  { name: 'Skye', role: 'Initiators' },
  { name: 'Breach', role: 'Initiators' },
  { name: 'Tejo', role: 'Initiators' },
  // Controllers
  { name: 'Clove', role: 'Controllers' },
  { name: 'Viper', role: 'Controllers' },
  { name: 'Omen', role: 'Controllers' },
  { name: 'Brimstone', role: 'Controllers' },
  { name: 'Harbor', role: 'Controllers' },
  { name: 'Astra', role: 'Controllers' },
  { name: 'Miks', role: 'Controllers' }
];

export default function EditUserClient({ user, dbRoles, dbAgents }: PageProps) {
  const router = useRouter();
  const [name, setName] = useState(user.name);
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Initialize Roles State
  const initialRolesList: RoleState[] = ['Duelists', 'Sentinels', 'Initiators', 'Controllers'].map((roleName, idx) => {
    const dbRole = dbRoles.find(r => r.role_name === roleName);
    return {
      name: roleName,
      rank: dbRole ? dbRole.rank : (idx + 1)
    };
  });

  // Initialize Agents State
  const initialAgentsList: AgentState[] = [];
  const roles = ['Duelists', 'Sentinels', 'Initiators', 'Controllers'];
  
  roles.forEach(roleName => {
    // Get DB agents for this role
    const roleDbAgents = dbAgents
      .filter(a => a.role_name === roleName)
      .sort((a, b) => a.rank - b.rank);
      
    const mappedDbAgents: AgentState[] = roleDbAgents.map(a => {
      const isStandard = standardAgents.some(sa => sa.name.toLowerCase() === a.agent_name.toLowerCase() && sa.role === roleName);
      return {
        name: a.agent_name,
        role: roleName,
        rank: a.rank,
        isCustom: !isStandard
      };
    });

    // Get Standard agents for this role that are NOT in DB
    const missingStandardAgents = standardAgents
      .filter(sa => sa.role === roleName)
      .filter(sa => !roleDbAgents.some(da => da.agent_name.toLowerCase() === sa.name.toLowerCase()));

    const merged = [...mappedDbAgents];
    missingStandardAgents.forEach((sa, idx) => {
      merged.push({
        name: sa.name,
        role: roleName,
        rank: mappedDbAgents.length + idx + 1,
        isCustom: false
      });
    });

    // Re-index ranks sequentially to be safe
    const reindexed = merged.map((a, idx) => ({ ...a, rank: idx + 1 }));
    initialAgentsList.push(...reindexed);
  });

  const [rolesState, setRolesState] = useState<RoleState[]>(initialRolesList);
  const [agentsState, setAgentsState] = useState<AgentState[]>(initialAgentsList);
  const [activeRoleTab, setActiveRoleTab] = useState('Duelists');
  const [customAgentInput, setCustomAgentInput] = useState('');
  
  // Drag and Drop States
  const [draggedAgentIndex, setDraggedAgentIndex] = useState<number | null>(null);
  const [draggedRoleIndex, setDraggedRoleIndex] = useState<number | null>(null);

  const [agentAssets, setAgentAssets] = useState<any[]>([]);

  React.useEffect(() => {
    fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true')
      .then((res) => res.json())
      .then((data) => setAgentAssets(data.data || []))
      .catch((err) => console.error('Error fetching agents:', err));
  }, []);

  // Generate RAW text rankings
  const generateRankingsTextFromVisual = (): string => {
    let text = '';
    const sortedRoles = [...rolesState].sort((a, b) => a.rank - b.rank);
    sortedRoles.forEach((r) => {
      text += `${r.name} ${r.rank}\n\n`;
      const roleAgents = agentsState
        .filter((a) => a.role === r.name)
        .sort((a, b) => a.rank - b.rank);
      
      roleAgents.forEach((a) => {
        text += `${a.name} ${a.rank}\n`;
      });
      text += '\n';
    });
    return text;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!name.trim()) {
      setErrorMessage('กรุณากรอกชื่อผู้เล่น');
      return;
    }

    const finalRankingsText = generateRankingsTextFromVisual();

    const formData = new FormData();
    formData.append('name', name);
    formData.append('rankingsText', finalRankingsText);

    startTransition(async () => {
      const response = await updateUserAction(user.id, formData);
      if (response.success) {
        router.push(`/users/${encodeURIComponent(name)}`);
        router.refresh();
      } else {
        setErrorMessage(response.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    });
  };

  // --- Visual Editor Handlers ---

  // Role Rank Up/Down
  const moveRole = (index: number, direction: 'up' | 'down') => {
    const sorted = [...rolesState].sort((a, b) => a.rank - b.rank);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap ranks
    const temp = sorted[index].rank;
    sorted[index].rank = sorted[targetIndex].rank;
    sorted[targetIndex].rank = temp;

    setRolesState([...sorted]);
  };

  // Role Rank Direct input change
  const handleRoleRankChange = (roleName: string, newRank: number) => {
    const updated = rolesState.map((r) => {
      if (r.name === roleName) {
        return { ...r, rank: Math.max(1, newRank) };
      }
      return r;
    });
    setRolesState(updated);
  };

  // Agent Rank Up/Down
  const moveAgent = (roleName: string, index: number, direction: 'up' | 'down') => {
    const roleAgents = agentsState.filter((a) => a.role === roleName).sort((a, b) => a.rank - b.rank);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= roleAgents.length) return;

    // Swap ranks
    const temp = roleAgents[index].rank;
    roleAgents[index].rank = roleAgents[targetIndex].rank;
    roleAgents[targetIndex].rank = temp;

    // Update list
    const otherAgents = agentsState.filter((a) => a.role !== roleName);
    setAgentsState([...otherAgents, ...roleAgents]);
  };

  // Agent Rank Direct input change
  const handleAgentRankChange = (agentName: string, newRank: number) => {
    const updated = agentsState.map((a) => {
      if (a.name === agentName) {
        return { ...a, rank: Math.max(1, newRank) };
      }
      return a;
    });
    setAgentsState(updated);
  };

  // Add Custom Agent to active role
  const handleAddCustomAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customAgentInput.trim();
    if (!cleanName) return;

    // Check if name already exists in this role
    const exists = agentsState.some((a) => a.role === activeRoleTab && a.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      alert('มีเอเจนต์นี้อยู่ในบทบาทนี้แล้ว');
      return;
    }

    const roleAgents = agentsState.filter((a) => a.role === activeRoleTab);
    const newAgent: AgentState = {
      name: cleanName,
      role: activeRoleTab,
      rank: roleAgents.length + 1,
      isCustom: true
    };

    setAgentsState([...agentsState, newAgent]);
    setCustomAgentInput('');
  };

  // Delete Custom Agent
  const handleDeleteCustomAgent = (agentName: string) => {
    const updated = agentsState.filter((a) => !(a.name === agentName && a.isCustom));
    // Normalize remaining agent ranks under that role
    const activeRoleAgents = updated.filter((a) => a.role === activeRoleTab).sort((a, b) => a.rank - b.rank);
    const normalized = activeRoleAgents.map((a, idx) => ({ ...a, rank: idx + 1 }));
    const otherAgents = updated.filter((a) => a.role !== activeRoleTab);
    
    setAgentsState([...otherAgents, ...normalized]);
  };

  // --- HTML5 Drag and Drop Handlers for Agents ---
  const handleAgentDragStart = (e: React.DragEvent, index: number) => {
    setDraggedAgentIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleAgentDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleAgentDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedAgentIndex === null || draggedAgentIndex === targetIndex) return;

    const roleAgents = agentsState.filter((a) => a.role === activeRoleTab).sort((a, b) => a.rank - b.rank);
    const reordered = [...roleAgents];
    const [removed] = reordered.splice(draggedAgentIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Recalculate ranks based on index
    const updated = reordered.map((a, idx) => ({ ...a, rank: idx + 1 }));
    const otherAgents = agentsState.filter((a) => a.role !== activeRoleTab);

    setAgentsState([...otherAgents, ...updated]);
    setDraggedAgentIndex(null);
  };

  // --- HTML5 Drag and Drop Handlers for Roles ---
  const handleRoleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedRoleIndex(index);
  };

  const handleRoleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleRoleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedRoleIndex === null || draggedRoleIndex === targetIndex) return;

    const sorted = [...rolesState].sort((a, b) => a.rank - b.rank);
    const reordered = [...sorted];
    const [removed] = reordered.splice(draggedRoleIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const updated = reordered.map((r, idx) => ({ ...r, rank: idx + 1 }));
    setRolesState(updated);
    setDraggedRoleIndex(null);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 className="hero-title" style={{ textAlign: 'left', fontSize: '32px', marginBottom: '8px' }}>
        แก้ไขข้อมูลผู้เล่น: {user.name}
      </h1>
      <p className="hero-subtitle" style={{ textAlign: 'left', margin: '0 0 32px 0' }}>
        แก้ไขชื่อและเรียงลำดับความถนัดของบทบาท/เอเจนต์ด้วยการลากวางหรือกรอกตัวเลขโดยตรง
      </p>

      {errorMessage && (
        <div className="alert alert-danger" style={{ whiteSpace: 'pre-line' }}>
          <span>⚠️</span> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Step 1: User name */}
        <div className="card" style={{ marginBottom: '24px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="name-input">
              ชื่อผู้เล่น Riot ID (Name#Tag)
            </label>
            <input
              id="name-input"
              type="text"
              className="form-input"
              placeholder="ตัวอย่าง: Apotoxin#ComeB"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={isPending}
              required
            />
            <span style={{ fontSize: '12px', color: 'var(--color-text-secondary)', display: 'block', marginTop: '6px' }}>
              * กรุณาใส่เครื่องหมาย # คั่นกลาง เช่น <strong>Apotoxin#ComeB</strong> เพื่อรองรับการซิงค์ประวัติการเล่นจริง
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Step 2: Role Rankings */}
          <div className="card">
            <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '16px' }}>
              1. จัดอันดับตำแหน่งที่ถนัด (Role Rankings)
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              ลากเพื่อจัดอันดับบทบาทที่ถนัดที่สุด (อันดับ 1 อยู่บนสุด) หรือคลิกลูกศร Up/Down หรือกรอกตัวเลขโดยตรง
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {[...rolesState].sort((a, b) => a.rank - b.rank).map((role, index) => {
                const roleTheme = role.name === 'Duelists' ? 'Duelists' : role.name === 'Initiators' ? 'Initiators' : role.name === 'Controllers' ? 'Controllers' : 'Sentinels';
                return (
                  <div
                    key={role.name}
                    draggable
                    onDragStart={(e) => handleRoleDragStart(e, index)}
                    onDragOver={handleRoleDragOver}
                    onDrop={(e) => handleRoleDrop(e, index)}
                    className="user-list-item"
                    style={{
                      margin: 0,
                      cursor: 'grab',
                      borderLeft: `4px solid var(--color-${roleTheme.toLowerCase().slice(0, -1)})`,
                      backgroundColor: 'rgba(255,255,255,0.01)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ color: 'var(--color-text-secondary)', cursor: 'grab', display: 'flex', alignItems: 'center' }}>
                        ☰
                      </div>
                      {ROLE_ICONS[role.name] && (
                        <img 
                          src={ROLE_ICONS[role.name]} 
                          alt={role.name} 
                          style={{ width: '20px', height: '20px', objectFit: 'contain', filter: 'brightness(0.9)' }} 
                        />
                      )}
                      <span style={{ fontWeight: 600, fontSize: '15px' }}>{role.name}</span>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <input
                        type="number"
                        className="form-input"
                        value={role.rank}
                        onChange={(e) => handleRoleRankChange(role.name, parseInt(e.target.value, 10))}
                        style={{ width: '60px', padding: '4px 8px', fontSize: '13px', textAlign: 'center' }}
                        min="1"
                      />
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => moveRole(index, 'up')}
                          disabled={index === 0}
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                        >
                          ▲
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => moveRole(index, 'down')}
                          disabled={index === rolesState.length - 1}
                          style={{ padding: '4px 8px', fontSize: '10px' }}
                        >
                          ▼
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Step 3: Agent Rankings with Role Tabs */}
          <div className="card">
            <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '8px' }}>
              2. จัดอันดับความชำนาญเอเจนต์ (Agent Mastery Rankings)
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '20px' }}>
              จัดอันดับเอเจนต์ในแต่ละตำแหน่ง (ลากเพื่อเรียงอันดับจากบนสุด หรือกรอกตัวเลขโดยตรง)
            </p>

            {/* Role tabs for visual builder */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '20px' }}>
              {['Duelists', 'Initiators', 'Controllers', 'Sentinels'].map((role) => (
                <button
                  key={role}
                  type="button"
                  onClick={() => setActiveRoleTab(role)}
                  className={`btn ${activeRoleTab === role ? 'btn-primary' : 'btn-secondary'}`}
                  style={{
                    padding: '6px 12px',
                    fontSize: '12px',
                    borderRadius: '4px',
                    backgroundColor: activeRoleTab === role ? `var(--color-${role.toLowerCase().slice(0, -1)})` : '',
                    borderColor: activeRoleTab === role ? `var(--color-${role.toLowerCase().slice(0, -1)})` : '',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  {ROLE_ICONS[role] && (
                    <img 
                      src={ROLE_ICONS[role]} 
                      alt={role} 
                      style={{ width: '16px', height: '16px', objectFit: 'contain', filter: activeRoleTab === role ? 'brightness(1) invert(1)' : 'brightness(0.7)' }} 
                    />
                  )}
                  <span>{role}</span>
                </button>
              ))}
            </div>

            {/* Add Custom Agent Box */}
            <div 
              style={{ 
                display: 'flex', 
                gap: '8px', 
                marginBottom: '20px', 
                padding: '12px', 
                backgroundColor: 'rgba(0,0,0,0.2)', 
                borderRadius: '6px',
                alignItems: 'center' 
              }}
            >
              <input
                type="text"
                className="form-input"
                placeholder="ใส่ชื่อเอเจนต์พิเศษ (เช่น Waylay, Tejo)"
                value={customAgentInput}
                onChange={(e) => setCustomAgentInput(e.target.value)}
                style={{ flex: 1, padding: '8px 12px', fontSize: '13px' }}
              />
              <button
                type="button"
                onClick={handleAddCustomAgent}
                className="btn btn-primary"
                style={{ 
                  padding: '8px 16px', 
                  fontSize: '12px',
                  backgroundColor: `var(--color-${activeRoleTab.toLowerCase().slice(0, -1)})`,
                  borderColor: `var(--color-${activeRoleTab.toLowerCase().slice(0, -1)})`
                }}
              >
                + เพิ่มเอเจนต์พิเศษ
              </button>
            </div>

            {/* Draggable Agent List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {agentsState
                .filter((a) => a.role === activeRoleTab)
                .sort((a, b) => a.rank - b.rank)
                .map((agent, index, filteredArray) => {
                  const asset = agentAssets.find(a =>
                    a.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === agent.name.toLowerCase().replace(/[^a-z0-9]/g, '')
                  );

                  return (
                    <div
                      key={agent.name}
                      draggable
                      onDragStart={(e) => handleAgentDragStart(e, index)}
                      onDragOver={handleAgentDragOver}
                      onDrop={(e) => handleAgentDrop(e, index)}
                      className="user-list-item"
                      style={{
                        margin: 0,
                        cursor: 'grab',
                        backgroundColor: 'rgba(255,255,255,0.01)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ color: 'var(--color-text-secondary)', cursor: 'grab' }}>☰</div>
                        {asset?.displayIcon && (
                          <img 
                            src={asset.displayIcon} 
                            alt={agent.name} 
                            style={{ width: '28px', height: '28px', borderRadius: '4px', backgroundColor: 'rgba(0,0,0,0.3)', objectFit: 'contain' }} 
                          />
                        )}
                        <span style={{ fontSize: '14px', fontWeight: 500 }}>
                          {agent.name} {agent.isCustom && <span style={{ fontSize: '10px', color: 'var(--color-valorant)', fontWeight: 'bold' }}>(Custom)</span>}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <input
                          type="number"
                          className="form-input"
                          value={agent.rank}
                          onChange={(e) => handleAgentRankChange(agent.name, parseInt(e.target.value, 10))}
                          style={{ width: '60px', padding: '4px 8px', fontSize: '13px', textAlign: 'center' }}
                          min="1"
                        />
                        
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => moveAgent(activeRoleTab, index, 'up')}
                            disabled={index === 0}
                            style={{ padding: '4px 8px', fontSize: '10px' }}
                          >
                            ▲
                          </button>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={() => moveAgent(activeRoleTab, index, 'down')}
                            disabled={index === filteredArray.length - 1}
                            style={{ padding: '4px 8px', fontSize: '10px' }}
                          >
                            ▼
                          </button>
                        </div>

                        {agent.isCustom && (
                          <button
                            type="button"
                            onClick={() => handleDeleteCustomAgent(agent.name)}
                            className="btn btn-danger"
                            style={{ padding: '4px 8px', fontSize: '11px', textTransform: 'none' }}
                          >
                            ลบ
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px', marginBottom: '48px' }}>
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? 'กำลังบันทึกข้อมูล...' : 'บันทึกการแก้ไข'}
          </button>
          <a href={`/users/${encodeURIComponent(user.name)}`} className="btn btn-secondary">
            ยกเลิก
          </a>
        </div>
      </form>
    </div>
  );
}
