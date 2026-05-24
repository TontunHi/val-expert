'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createMatchAction } from '../../actions';

interface PlayerOption {
  id: number;
  name: string;
}

interface PlayerStats {
  user_id: number;
  agent_name: string;
  kills: number;
  deaths: number;
  assists: number;
  combat_score: number;
  is_mvp: boolean;
}

const VALORANT_MAPS = [
  'Ascent',
  'Bind',
  'Haven',
  'Split',
  'Icebox',
  'Breeze',
  'Fracture',
  'Pearl',
  'Lotus',
  'Sunset',
  'Abyss'
];

const standardAgents = [
  'Astra', 'Breach', 'Brimstone', 'Chamber', 'Clove', 'Cypher', 'Deadlock',
  'Fade', 'Gekko', 'Harbor', 'Iso', 'Jett', 'KAY/O', 'Killjoy', 'Miks',
  'Neon', 'Omen', 'Phoenix', 'Raze', 'Reyna', 'Sage', 'Skye', 'Sova',
  'Tejo', 'Veto', 'Viper', 'Vyse', 'Waylay', 'Yoru'
].sort();

export default function RecordMatchPage() {
  const router = useRouter();
  const [allPlayers, setAllPlayers] = useState<PlayerOption[]>([]);
  const [mapName, setMapName] = useState('Ascent');
  const [winnerTeam, setWinnerTeam] = useState('Team A');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Initialize 5 players for Team A, 5 for Team B
  const [teamAPlayers, setTeamAPlayers] = useState<PlayerStats[]>(
    Array.from({ length: 5 }, () => ({
      user_id: 0,
      agent_name: 'Jett',
      kills: 15,
      deaths: 15,
      assists: 5,
      combat_score: 200,
      is_mvp: false
    }))
  );

  const [teamBPlayers, setTeamBPlayers] = useState<PlayerStats[]>(
    Array.from({ length: 5 }, () => ({
      user_id: 0,
      agent_name: 'Sage',
      kills: 15,
      deaths: 15,
      assists: 5,
      combat_score: 200,
      is_mvp: false
    }))
  );

  // Fetch all players on load
  useEffect(() => {
    fetch('/api/players')
      .then(res => res.json())
      .then(data => {
        setAllPlayers(data.players || []);
        // Pre-assign distinct players to avoid instant validation errors
        if (data.players && data.players.length >= 10) {
          setTeamAPlayers(prev => prev.map((p, idx) => ({ ...p, user_id: data.players[idx].id })));
          setTeamBPlayers(prev => prev.map((p, idx) => ({ ...p, user_id: data.players[idx + 5].id })));
        }
      })
      .catch(err => console.error('Failed to fetch players:', err));
  }, []);

  const handleStatChange = (
    team: 'Team A' | 'Team B',
    index: number,
    field: keyof PlayerStats,
    value: any
  ) => {
    const updated = team === 'Team A' ? [...teamAPlayers] : [...teamBPlayers];
    
    if (field === 'is_mvp' && value === true) {
      // Clear MVP from all other players
      setTeamAPlayers(prev => prev.map(p => ({ ...p, is_mvp: false })));
      setTeamBPlayers(prev => prev.map(p => ({ ...p, is_mvp: false })));
      updated[index] = { ...updated[index], is_mvp: true };
    } else {
      updated[index] = { ...updated[index], [field]: value };
    }

    if (team === 'Team A') {
      setTeamAPlayers(updated);
    } else {
      setTeamBPlayers(updated);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Validate distinct players
    const selectedIds = [
      ...teamAPlayers.map(p => p.user_id),
      ...teamBPlayers.map(p => p.user_id)
    ];

    if (selectedIds.some(id => id === 0)) {
      setErrorMessage('กรุณาเลือกผู้เล่นให้ครบทั้ง 10 ตำแหน่ง');
      return;
    }

    const uniqueIds = new Set(selectedIds);
    if (uniqueIds.size !== 10) {
      setErrorMessage('กรุณาอย่าเลือกผู้เล่นซ้ำกัน ผู้เล่นทุกคนในแมตช์ต้องเป็นคนละคนกัน');
      return;
    }

    // Validate exactly 1 MVP
    const teamAWithTeam = teamAPlayers.map(p => ({ ...p, team: 'Team A' }));
    const teamBWithTeam = teamBPlayers.map(p => ({ ...p, team: 'Team B' }));
    const allStats = [...teamAWithTeam, ...teamBWithTeam];

    const mvpCount = allStats.filter(p => p.is_mvp).length;
    if (mvpCount !== 1) {
      setErrorMessage('กรุณาทำเครื่องหมายผู้เล่น MVP เพียง 1 คนเท่านั้น');
      return;
    }

    startTransition(async () => {
      const response = await createMatchAction(mapName, winnerTeam, allStats);
      if (response.success) {
        router.push('/team-builder');
        router.refresh();
      } else {
        setErrorMessage(response.error || 'เกิดข้อผิดพลาดในการบันทึกข้อมูลการแข่ง');
      }
    });
  };

  return (
    <div style={{ maxWidth: '1100px', margin: '0 auto', paddingBottom: '60px' }}>
      <h1 className="hero-title" style={{ textAlign: 'left', fontSize: '32px', marginBottom: '8px' }}>
        บันทึกสถิติผลการแข่งจริง (Record Match)
      </h1>
      <p className="hero-subtitle" style={{ textAlign: 'left', margin: '0 0 32px 0' }}>
        บันทึกข้อมูลการแข่งรอบซ้อมหรือเล่นกันเองของกลุ่มเพื่อน เพื่อคำนวณอัตราชนะรวมเฉลี่ยรายด่าน
      </p>

      {errorMessage && (
        <div className="alert alert-danger" style={{ whiteSpace: 'pre-line' }}>
          <span>⚠️</span> {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Match Details */}
        <div className="card" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '32px' }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="map-select">แผนที่การแข่งขัน (Map)</label>
            <select
              id="map-select"
              className="form-input"
              value={mapName}
              onChange={(e) => setMapName(e.target.value)}
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(236,232,225,0.1)' }}
            >
              {VALORANT_MAPS.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label className="form-label" htmlFor="winner-select">ทีมที่ชนะ (Winner Team)</label>
            <select
              id="winner-select"
              className="form-input"
              value={winnerTeam}
              onChange={(e) => setWinnerTeam(e.target.value)}
              style={{ backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(236,232,225,0.1)' }}
            >
              <option value="Team A">Team A ชนะ</option>
              <option value="Team B">Team B ชนะ</option>
            </select>
          </div>
        </div>

        {/* Teams container */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
          
          {/* TEAM A */}
          <div className="card" style={{ borderLeft: '4px solid var(--color-duelist)', background: 'linear-gradient(135deg, rgba(255, 70, 85, 0.05) 0%, rgba(15, 25, 35, 0.95) 100%)' }}>
            <h3 className="section-title" style={{ color: 'var(--color-duelist)', fontSize: '18px', marginBottom: '20px' }}>
              TEAM A {winnerTeam === 'Team A' && <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#34d399', color: '#000', borderRadius: '3px', marginLeft: '10px', verticalAlign: 'middle', fontWeight: 'bold' }}>WINNER</span>}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {teamAPlayers.map((p, idx) => (
                <div key={`teama-${idx}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px' }}>
                  <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>ผู้เล่นคนที่ {idx+1}</label>
                    <select
                      className="form-input"
                      value={p.user_id}
                      onChange={(e) => handleStatChange('Team A', idx, 'user_id', parseInt(e.target.value, 10))}
                      style={{ padding: '6px 8px', fontSize: '13px', backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(236,232,225,0.05)' }}
                    >
                      <option value={0}>-- เลือกผู้เล่น --</option>
                      {allPlayers.map(player => (
                        <option key={player.id} value={player.id}>{player.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>Agent</label>
                    <select
                      className="form-input"
                      value={p.agent_name}
                      onChange={(e) => handleStatChange('Team A', idx, 'agent_name', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: '13px', backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(236,232,225,0.05)' }}
                    >
                      {standardAgents.map(agent => (
                        <option key={agent} value={agent}>{agent}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>Kills</label>
                    <input
                      type="number"
                      className="form-input"
                      value={p.kills}
                      onChange={(e) => handleStatChange('Team A', idx, 'kills', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'center' }}
                      min="0"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>Deaths</label>
                    <input
                      type="number"
                      className="form-input"
                      value={p.deaths}
                      onChange={(e) => handleStatChange('Team A', idx, 'deaths', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'center' }}
                      min="0"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>Assists</label>
                    <input
                      type="number"
                      className="form-input"
                      value={p.assists}
                      onChange={(e) => handleStatChange('Team A', idx, 'assists', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'center' }}
                      min="0"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>ACS (Combat)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={p.combat_score}
                      onChange={(e) => handleStatChange('Team A', idx, 'combat_score', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'center' }}
                      min="0"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '6px' }}>MVP</span>
                    <input
                      type="checkbox"
                      checked={p.is_mvp}
                      onChange={(e) => handleStatChange('Team A', idx, 'is_mvp', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* TEAM B */}
          <div className="card" style={{ borderLeft: '4px solid var(--color-initiator)', background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.05) 0%, rgba(15, 25, 35, 0.95) 100%)' }}>
            <h3 className="section-title" style={{ color: 'var(--color-initiator)', fontSize: '18px', marginBottom: '20px' }}>
              TEAM B {winnerTeam === 'Team B' && <span style={{ fontSize: '12px', padding: '2px 8px', backgroundColor: '#34d399', color: '#000', borderRadius: '3px', marginLeft: '10px', verticalAlign: 'middle', fontWeight: 'bold' }}>WINNER</span>}
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {teamBPlayers.map((p, idx) => (
                <div key={`teamb-${idx}`} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(100px, 1fr))', gap: '12px', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)', padding: '12px', borderRadius: '6px' }}>
                  <div className="form-group" style={{ margin: 0, minWidth: '150px' }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>ผู้เล่นคนที่ {idx+1}</label>
                    <select
                      className="form-input"
                      value={p.user_id}
                      onChange={(e) => handleStatChange('Team B', idx, 'user_id', parseInt(e.target.value, 10))}
                      style={{ padding: '6px 8px', fontSize: '13px', backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(236,232,225,0.05)' }}
                    >
                      <option value={0}>-- เลือกผู้เล่น --</option>
                      {allPlayers.map(player => (
                        <option key={player.id} value={player.id}>{player.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>Agent</label>
                    <select
                      className="form-input"
                      value={p.agent_name}
                      onChange={(e) => handleStatChange('Team B', idx, 'agent_name', e.target.value)}
                      style={{ padding: '6px 8px', fontSize: '13px', backgroundColor: 'rgba(0,0,0,0.4)', borderColor: 'rgba(236,232,225,0.05)' }}
                    >
                      {standardAgents.map(agent => (
                        <option key={agent} value={agent}>{agent}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>Kills</label>
                    <input
                      type="number"
                      className="form-input"
                      value={p.kills}
                      onChange={(e) => handleStatChange('Team B', idx, 'kills', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'center' }}
                      min="0"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>Deaths</label>
                    <input
                      type="number"
                      className="form-input"
                      value={p.deaths}
                      onChange={(e) => handleStatChange('Team B', idx, 'deaths', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'center' }}
                      min="0"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>Assists</label>
                    <input
                      type="number"
                      className="form-input"
                      value={p.assists}
                      onChange={(e) => handleStatChange('Team B', idx, 'assists', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'center' }}
                      min="0"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '4px' }}>ACS (Combat)</label>
                    <input
                      type="number"
                      className="form-input"
                      value={p.combat_score}
                      onChange={(e) => handleStatChange('Team B', idx, 'combat_score', Math.max(0, parseInt(e.target.value, 10) || 0))}
                      style={{ padding: '6px 8px', fontSize: '13px', textAlign: 'center' }}
                      min="0"
                    />
                  </div>

                  <div className="form-group" style={{ margin: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <span style={{ fontSize: '11px', color: 'gray', display: 'block', marginBottom: '6px' }}>MVP</span>
                    <input
                      type="checkbox"
                      checked={p.is_mvp}
                      onChange={(e) => handleStatChange('Team B', idx, 'is_mvp', e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: 'flex', gap: '16px', marginTop: '32px' }}>
          <button type="submit" className="btn btn-primary" disabled={isPending}>
            {isPending ? 'กำลังบันทึกข้อมูล...' : 'บันทึกแมตช์การแข่งขัน'}
          </button>
          <a href="/team-builder" className="btn btn-secondary">
            ยกเลิก
          </a>
        </div>
      </form>
    </div>
  );
}
