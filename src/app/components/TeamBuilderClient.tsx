'use client';

import React, { useState, useEffect, useRef } from 'react';

interface DBPlayer {
  id: number;
  name: string;
  roles: { role_name: string; rank: number }[];
  agents: { agent_name: string; role_name: string; rank: number }[];
}

interface MapStat {
  user_id: number;
  agent_name: string;
  map_name: string;
  wins: number;
  total: number;
}

interface TeamBuilderClientProps {
  initialPlayers: DBPlayer[];
  mapStats: MapStat[];
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
  mapWinrateText?: string;
}

interface AgentAsset {
  uuid: string;
  displayName: string;
  displayIcon: string;
  role: { displayName: string; displayIcon: string };
  bustPortrait: string;
  fullPortrait: string;
}

interface MapAsset {
  uuid: string;
  displayName: string;
  splash: string;
  listViewIcon: string;
  listViewIconTall: string;
  tacticalDescription: string | null;
}

const VALORANT_MAPS = [
  'Ascent', 'Bind', 'Haven', 'Split', 'Icebox',
  'Breeze', 'Fracture', 'Pearl', 'Lotus', 'Sunset', 'Abyss'
];

const ROLE_COLORS: Record<string, string> = {
  Duelists: '#ff4655',
  Initiators: '#00f0ff',
  Controllers: '#b026ff',
  Sentinels: '#ffca28',
};

// ─── Agent Picker Overlay ──────────────────────────────────────────────────────
function AgentPickerOverlay({
  title,
  accentColor,
  agents,
  selectedAgents,
  maxSelect,
  onToggle,
  onClose,
}: {
  title: string;
  accentColor: string;
  agents: AgentAsset[];
  selectedAgents: string[];
  maxSelect: number;
  onToggle: (name: string) => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const byRole: Record<string, AgentAsset[]> = {};
  agents.forEach(a => {
    const r = a.role?.displayName || 'Other';
    if (!byRole[r]) byRole[r] = [];
    byRole[r].push(a);
  });

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div ref={overlayRef} style={{
        background: 'linear-gradient(160deg, #1a1d2e 0%, #0f1117 100%)',
        border: `1px solid ${accentColor}40`,
        borderRadius: '16px',
        padding: '28px',
        width: '100%',
        maxWidth: '760px',
        maxHeight: '82vh',
        overflowY: 'auto',
        boxShadow: `0 0 60px ${accentColor}30`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: accentColor }}>{title}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              เลือกแล้ว {selectedAgents.length} / {maxSelect} ตัว
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px',
                color: '#fff', cursor: 'pointer', padding: '6px 12px', fontSize: '13px'
              }}
            >
              ✕ ปิด
            </button>
          </div>
        </div>

        {Object.entries(byRole).map(([roleName, roleAgents]) => (
          <div key={roleName} style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '10px' }}>
              {roleName}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: '8px' }}>
              {roleAgents.map(agent => {
                const isSelected = selectedAgents.includes(agent.displayName);
                const canSelect = isSelected || selectedAgents.length < maxSelect;
                return (
                  <button
                    key={agent.uuid}
                    onClick={() => canSelect && onToggle(agent.displayName)}
                    title={agent.displayName}
                    style={{
                      background: isSelected
                        ? `${accentColor}22`
                        : 'rgba(255,255,255,0.04)',
                      border: `2px solid ${isSelected ? accentColor : 'rgba(255,255,255,0.08)'}`,
                      borderRadius: '10px',
                      padding: '8px 4px 6px',
                      cursor: canSelect ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '5px',
                      opacity: !canSelect ? 0.35 : 1,
                      transition: 'all 0.15s ease',
                      transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                      position: 'relative',
                    }}
                  >
                    {isSelected && (
                      <div style={{
                        position: 'absolute', top: '4px', right: '4px',
                        width: '14px', height: '14px', borderRadius: '50%',
                        background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '9px', color: '#000', fontWeight: 900
                      }}>✓</div>
                    )}
                    <img
                      src={agent.displayIcon}
                      alt={agent.displayName}
                      style={{ width: '44px', height: '44px', objectFit: 'contain' }}
                    />
                    <span style={{ fontSize: '9px', color: isSelected ? accentColor : 'rgba(255,255,255,0.6)', fontWeight: 600, textAlign: 'center', lineHeight: '1.2' }}>
                      {agent.displayName}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Map Picker Overlay ────────────────────────────────────────────────────────
function MapPickerOverlay({
  maps,
  selectedMap,
  onSelect,
  onClose,
}: {
  maps: MapAsset[];
  selectedMap: string;
  onSelect: (name: string) => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div ref={overlayRef} style={{
        background: 'linear-gradient(160deg, #1a1d2e 0%, #0f1117 100%)',
        border: '1px solid rgba(255,70,85,0.3)',
        borderRadius: '16px',
        padding: '28px',
        width: '100%',
        maxWidth: '820px',
        maxHeight: '82vh',
        overflowY: 'auto',
        boxShadow: '0 0 60px rgba(255,70,85,0.2)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#ff4655' }}>เลือกแผนที่</h3>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px',
              color: '#fff', cursor: 'pointer', padding: '6px 12px', fontSize: '13px'
            }}
          >✕ ปิด</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '12px' }}>
          {maps.map(map => {
            const isSelected = selectedMap === map.displayName;
            return (
              <button
                key={map.uuid}
                onClick={() => { onSelect(map.displayName); onClose(); }}
                style={{
                  background: 'none',
                  border: `2px solid ${isSelected ? '#ff4655' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '12px',
                  cursor: 'pointer',
                  overflow: 'hidden',
                  position: 'relative',
                  height: '130px',
                  transition: 'all 0.2s ease',
                  transform: isSelected ? 'scale(1.03)' : 'scale(1)',
                  boxShadow: isSelected ? '0 0 20px rgba(255,70,85,0.4)' : 'none',
                }}
              >
                {map.splash ? (
                  <img
                    src={map.splash}
                    alt={map.displayName}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', background: 'rgba(255,255,255,0.05)' }} />
                )}
                <div style={{
                  position: 'absolute', inset: 0,
                  background: isSelected
                    ? 'linear-gradient(to top, rgba(255,70,85,0.7) 0%, rgba(0,0,0,0.3) 100%)'
                    : 'linear-gradient(to top, rgba(0,0,0,0.8) 0%, rgba(0,0,0,0.2) 100%)',
                  display: 'flex', flexDirection: 'column',
                  alignItems: 'flex-start', justifyContent: 'flex-end',
                  padding: '10px 12px'
                }}>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: '#fff' }}>{map.displayName}</span>
                  {map.tacticalDescription && (
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', marginTop: '2px' }}>{map.tacticalDescription}</span>
                  )}
                  {isSelected && (
                    <span style={{ position: 'absolute', top: '8px', right: '8px', background: '#ff4655', borderRadius: '50%', width: '22px', height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: 900 }}>✓</span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Player Agent Lock Overlay ─────────────────────────────────────────────────
function PlayerAgentLockOverlay({
  player,
  lockedRole,
  agentAssets,
  currentAgentLock,
  onSelect,
  onClose,
}: {
  player: DBPlayer;
  lockedRole: string;
  agentAssets: AgentAsset[];
  currentAgentLock: string;
  onSelect: (agent: string) => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const accentColor = ROLE_COLORS[lockedRole] || '#ff4655';

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  // Only show agents that this player has ranked in the locked role
  const eligibleAgents = player.agents
    .filter(a => a.role_name === lockedRole)
    .sort((a, b) => a.rank - b.rank);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div ref={overlayRef} style={{
        background: 'linear-gradient(160deg, #1a1d2e 0%, #0f1117 100%)',
        border: `1px solid ${accentColor}40`,
        borderRadius: '16px',
        padding: '28px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: `0 0 60px ${accentColor}30`,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <div>
            <h3 style={{ margin: '0 0 4px 0', fontSize: '17px', fontWeight: 700, color: accentColor }}>
              ล็อคเอเจนต์: {player.name}
            </h3>
            <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>
              บทบาท: {lockedRole}
            </span>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.08)', border: 'none', borderRadius: '8px',
              color: '#fff', cursor: 'pointer', padding: '6px 12px', fontSize: '13px'
            }}
          >✕ ปิด</button>
        </div>

        {/* Random option */}
        <button
          onClick={() => { onSelect('random'); onClose(); }}
          style={{
            width: '100%', background: currentAgentLock === 'random' ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.04)',
            border: `2px solid ${currentAgentLock === 'random' ? accentColor : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '10px', padding: '12px 16px', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '12px',
            marginBottom: '12px', color: '#fff', fontSize: '14px', fontWeight: 600,
            transition: 'all 0.15s'
          }}
        >
          <span style={{ fontSize: '22px' }}>🎲</span>
          <span>สุ่มเอเจนต์ที่เหมาะสม</span>
          {currentAgentLock === 'random' && <span style={{ marginLeft: 'auto', color: accentColor }}>✓</span>}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '10px' }}>
          {eligibleAgents.map(agentData => {
            const asset = agentAssets.find(a =>
              a.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === agentData.agent_name.toLowerCase().replace(/[^a-z0-9]/g, '')
            );
            const isSelected = currentAgentLock === agentData.agent_name;
            return (
              <button
                key={agentData.agent_name}
                onClick={() => { onSelect(agentData.agent_name); onClose(); }}
                style={{
                  background: isSelected ? `${accentColor}22` : 'rgba(255,255,255,0.04)',
                  border: `2px solid ${isSelected ? accentColor : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: '10px', padding: '10px 6px 8px',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px',
                  transition: 'all 0.15s', transform: isSelected ? 'scale(1.04)' : 'scale(1)',
                  position: 'relative'
                }}
              >
                {isSelected && (
                  <div style={{
                    position: 'absolute', top: '4px', right: '4px',
                    width: '14px', height: '14px', borderRadius: '50%',
                    background: accentColor, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '9px', color: '#000', fontWeight: 900
                  }}>✓</div>
                )}
                {asset ? (
                  <img src={asset.displayIcon} alt={agentData.agent_name} style={{ width: '52px', height: '52px', objectFit: 'contain' }} />
                ) : (
                  <div style={{ width: '52px', height: '52px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '18px' }}>?</div>
                )}
                <span style={{ fontSize: '10px', color: isSelected ? accentColor : 'rgba(255,255,255,0.6)', fontWeight: 700, textAlign: 'center' }}>
                  {agentData.agent_name}
                </span>
                <span style={{ fontSize: '9px', color: 'rgba(255,255,255,0.35)' }}>#{agentData.rank}</span>
              </button>
            );
          })}
        </div>

        {eligibleAgents.length === 0 && (
          <div style={{ textAlign: 'center', padding: '30px', color: 'rgba(255,255,255,0.35)', fontSize: '13px' }}>
            ยังไม่มีข้อมูล Agent ในบทบาท {lockedRole}<br/>สำหรับผู้เล่น {player.name}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Team Result Overlay ──────────────────────────────────────────────────────
function TeamResultOverlay({
  team,
  score,
  grade,
  mapName,
  mapAsset,
  onRegenerate,
  onClose,
}: {
  team: AssignmentResult[];
  score: number;
  grade: string;
  mapName: string;
  mapAsset?: MapAsset;
  onRegenerate: () => void;
  onClose: () => void;
}) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(0,0,0,0.82)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px'
    }}>
      <div ref={overlayRef} style={{
        background: 'linear-gradient(160deg, #181a26 0%, #0d0f14 100%)',
        border: '1px solid rgba(255, 70, 85, 0.4)',
        borderRadius: '20px',
        padding: '32px',
        width: '100%',
        maxWidth: '920px',
        maxHeight: '90vh',
        overflowY: 'auto',
        boxShadow: '0 0 80px rgba(255, 70, 85, 0.35)',
        position: 'relative',
      }}>
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '20px', right: '20px',
            background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: '50%',
            color: '#fff', cursor: 'pointer', width: '36px', height: '36px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '16px', transition: 'all 0.15s'
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,70,85,0.2)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.06)'}
        >
          ✕
        </button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{ fontSize: '12px', fontWeight: 800, color: '#ff4655', textTransform: 'uppercase', letterSpacing: '2px', marginBottom: '6px' }}>
            ผลการสุ่มทีมสำเร็จ
          </div>
          <h2 style={{ margin: 0, fontSize: '32px', fontWeight: 900, color: '#fff', textShadow: '0 0 10px rgba(255,255,255,0.1)' }}>
            คะแนนทีม: <span style={{ color: '#ff4655' }}>{grade.split(' ')[0]}</span>
          </h2>
          <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>
            {grade.substring(grade.indexOf(' ') + 1)} • Raw Score: {score} • แผนที่ {mapName}
          </div>
        </div>

        {/* Player Cards Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '16px', marginBottom: '32px' }}>
          {['Duelists', 'Initiators', 'Controllers', 'Sentinels'].map(role => {
            const members = team.filter(m => m.role === role);
            if (members.length === 0) return null;
            const col = ROLE_COLORS[role];
            return members.map((member, i) => (
              <div key={`${role}-${i}`} style={{
                background: 'rgba(255,255,255,0.02)',
                border: `1px solid rgba(255,255,255,0.06)`,
                borderLeft: `4px solid ${col}`,
                borderRadius: '12px',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                boxShadow: 'inset 0 0 15px rgba(255,255,255,0.01)',
              }}>
                {member.icon ? (
                  <img
                    src={member.icon}
                    alt={member.agent}
                    style={{
                      width: '60px', height: '60px', objectFit: 'contain',
                      background: 'rgba(0,0,0,0.2)', borderRadius: '10px',
                      padding: '4px', border: `1px solid ${col}40`
                    }}
                  />
                ) : (
                  <div style={{
                    width: '60px', height: '60px', borderRadius: '10px',
                    background: `${col}20`, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', fontSize: '24px', border: `1px solid ${col}40`
                  }}>?</div>
                )}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '11px', fontWeight: 800, background: `${col}22`, color: col, padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' }}>
                      {role.replace('ists', '').replace('ors', '').replace('ers', '')}
                    </span>
                    <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>Rank #{member.agentRank}</span>
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: 800, color: '#fff', marginTop: '6px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {member.agent
                  }</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>
                    {member.player.name}
                  </div>
                  {member.mapWinrateText && (
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)', marginTop: '6px' }}>
                      📈 {member.mapWinrateText}
                    </div>
                  )}
                </div>
              </div>
            ));
          })}
        </div>

        {/* Footer Buttons */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: '16px' }}>
          <button
            onClick={onClose}
            style={{
              padding: '12px 28px', borderRadius: '10px', cursor: 'pointer',
              background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.15)',
              color: 'rgba(255,255,255,0.8)', fontSize: '14px', fontWeight: 700,
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.3)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
              e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)';
            }}
          >
            ✕ ปิดหน้าต่าง
          </button>
          <button
            onClick={onRegenerate}
            style={{
              padding: '12px 32px', borderRadius: '10px', cursor: 'pointer',
              background: '#ff4655', border: 'none',
              color: '#fff', fontSize: '14px', fontWeight: 800,
              boxShadow: '0 0 20px rgba(255,70,85,0.4)',
              transition: 'all 0.15s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = '#ff5b68';
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(255,70,85,0.6)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = '#ff4655';
              e.currentTarget.style.transform = 'none';
              e.currentTarget.style.boxShadow = '0 0 20px rgba(255,70,85,0.4)';
            }}
          >
            🔄 สุ่มทีมใหม่
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function TeamBuilderClient({ initialPlayers, mapStats }: TeamBuilderClientProps) {
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<number[]>([]);
  const [composition, setComposition] = useState<{ [key: string]: number }>({
    Duelists: 1, Initiators: 2, Controllers: 1, Sentinels: 1
  });
  const [playerLocks, setPlayerLocks] = useState<{ [key: number]: string }>({});
  const [playerAgentLocks, setPlayerAgentLocks] = useState<{ [key: number]: string }>({});
  const [selectedMap, setSelectedMap] = useState<string>('Ascent');
  const [bannedAgents, setBannedAgents] = useState<string[]>([]);
  const [requiredAgents, setRequiredAgents] = useState<string[]>([]);
  const [generationMode, setGenerationMode] = useState<'performance' | 'random-balanced' | 'pure-random'>('performance');
  const [generatedTeam, setGeneratedTeam] = useState<AssignmentResult[] | null>(null);
  const [teamScore, setTeamScore] = useState<number | null>(null);
  const [teamGrade, setTeamGrade] = useState<string>('');
  const [showResultOverlay, setShowResultOverlay] = useState(false);

  // Assets from Valorant API
  const [agentAssets, setAgentAssets] = useState<AgentAsset[]>([]);
  const [mapAssets, setMapAssets] = useState<MapAsset[]>([]);

  // Overlay states
  const [showBanOverlay, setShowBanOverlay] = useState(false);
  const [showReqOverlay, setShowReqOverlay] = useState(false);
  const [showMapOverlay, setShowMapOverlay] = useState(false);
  const [agentLockOverlayPlayer, setAgentLockOverlayPlayer] = useState<DBPlayer | null>(null);

  useEffect(() => {
    fetch('https://valorant-api.com/v1/agents?isPlayableCharacter=true')
      .then(r => r.json())
      .then(d => setAgentAssets(d.data || []))
      .catch(console.error);

    fetch('https://valorant-api.com/v1/maps')
      .then(r => r.json())
      .then(d => {
        // Filter to only actual competitive maps that have splash images and tacticalDescription
        const competitiveMaps = (d.data || []).filter(
          (m: MapAsset) => m.tacticalDescription && m.splash && VALORANT_MAPS.includes(m.displayName)
        );
        setMapAssets(competitiveMaps);
      })
      .catch(console.error);
  }, []);

  const selectedMapAsset = mapAssets.find(m => m.displayName === selectedMap);

  const handlePlayerCheckbox = (id: number) => {
    if (selectedPlayerIds.includes(id)) {
      setSelectedPlayerIds(selectedPlayerIds.filter(pid => pid !== id));
      const updatedLocks = { ...playerLocks }; delete updatedLocks[id]; setPlayerLocks(updatedLocks);
      const updatedALocks = { ...playerAgentLocks }; delete updatedALocks[id]; setPlayerAgentLocks(updatedALocks);
    } else {
      if (selectedPlayerIds.length < 5) {
        setSelectedPlayerIds([...selectedPlayerIds, id]);
        setPlayerLocks({ ...playerLocks, [id]: 'random' });
      }
    }
  };

  const handleCompChange = (role: string, val: number) => {
    setComposition({ ...composition, [role]: Math.max(0, val) });
  };

  const getCompTotal = () => Object.values(composition).reduce((a, b) => a + b, 0);

  function getPermutations<T>(arr: T[]): T[][] {
    if (arr.length <= 1) return [arr];
    const result: T[][] = [];
    for (let i = 0; i < arr.length; i++) {
      const current = arr[i];
      const remaining = [...arr.slice(0, i), ...arr.slice(i + 1)];
      getPermutations(remaining).forEach(sub => result.push([current, ...sub]));
    }
    return result;
  }

  function assignAgentsToRole(
    playersInRole: DBPlayer[], roleName: string,
    bannedAgentsSet: Set<string>, selectedMapName: string,
    isPureRandom: boolean = false
  ): { player: DBPlayer; agent: string; rank: number; adjustedScore: number }[] | null {
    const roleAgents = Array.from(new Set(
      playersInRole.flatMap(p => p.agents.filter(a => a.role_name === roleName).map(a => a.agent_name))
    )).filter(agent => !bannedAgentsSet.has(agent.toLowerCase()));

    if (roleAgents.length < playersInRole.length) return null;

    let bestAssignment: { player: DBPlayer; agent: string; rank: number; adjustedScore: number }[] | null = null;
    let bestScore = Infinity;
    const allAssignmentsList: { player: DBPlayer; agent: string; rank: number; adjustedScore: number }[][] = [];

    function search(playerIndex: number, current: { player: DBPlayer; agent: string; rank: number; adjustedScore: number }[], assigned: Set<string>, score: number) {
      if (playerIndex === playersInRole.length) {
        if (isPureRandom) {
          allAssignmentsList.push([...current]);
        } else {
          if (score < bestScore) { bestScore = score; bestAssignment = [...current]; }
        }
        return;
      }
      const player = playersInRole[playerIndex];
      const agentLock = playerAgentLocks[player.id];
      const playerRankings = player.agents.filter(a => a.role_name === roleName && !bannedAgentsSet.has(a.agent_name.toLowerCase()));

      for (const rankObj of playerRankings) {
        if (agentLock && agentLock !== 'random' && rankObj.agent_name !== agentLock) continue;
        if (assigned.has(rankObj.agent_name)) continue;

        assigned.add(rankObj.agent_name);
        const playerAgentMapStat = mapStats.find(s =>
          s.user_id === player.id &&
          s.agent_name.toLowerCase() === rankObj.agent_name.toLowerCase() &&
          s.map_name.toLowerCase() === selectedMapName.toLowerCase()
        );
        let winrateBonus = 0;
        if (playerAgentMapStat && playerAgentMapStat.total > 0) {
          winrateBonus = (playerAgentMapStat.wins / playerAgentMapStat.total) * 4.0;
        } else {
          const agentStatsAllMaps = mapStats.filter(s =>
            s.user_id === player.id &&
            s.agent_name.toLowerCase() === rankObj.agent_name.toLowerCase()
          );
          const agentTot = agentStatsAllMaps.reduce((sum, s) => sum + s.total, 0);
          const agentWins = agentStatsAllMaps.reduce((sum, s) => sum + s.wins, 0);
          if (agentTot > 0) {
            winrateBonus = (agentWins / agentTot) * 2.5;
          } else {
            const pms = mapStats.filter(s => s.user_id === player.id && s.map_name.toLowerCase() === selectedMapName.toLowerCase());
            const tot = pms.reduce((s, x) => s + x.total, 0);
            const wins = pms.reduce((s, x) => s + x.wins, 0);
            if (tot > 0) {
              winrateBonus = (wins / tot) * 1.5;
            } else {
              const allPlayerStats = mapStats.filter(s => s.user_id === player.id);
              const allTot = allPlayerStats.reduce((sum, s) => sum + s.total, 0);
              const allWins = allPlayerStats.reduce((sum, s) => sum + s.wins, 0);
              if (allTot > 0) {
                winrateBonus = (allWins / allTot) * 1.0;
              }
            }
          }
        }
        const adjustedScore = rankObj.rank - winrateBonus;
        current.push({ player, agent: rankObj.agent_name, rank: rankObj.rank, adjustedScore });
        search(playerIndex + 1, current, assigned, score + (isPureRandom ? 0 : adjustedScore));
        current.pop();
        assigned.delete(rankObj.agent_name);
      }
    }

    search(0, [], new Set(), 0);

    if (isPureRandom) {
      if (allAssignmentsList.length === 0) return null;
      return allAssignmentsList[Math.floor(Math.random() * allAssignmentsList.length)];
    }
    return bestAssignment;
  }

  const generateTeam = () => {
    if (selectedPlayerIds.length !== 5) { alert('กรุณาเลือกผู้เล่นให้ครบ 5 คน'); return; }
    if (getCompTotal() !== 5) { alert('กรุณาเลือกสัดส่วนตำแหน่งให้รวมกันได้ครบ 5 คน'); return; }

    const lockedRoleCounts: Record<string, number> = { Duelists: 0, Initiators: 0, Controllers: 0, Sentinels: 0 };
    for (const pid of selectedPlayerIds) {
      const lock = playerLocks[pid];
      if (lock && lock !== 'random') lockedRoleCounts[lock] = (lockedRoleCounts[lock] || 0) + 1;
    }
    for (const [role, count] of Object.entries(composition)) {
      if ((lockedRoleCounts[role] || 0) > count) {
        alert(`ล็อคตำแหน่ง ${role} เกินโควตา (${lockedRoleCounts[role]} > ${count})`);
        return;
      }
    }

    const selectedPlayers = initialPlayers.filter(p => selectedPlayerIds.includes(p.id));
    const bannedAgentsSet = new Set(bannedAgents.map(a => a.toLowerCase()));
    const roleSlots: string[] = [];
    Object.entries(composition).forEach(([role, count]) => { for (let i = 0; i < count; i++) roleSlots.push(role); });

    const allAssignments = getPermutations(selectedPlayers);
    const validConfigs: { team: AssignmentResult[]; totalScore: number; rawScore: number }[] = [];

    const isPureRandom = generationMode === 'pure-random';

    allAssignments.forEach(playerPerm => {
      let violatesLock = false;
      for (let i = 0; i < 5; i++) {
        const lock = playerLocks[playerPerm[i].id];
        if (lock && lock !== 'random' && lock !== roleSlots[i]) { violatesLock = true; break; }
      }
      if (violatesLock) return;

      const playersByRole: Record<string, DBPlayer[]> = { Duelists: [], Initiators: [], Controllers: [], Sentinels: [] };
      for (let i = 0; i < 5; i++) playersByRole[roleSlots[i]].push(playerPerm[i]);

      let configValid = true;
      const assignmentsList: AssignmentResult[] = [];
      let totalScore = 0, rawScore = 0;

      for (const roleName of Object.keys(playersByRole)) {
        const playersInRole = playersByRole[roleName];
        if (playersInRole.length === 0) continue;
        const allocated = assignAgentsToRole(playersInRole, roleName, bannedAgentsSet, selectedMap, isPureRandom);
        if (!allocated) { configValid = false; break; }

        allocated.forEach(alloc => {
          const roleRank = alloc.player.roles.find(r => r.role_name === roleName)?.rank ?? 4;
          const asset = agentAssets.find(a => a.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === alloc.agent.toLowerCase().replace(/[^a-z0-9]/g, ''));
          
          const statMapAgent = mapStats.find(s => s.user_id === alloc.player.id && s.agent_name.toLowerCase() === alloc.agent.toLowerCase() && s.map_name.toLowerCase() === selectedMap.toLowerCase());
          let wrText = 'ยังไม่มีสถิติ';
          if (statMapAgent && statMapAgent.total > 0) {
            wrText = `แผนที่ ${selectedMap}: อัตราชนะ ${Math.round((statMapAgent.wins / statMapAgent.total) * 100)}% (${statMapAgent.total} นัด)`;
          } else {
            const agentStatsAllMaps = mapStats.filter(s => s.user_id === alloc.player.id && s.agent_name.toLowerCase() === alloc.agent.toLowerCase());
            const agentTot = agentStatsAllMaps.reduce((sum, s) => sum + s.total, 0);
            const agentWins = agentStatsAllMaps.reduce((sum, s) => sum + s.wins, 0);
            if (agentTot > 0) {
              wrText = `ภาพรวมเอเจนต์: ชนะ ${Math.round((agentWins / agentTot) * 100)}% (${agentTot} นัด)`;
            } else {
              const pms = mapStats.filter(s => s.user_id === alloc.player.id && s.map_name.toLowerCase() === selectedMap.toLowerCase());
              const tot = pms.reduce((s, x) => s + x.total, 0);
              const wins = pms.reduce((s, x) => s + x.wins, 0);
              if (tot > 0) {
                wrText = `ภาพรวมแผนที่ ${selectedMap}: ชนะ ${Math.round((wins / tot) * 100)}% (${tot} นัด)`;
              } else {
                const allPlayerStats = mapStats.filter(s => s.user_id === alloc.player.id);
                const allTot = allPlayerStats.reduce((sum, s) => sum + s.total, 0);
                const allWins = allPlayerStats.reduce((sum, s) => sum + s.wins, 0);
                if (allTot > 0) {
                  wrText = `ภาพรวมชนะ: ชนะ ${Math.round((allWins / allTot) * 100)}% (${allTot} นัด)`;
                }
              }
            }
          }

          assignmentsList.push({
            player: alloc.player, role: roleName, agent: alloc.agent,
            roleRank, agentRank: alloc.rank,
            icon: asset?.displayIcon || null,
            backgroundColor: ROLE_COLORS[roleName] || '#ff4655',
            isCustom: !asset, mapWinrateText: wrText
          });
          totalScore += roleRank + alloc.adjustedScore;
          rawScore += roleRank + alloc.rank;
        });
      }

      if (configValid && requiredAgents.length > 0) {
        const names = new Set(assignmentsList.map(a => a.agent.toLowerCase()));
        for (const req of requiredAgents) {
          if (!names.has(req.toLowerCase())) { configValid = false; break; }
        }
      }
      if (configValid) validConfigs.push({ team: assignmentsList, totalScore, rawScore });
    });

    if (validConfigs.length === 0) { alert('ไม่พบการจัดคอมพ์ทีมที่สอดคล้องกับเงื่อนไขที่กำหนด'); return; }

    let selected;
    if (generationMode === 'pure-random') {
      selected = validConfigs[Math.floor(Math.random() * validConfigs.length)];
    } else if (generationMode === 'performance') {
      validConfigs.sort((a, b) => a.totalScore - b.totalScore);
      // Select randomly from the top 15% or top 3 configs so re-roll works and gives a high-quality team
      const topCount = Math.min(5, Math.max(1, Math.ceil(validConfigs.length * 0.15)));
      const top = validConfigs.slice(0, topCount);
      selected = top[Math.floor(Math.random() * top.length)];
    } else { // random-balanced
      validConfigs.sort((a, b) => a.totalScore - b.totalScore);
      const top = validConfigs.slice(0, Math.max(1, Math.ceil(validConfigs.length * 0.2)));
      selected = top[Math.floor(Math.random() * top.length)];
    }

    setGeneratedTeam(selected.team);
    setTeamScore(selected.rawScore);
    const sv = selected.rawScore;
    let grade = '';
    if (sv <= 14) grade = 'S+ (ดรีมทีมไร้พ่าย)';
    else if (sv <= 18) grade = 'S (ยอดเยี่ยม)';
    else if (sv <= 24) grade = 'A (ชำนาญสูง)';
    else if (sv <= 30) grade = 'B (สมดุลดี)';
    else grade = 'C (พอลุยได้)';
    
    setTeamGrade(grade);
    setShowResultOverlay(true);
  };

  return (
    <div>
      {/* Overlays */}
      {showResultOverlay && generatedTeam && (
        <TeamResultOverlay
          team={generatedTeam}
          score={teamScore || 0}
          grade={teamGrade}
          mapName={selectedMap}
          mapAsset={selectedMapAsset}
          onRegenerate={generateTeam}
          onClose={() => setShowResultOverlay(false)}
        />
      )}
      {showBanOverlay && (
        <AgentPickerOverlay
          title="🚫 แบนเอเจนต์ — เลือกเอเจนต์ที่ไม่ให้ถูกจัดเข้าทีม"
          accentColor="#f87171"
          agents={agentAssets}
          selectedAgents={bannedAgents}
          maxSelect={10}
          onToggle={name => {
            setBannedAgents(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
          }}
          onClose={() => setShowBanOverlay(false)}
        />
      )}
      {showReqOverlay && (
        <AgentPickerOverlay
          title="⭐ บังคับต้องมี — เลือกเอเจนต์ที่ทีมต้องใช้"
          accentColor="#34d399"
          agents={agentAssets}
          selectedAgents={requiredAgents}
          maxSelect={5}
          onToggle={name => {
            setRequiredAgents(prev => {
              if (prev.includes(name)) return prev.filter(x => x !== name);
              if (prev.length >= 5) { alert('ไม่สามารถบังคับเกิน 5 ตัว'); return prev; }
              return [...prev, name];
            });
          }}
          onClose={() => setShowReqOverlay(false)}
        />
      )}
      {showMapOverlay && (
        <MapPickerOverlay
          maps={mapAssets}
          selectedMap={selectedMap}
          onSelect={setSelectedMap}
          onClose={() => setShowMapOverlay(false)}
        />
      )}
      {agentLockOverlayPlayer && (
        <PlayerAgentLockOverlay
          player={agentLockOverlayPlayer}
          lockedRole={playerLocks[agentLockOverlayPlayer.id]}
          agentAssets={agentAssets}
          currentAgentLock={playerAgentLocks[agentLockOverlayPlayer.id] || 'random'}
          onSelect={agent => setPlayerAgentLocks({ ...playerAgentLocks, [agentLockOverlayPlayer.id]: agent })}
          onClose={() => setAgentLockOverlayPlayer(null)}
        />
      )}

      {/* Hero */}
      <section className="hero" style={{ padding: '40px 0 24px 0', borderBottom: 'none' }}>
        <h1 className="hero-title" style={{ fontSize: '32px' }}>จัดทีมสุ่ม & บาลานซ์ฝีมือ</h1>
        <p className="hero-subtitle" style={{ margin: 0 }}>
          เลือกผู้เล่น 5 คน กำหนดสัดส่วนตำแหน่ง ล็อคเอเจนต์ แบน/บังคับ Agent และระบบจะจัดทีมที่ดีที่สุดให้
        </p>
      </section>

      <div className="dashboard-grid" style={{ gap: '32px', marginTop: '24px' }}>
        {/* Left Column */}
        <div>
          {/* Step 1: Select Players */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
              1. เลือกผู้เล่น ({selectedPlayerIds.length} / 5 คน)
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              ติ๊กเลือกผู้เล่นที่อยู่ร่วมในทีมขณะนี้ให้ครบ 5 คน
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '10px' }}>
              {initialPlayers.map(player => {
                const isChecked = selectedPlayerIds.includes(player.id);
                return (
                  <label
                    key={player.id}
                    className="user-list-item"
                    style={{
                      margin: 0, padding: '10px 14px', display: 'flex', alignItems: 'center',
                      gap: '10px', cursor: 'pointer',
                      borderLeft: isChecked ? '3px solid var(--color-valorant)' : '3px solid transparent',
                      background: isChecked ? 'rgba(255, 70, 85, 0.05)' : 'rgba(0,0,0,0.15)',
                      opacity: !isChecked && selectedPlayerIds.length >= 5 ? 0.4 : 1
                    }}
                  >
                    <input
                      type="checkbox" checked={isChecked}
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

          {/* Step 2: Role Composition */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
              2. กำหนดสัดส่วนตำแหน่ง (ต้องรวมได้ 5 คน)
            </h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', textAlign: 'center' }}>
              {['Duelists', 'Initiators', 'Controllers', 'Sentinels'].map(role => (
                <div key={role} style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px 8px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.03)' }}>
                  <span style={{ fontSize: '11px', fontWeight: 700, color: ROLE_COLORS[role], textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>
                    {role}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                    <button type="button" className="btn btn-secondary" onClick={() => handleCompChange(role, composition[role] - 1)} style={{ padding: '2px 8px', fontSize: '10px' }}>-</button>
                    <span style={{ fontSize: '16px', fontWeight: 750, width: '20px' }}>{composition[role]}</span>
                    <button type="button" className="btn btn-secondary" onClick={() => handleCompChange(role, composition[role] + 1)} style={{ padding: '2px 8px', fontSize: '10px' }}>+</button>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop: '16px', fontSize: '13px', textAlign: 'right', fontWeight: 'bold' }}>
              จำนวนรวมขณะนี้: <span style={{ color: getCompTotal() === 5 ? '#34d399' : '#f87171' }}>{getCompTotal()} / 5 คน</span>
            </div>
          </div>

          {/* Step 3: Map Picker — Image button */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
              3. เลือกแผนที่การแข่งขัน
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '14px' }}>
              สถิติอัตราชนะของผู้เล่นในแผนที่ที่เลือกจะถูกนำไปใช้ถ่วงน้ำหนักในการคัดเลือกเอเจนต์
            </p>
            <button
              id="map-picker-btn"
              onClick={() => setShowMapOverlay(true)}
              style={{
                width: '100%', height: '120px', border: '2px solid rgba(255,70,85,0.3)',
                borderRadius: '12px', cursor: 'pointer', overflow: 'hidden',
                position: 'relative', background: 'rgba(0,0,0,0.3)',
                transition: 'border-color 0.2s'
              }}
            >
              {selectedMapAsset?.splash ? (
                <img src={selectedMapAsset.splash} alt={selectedMap} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <span style={{ color: 'rgba(255,255,255,0.4)', fontSize: '14px' }}>กำลังโหลด...</span>
                </div>
              )}
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.2) 60%, rgba(0,0,0,0.5) 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px'
              }}>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#fff' }}>{selectedMap}</div>
                  {selectedMapAsset?.tacticalDescription && (
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', marginTop: '4px' }}>{selectedMapAsset.tacticalDescription}</div>
                  )}
                </div>
                <div style={{ background: 'rgba(255,70,85,0.9)', borderRadius: '8px', padding: '8px 16px', fontSize: '13px', fontWeight: 700, color: '#fff' }}>
                  🗺️ เปลี่ยนแผนที่
                </div>
              </div>
            </button>
          </div>

          {/* Step 4: Ban / Required Agent Buttons */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
              4. แบน / บังคับดึง Agent
            </h3>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
              กดเพื่อเปิดหน้าเลือก Agent ด้วยรูปภาพ
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Ban Button + chips */}
              <div>
                <button
                  id="ban-overlay-btn"
                  onClick={() => setShowBanOverlay(true)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                    background: 'rgba(248,113,113,0.08)', border: '2px dashed rgba(248,113,113,0.4)',
                    color: '#f87171', fontSize: '14px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '10px',
                    transition: 'background 0.15s'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>🚫</span>
                  <span>แบนเอเจนต์ {bannedAgents.length > 0 ? `(${bannedAgents.length} ตัว)` : '— คลิกเพื่อเลือก'}</span>
                </button>
                {bannedAgents.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                    {bannedAgents.map(name => {
                      const asset = agentAssets.find(a => a.displayName === name);
                      return (
                        <span key={name} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '4px 10px 4px 6px', borderRadius: '20px',
                          background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.35)',
                          color: '#f87171', fontSize: '12px', fontWeight: 600
                        }}>
                          {asset && <img src={asset.displayIcon} alt={name} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />}
                          {name}
                          <button onClick={() => setBannedAgents(bannedAgents.filter(x => x !== name))}
                            style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 0, fontSize: '11px', fontWeight: 900 }}>✕</button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Required Button + chips */}
              <div>
                <button
                  id="req-overlay-btn"
                  onClick={() => setShowReqOverlay(true)}
                  style={{
                    width: '100%', padding: '12px 16px', borderRadius: '10px', cursor: 'pointer',
                    background: 'rgba(52,211,153,0.08)', border: '2px dashed rgba(52,211,153,0.4)',
                    color: '#34d399', fontSize: '14px', fontWeight: 700,
                    display: 'flex', alignItems: 'center', gap: '10px',
                    transition: 'background 0.15s'
                  }}
                >
                  <span style={{ fontSize: '20px' }}>⭐</span>
                  <span>บังคับต้องมี {requiredAgents.length > 0 ? `(${requiredAgents.length} ตัว)` : '— คลิกเพื่อเลือก'}</span>
                </button>
                {requiredAgents.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' }}>
                    {requiredAgents.map(name => {
                      const asset = agentAssets.find(a => a.displayName === name);
                      return (
                        <span key={name} style={{
                          display: 'inline-flex', alignItems: 'center', gap: '6px',
                          padding: '4px 10px 4px 6px', borderRadius: '20px',
                          background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.35)',
                          color: '#34d399', fontSize: '12px', fontWeight: 600
                        }}>
                          {asset && <img src={asset.displayIcon} alt={name} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />}
                          {name}
                          <button onClick={() => setRequiredAgents(requiredAgents.filter(x => x !== name))}
                            style={{ background: 'none', border: 'none', color: '#34d399', cursor: 'pointer', padding: 0, fontSize: '11px', fontWeight: 900 }}>✕</button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Step 5: Player Locks — Role buttons + Agent image overlay */}
          {selectedPlayerIds.length === 5 && (
            <div className="card" style={{ marginBottom: '24px' }}>
              <h3 className="section-title" style={{ fontSize: '18px', marginBottom: '12px' }}>
                5. ล็อคตำแหน่ง & เอเจนต์ผู้เล่น
              </h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '13px', marginBottom: '16px' }}>
                กดปุ่มบทบาทเพื่อล็อค แล้วกดรูปเอเจนต์เพื่อระบุตัวที่ต้องการ
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {initialPlayers.filter(p => selectedPlayerIds.includes(p.id)).map(player => {
                  const currentRole = playerLocks[player.id] || 'random';
                  const currentAgentLock = playerAgentLocks[player.id] || 'random';
                  const agentAsset = agentAssets.find(a =>
                    currentAgentLock !== 'random' &&
                    a.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === currentAgentLock.toLowerCase().replace(/[^a-z0-9]/g, '')
                  );

                  return (
                    <div key={player.id} style={{
                      padding: '12px 14px', backgroundColor: 'rgba(0,0,0,0.2)',
                      borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, marginBottom: '10px', color: '#fff' }}>{player.name}</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
                        {/* Role buttons */}
                        {['random', 'Duelists', 'Initiators', 'Controllers', 'Sentinels'].map(role => {
                          const isActive = currentRole === role;
                          const col = role === 'random' ? '#ffffff' : ROLE_COLORS[role];
                          return (
                            <button
                              key={role}
                              onClick={() => {
                                setPlayerLocks({ ...playerLocks, [player.id]: role });
                                setPlayerAgentLocks({ ...playerAgentLocks, [player.id]: 'random' });
                              }}
                              style={{
                                padding: '5px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '11px', fontWeight: 700,
                                background: isActive ? `${col}22` : 'rgba(255,255,255,0.04)',
                                border: `1.5px solid ${isActive ? col : 'rgba(255,255,255,0.08)'}`,
                                color: isActive ? col : 'rgba(255,255,255,0.4)',
                                transition: 'all 0.15s'
                              }}
                            >
                              {role === 'random' ? '🎲 สุ่ม' : role.replace('ists', '').replace('ors', '').replace('ers', '')}
                            </button>
                          );
                        })}

                        {/* Agent lock button — only when role is set */}
                        {currentRole !== 'random' && (
                          <button
                            onClick={() => setAgentLockOverlayPlayer(player)}
                            style={{
                              padding: '5px 10px', borderRadius: '6px', cursor: 'pointer',
                              background: currentAgentLock !== 'random' ? `${ROLE_COLORS[currentRole]}22` : 'rgba(255,255,255,0.04)',
                              border: `1.5px solid ${currentAgentLock !== 'random' ? ROLE_COLORS[currentRole] : 'rgba(255,255,255,0.15)'}`,
                              display: 'flex', alignItems: 'center', gap: '6px',
                              color: currentAgentLock !== 'random' ? ROLE_COLORS[currentRole] : 'rgba(255,255,255,0.5)',
                              fontSize: '11px', fontWeight: 700, transition: 'all 0.15s'
                            }}
                          >
                            {agentAsset ? (
                              <>
                                <img src={agentAsset.displayIcon} alt={currentAgentLock} style={{ width: '18px', height: '18px', objectFit: 'contain' }} />
                                {currentAgentLock}
                              </>
                            ) : (
                              <>🔒 ล็อคเอเจนต์</>
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Generator Mode + Generate Button */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--color-text-secondary)' }}>โหมดการจัดทีม:</span>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px' }}>
                {(['performance', 'random-balanced', 'pure-random'] as const).map(mode => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setGenerationMode(mode)}
                    className={`btn ${generationMode === mode ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '8px 4px', fontSize: '11px', fontWeight: 700, whiteSpace: 'nowrap' }}
                  >
                    {mode === 'performance' ? '📊 อิงผลงานจริง' : mode === 'random-balanced' ? '🎲 สุ่มบาลานซ์' : '💥 สุ่มหมด'}
                  </button>
                ))}
              </div>
            </div>
            <button
              id="generate-team-btn"
              type="button"
              className="btn btn-primary"
              onClick={generateTeam}
              style={{ width: '100%', padding: '14px', fontSize: '16px', fontWeight: 700, letterSpacing: '0.5px' }}
            >
              🎯 จัดทีมเดี๋ยวนี้!
            </button>
          </div>
        </div>

        {/* Right Column: Team Results */}
        <div>
          {generatedTeam ? (
            <div>
              {/* Score card */}
              <div className="card" style={{ marginBottom: '24px', textAlign: 'center', padding: '28px' }}>
                <div style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '6px' }}>คะแนนทีม</div>
                <div style={{ fontSize: '42px', fontWeight: 900, color: '#ff4655', lineHeight: 1 }}>{teamGrade.split(' ')[0]}</div>
                <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.7)', marginTop: '6px' }}>{teamGrade.substring(teamGrade.indexOf(' ') + 1)}</div>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.35)', marginTop: '8px' }}>Raw score: {teamScore}</div>
              </div>

              {/* Team cards */}
              {['Duelists', 'Initiators', 'Controllers', 'Sentinels'].map(role => {
                const members = generatedTeam.filter(m => m.role === role);
                if (members.length === 0) return null;
                const col = ROLE_COLORS[role];
                return (
                  <div key={role} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 700, color: col, textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '8px' }}>{role}</div>
                    {members.map((member, i) => (
                      <div key={i} className="card" style={{
                        marginBottom: '8px', padding: '14px 16px',
                        borderLeft: `3px solid ${col}`,
                        display: 'flex', alignItems: 'center', gap: '14px'
                      }}>
                        {member.icon ? (
                          <img src={member.icon} alt={member.agent} style={{ width: '48px', height: '48px', objectFit: 'contain', flexShrink: 0 }} />
                        ) : (
                          <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: `${col}22`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px', flexShrink: 0 }}>?</div>
                        )}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '15px', fontWeight: 700 }}>{member.agent}</div>
                          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginTop: '2px' }}>{member.player.name}</div>
                          {member.mapWinrateText && (
                            <div style={{ fontSize: '11px', color: col, marginTop: '4px', opacity: 0.8 }}>{member.mapWinrateText}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>Rank</div>
                          <div style={{ fontSize: '18px', fontWeight: 800, color: col }}>#{member.agentRank}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              <button
                type="button"
                className="btn btn-secondary"
                onClick={generateTeam}
                style={{ width: '100%', marginTop: '8px', padding: '12px', fontSize: '14px' }}
              >
                🔄 จัดใหม่อีกครั้ง
              </button>
            </div>
          ) : (
            <div className="card" style={{ textAlign: 'center', padding: '60px 30px', color: 'rgba(255,255,255,0.25)' }}>
              <div style={{ fontSize: '52px', marginBottom: '16px' }}>🎮</div>
              <div style={{ fontSize: '15px', fontWeight: 600, marginBottom: '8px' }}>ยังไม่มีผลการจัดทีม</div>
              <div style={{ fontSize: '13px', lineHeight: 1.6 }}>
                เลือกผู้เล่น 5 คน กำหนดเงื่อนไข<br />แล้วกด "จัดทีมเดี๋ยวนี้!"
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
