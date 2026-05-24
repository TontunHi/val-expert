'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { createUserAction } from '../../actions';

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

const initialRolesList: RoleState[] = [
  { name: 'Duelists', rank: 1 },
  { name: 'Sentinels', rank: 2 },
  { name: 'Initiators', rank: 3 },
  { name: 'Controllers', rank: 4 }
];

const initialAgentsList: AgentState[] = [
  // Duelists
  { name: 'Reyna', role: 'Duelists', rank: 1 },
  { name: 'Jett', role: 'Duelists', rank: 2 },
  { name: 'Phoenix', role: 'Duelists', rank: 3 },
  { name: 'Iso', role: 'Duelists', rank: 4 },
  { name: 'Raze', role: 'Duelists', rank: 5 },
  { name: 'Yoru', role: 'Duelists', rank: 6 },
  { name: 'Neon', role: 'Duelists', rank: 7 },
  { name: 'Waylay', role: 'Duelists', rank: 8 },
  // Sentinels
  { name: 'Chamber', role: 'Sentinels', rank: 1 },
  { name: 'Killjoy', role: 'Sentinels', rank: 2 },
  { name: 'Cypher', role: 'Sentinels', rank: 3 },
  { name: 'Vyse', role: 'Sentinels', rank: 4 },
  { name: 'Sage', role: 'Sentinels', rank: 5 },
  { name: 'Deadlock', role: 'Sentinels', rank: 6 },
  { name: 'Veto', role: 'Sentinels', rank: 7 },
  // Initiators
  { name: 'Sova', role: 'Initiators', rank: 1 },
  { name: 'Fade', role: 'Initiators', rank: 2 },
  { name: 'KAY/O', role: 'Initiators', rank: 3 },
  { name: 'Gekko', role: 'Initiators', rank: 4 },
  { name: 'Skye', role: 'Initiators', rank: 5 },
  { name: 'Breach', role: 'Initiators', rank: 6 },
  { name: 'Tejo', role: 'Initiators', rank: 7 },
  // Controllers
  { name: 'Clove', role: 'Controllers', rank: 1 },
  { name: 'Viper', role: 'Controllers', rank: 2 },
  { name: 'Omen', role: 'Controllers', rank: 3 },
  { name: 'Brimstone', role: 'Controllers', rank: 4 },
  { name: 'Harbor', role: 'Controllers', rank: 5 },
  { name: 'Astra', role: 'Controllers', rank: 6 },
  { name: 'Miks', role: 'Controllers', rank: 7 }
];

export default function AddUserPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  
  // Visual Mode State
  const [roles, setRoles] = useState<RoleState[]>(initialRolesList);
  const [agents, setAgents] = useState<AgentState[]>(initialAgentsList);
  const [activeRoleTab, setActiveRoleTab] = useState('Duelists');
  const [customAgentInput, setCustomAgentInput] = useState('');
  
  // Drag and Drop States
  const [draggedAgentIndex, setDraggedAgentIndex] = useState<number | null>(null);
  const [draggedRoleIndex, setDraggedRoleIndex] = useState<number | null>(null);

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Generate RAW text from Visual Editor State to feed the server action
  const generateRankingsTextFromVisual = (): string => {
    let text = '';
    // Sort roles by rank
    const sortedRoles = [...roles].sort((a, b) => a.rank - b.rank);
    sortedRoles.forEach((r) => {
      text += `${r.name} ${r.rank}\n\n`;
      // Filter and sort agents in this role
      const roleAgents = agents
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
      const response = await createUserAction(formData);
      if (response.success) {
        router.push(`/users/${response.userId}`);
        router.refresh();
      } else {
        setErrorMessage(response.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
      }
    });
  };

  // --- Visual Editor Handlers ---

  // Role Rank Up/Down
  const moveRole = (index: number, direction: 'up' | 'down') => {
    const sorted = [...roles].sort((a, b) => a.rank - b.rank);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    // Swap ranks
    const temp = sorted[index].rank;
    sorted[index].rank = sorted[targetIndex].rank;
    sorted[targetIndex].rank = temp;

    setRoles([...sorted]);
  };

  // Role Rank Direct input change
  const handleRoleRankChange = (roleName: string, newRank: number) => {
    const updated = roles.map((r) => {
      if (r.name === roleName) {
        return { ...r, rank: Math.max(1, newRank) };
      }
      return r;
    });
    setRoles(updated);
  };

  // Agent Rank Up/Down
  const moveAgent = (roleName: string, index: number, direction: 'up' | 'down') => {
    const roleAgents = agents.filter((a) => a.role === roleName).sort((a, b) => a.rank - b.rank);
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= roleAgents.length) return;

    // Swap ranks
    const temp = roleAgents[index].rank;
    roleAgents[index].rank = roleAgents[targetIndex].rank;
    roleAgents[targetIndex].rank = temp;

    // Update list
    const otherAgents = agents.filter((a) => a.role !== roleName);
    setAgents([...otherAgents, ...roleAgents]);
  };

  // Agent Rank Direct input change
  const handleAgentRankChange = (agentName: string, newRank: number) => {
    const updated = agents.map((a) => {
      if (a.name === agentName) {
        return { ...a, rank: Math.max(1, newRank) };
      }
      return a;
    });
    setAgents(updated);
  };

  // Add Custom Agent to active role
  const handleAddCustomAgent = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = customAgentInput.trim();
    if (!cleanName) return;

    // Check if name already exists in this role
    const exists = agents.some((a) => a.role === activeRoleTab && a.name.toLowerCase() === cleanName.toLowerCase());
    if (exists) {
      alert('มีเอเจนต์นี้อยู่ในบทบาทนี้แล้ว');
      return;
    }

    const roleAgents = agents.filter((a) => a.role === activeRoleTab);
    const newAgent: AgentState = {
      name: cleanName,
      role: activeRoleTab,
      rank: roleAgents.length + 1,
      isCustom: true
    };

    setAgents([...agents, newAgent]);
    setCustomAgentInput('');
  };

  // Delete Custom Agent
  const handleDeleteCustomAgent = (agentName: string) => {
    const updated = agents.filter((a) => !(a.name === agentName && a.isCustom));
    // Normalize remaining agent ranks under that role
    const activeRoleAgents = updated.filter((a) => a.role === activeRoleTab).sort((a, b) => a.rank - b.rank);
    const normalized = activeRoleAgents.map((a, idx) => ({ ...a, rank: idx + 1 }));
    const otherAgents = updated.filter((a) => a.role !== activeRoleTab);
    
    setAgents([...otherAgents, ...normalized]);
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

    const roleAgents = agents.filter((a) => a.role === activeRoleTab).sort((a, b) => a.rank - b.rank);
    const reordered = [...roleAgents];
    const [removed] = reordered.splice(draggedAgentIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    // Recalculate ranks based on index
    const updated = reordered.map((a, idx) => ({ ...a, rank: idx + 1 }));
    const otherAgents = agents.filter((a) => a.role !== activeRoleTab);

    setAgents([...otherAgents, ...updated]);
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

    const sorted = [...roles].sort((a, b) => a.rank - b.rank);
    const reordered = [...sorted];
    const [removed] = reordered.splice(draggedRoleIndex, 1);
    reordered.splice(targetIndex, 0, removed);

    const updated = reordered.map((r, idx) => ({ ...r, rank: idx + 1 }));
    setRoles(updated);
    setDraggedRoleIndex(null);
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto' }}>
      <h1 className="hero-title" style={{ textAlign: 'left', fontSize: '32px', marginBottom: '8px' }}>
        เพิ่มผู้เล่นใหม่
      </h1>
      <p className="hero-subtitle" style={{ textAlign: 'left', margin: '0 0 32px 0' }}>
        ป้อนชื่อผู้เล่นและคลิกลากเพื่อจัดอันดับบทบาทและเอเจนต์ที่ถนัด (หรือแก้ไขตัวเลขความชำนาญโดยตรง)
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
              {[...roles].sort((a, b) => a.rank - b.rank).map((role, index) => {
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
                          disabled={index === roles.length - 1}
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
                    borderColor: activeRoleTab === role ? `var(--color-${role.toLowerCase().slice(0, -1)})` : ''
                  }}
                >
                  {role}
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
              {agents
                .filter((a) => a.role === activeRoleTab)
                .sort((a, b) => a.rank - b.rank)
                .map((agent, index, filteredArray) => (
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
                ))}
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '24px', marginBottom: '48px' }}>
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? 'กำลังบันทึกข้อมูล...' : 'บันทึกผู้เล่น'}
          </button>
          <a href="/" className="btn btn-secondary">
            ยกเลิก
          </a>
        </div>
      </form>
    </div>
  );
}
