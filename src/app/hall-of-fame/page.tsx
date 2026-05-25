import React from 'react';
import { getHallOfFameAndShame, getRawPlayerStatsForSheet } from '@/lib/db-queries';
import { fetchPlayableMaps } from '@/lib/agents-service';

export const revalidate = 0; // Disable static caching so it updates dynamically

export default async function HallOfFamePage() {
  const [stats, maps, rawPlayerStats] = await Promise.all([
    getHallOfFameAndShame(),
    fetchPlayableMaps(),
    getRawPlayerStatsForSheet()
  ]);

  const getMapSplash = (mapName: string) => {
    const matched = maps.find(
      (m) => m.displayName.toLowerCase().replace(/[^a-z0-9]/g, '') === mapName.toLowerCase().replace(/[^a-z0-9]/g, '')
    );
    return matched?.listViewIcon || matched?.splash || null;
  };

  return (
    <div style={{ paddingBottom: '60px' }}>
      {/* Hero Section */}
      <section className="hero" style={{ padding: '40px 0', borderBottom: 'none' }}>
        <h1 className="hero-title" style={{ fontSize: '36px', letterSpacing: '2px' }}>
          ทำเนียบที่สุดของกลุ่ม <span style={{ color: 'var(--color-valorant)' }}>(Hall of Fame & Shame)</span>
        </h1>
        <p className="hero-subtitle" style={{ fontSize: '14px', marginTop: '8px' }}>
          วัดผลแพ้-ชนะและสถิติจริงจากประวัติการแข่งของพวกเรา (คำนวณเฉพาะผู้ที่ลงแข่งอย่างน้อย 3 แมตช์ขึ้นไป)
        </p>
      </section>

      {/* HALL OF FAME */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ color: '#ffca28', borderColor: '#ffca28', fontSize: '22px', marginBottom: '24px' }}>
          🏆 ทำเนียบเกียรติยศ (Hall of Fame)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '24px', marginBottom: '32px' }}>
          {/* MVP King */}
          <div 
            className="card" 
            style={{ 
              borderLeft: '4px solid #ffca28', 
              background: 'linear-gradient(135deg, rgba(255, 202, 40, 0.08) 0%, rgba(15, 25, 35, 0.95) 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '120px', fontWeight: 900, color: 'rgba(255, 252, 40, 0.02)', pointerEvents: 'none', userSelect: 'none' }}>
              MVP
            </div>
            <span style={{ fontSize: '11px', color: '#ffca28', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              ราชา MVP (MVP KING)
            </span>
            {stats.mvpKing ? (
              <div style={{ marginTop: '16px' }}>
                <a href={`/users/${encodeURIComponent(stats.mvpKing.user_name)}`} style={{ textDecoration: 'none' }}>
                  <h3 style={{ fontSize: '28px', color: '#fff', fontWeight: 800 }}>{stats.mvpKing.user_name}</h3>
                </a>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px', fontSize: '14px' }}>
                  คว้าตำแหน่งผู้เล่นยอดเยี่ยมประจำแมตช์ (MVP) ไปทั้งหมด{' '}
                  <span style={{ color: '#ffca28', fontWeight: 700, fontSize: '18px' }}>{stats.mvpKing.mvp_count}</span> ครั้ง
                </p>
              </div>
            ) : (
              <p style={{ marginTop: '16px', color: 'gray', fontStyle: 'italic' }}>ยังไม่มีข้อมูลการคว้า MVP</p>
            )}
          </div>

          {/* Aim God */}
          <div 
            className="card" 
            style={{ 
              borderLeft: '4px solid #00f0ff', 
              background: 'linear-gradient(135deg, rgba(0, 240, 255, 0.08) 0%, rgba(15, 25, 35, 0.95) 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <div style={{ position: 'absolute', right: '-10px', bottom: '-20px', fontSize: '120px', fontWeight: 900, color: 'rgba(0, 240, 255, 0.02)', pointerEvents: 'none', userSelect: 'none' }}>
              K/D
            </div>
            <span style={{ fontSize: '11px', color: '#00f0ff', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              เทพเจ้าเอมคม (AIM GOD)
            </span>
            {stats.aimGod ? (
              <div style={{ marginTop: '16px' }}>
                <a href={`/users/${encodeURIComponent(stats.aimGod.user_name)}`} style={{ textDecoration: 'none' }}>
                  <h3 style={{ fontSize: '28px', color: '#fff', fontWeight: 800 }}>{stats.aimGod.user_name}</h3>
                </a>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px', fontSize: '14px' }}>
                  ทำอัตราส่วน Kill / Death เฉลี่ยสูงสุดในกลุ่มที่{' '}
                  <span style={{ color: '#00f0ff', fontWeight: 700, fontSize: '18px' }}>
                    {parseFloat(stats.aimGod.kd_ratio.toFixed(2))}
                  </span>{' '}
                  ({stats.aimGod.games_played} แมตช์)
                </p>
              </div>
            ) : (
              <p style={{ marginTop: '16px', color: 'gray', fontStyle: 'italic' }}>ยังไม่มีสถิติ K/D (ต้องการอย่างน้อย 3 เกม)</p>
            )}
          </div>
        </div>

        {/* Map Tacticians */}
        <h3 style={{ fontSize: '16px', color: '#ece8e1', textTransform: 'uppercase', letterSpacing: '1.5px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', backgroundColor: '#ffca28', display: 'inline-block', clipPath: 'polygon(50% 0%, 100% 50%, 50% 100%, 0% 50%)' }}></span>
          ราชาครองแผนที่ (Map Tacticians)
        </h3>
        
        {stats.mapTacticians.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '24px', color: 'gray' }}>
            ยังไม่มีผู้เล่นที่มีสถิติชนะบนแผนที่ใดๆ ครบ 3 แมตช์ขึ้นไป
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
            {stats.mapTacticians.map((mapStat) => {
              const mapImage = getMapSplash(mapStat.map_name);
              return (
                <div 
                  key={mapStat.map_name}
                  className="card match-card"
                  style={{
                    padding: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    background: 'rgba(20,20,25,0.75)',
                    borderLeft: '4px solid #ffca28'
                  }}
                >
                  {mapImage && (
                    <div 
                      className="match-card-map-bg"
                      style={{
                        position: 'absolute',
                        top: 0, left: 0, width: '100%', height: '100%',
                        backgroundImage: `url(${mapImage})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center',
                        opacity: 0.1,
                        transition: 'transform 0.4s ease',
                        pointerEvents: 'none',
                        zIndex: 0
                      }}
                    />
                  )}
                  <div style={{ position: 'relative', zIndex: 1 }}>
                    <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontWeight: 700 }}>
                      Map Champion
                    </span>
                    <h4 style={{ fontSize: '20px', color: '#fff', fontWeight: 800, margin: '2px 0 8px 0' }}>
                      {mapStat.map_name}
                    </h4>
                    <a href={`/users/${encodeURIComponent(mapStat.user_name)}`} style={{ textDecoration: 'none', color: '#ffca28', fontWeight: 700, fontSize: '15px' }}>
                      {mapStat.user_name}
                    </a>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', fontSize: '12px', color: 'var(--color-text-secondary)' }}>
                      <span>Win Rate:</span>
                      <span style={{ fontWeight: 800, color: '#34d399' }}>
                        {Math.round(mapStat.win_rate * 100)}% ({mapStat.wins}/{mapStat.total})
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* HALL OF SHAME */}
      <section style={{ marginBottom: '50px' }}>
        <h2 className="section-title" style={{ color: '#ef4444', borderColor: '#ef4444', fontSize: '22px', marginBottom: '24px' }}>
          🤡 ทำเนียบแกงเพื่อน (Hall of Shame)
        </h2>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {/* Feeder */}
          <div 
            className="card" 
            style={{ 
              borderLeft: '4px solid #ef4444', 
              background: 'linear-gradient(135deg, rgba(239, 68, 68, 0.06) 0%, rgba(15, 25, 35, 0.95) 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              กระสอบทรายของทีม (THE FEEDER)
            </span>
            {stats.feeder ? (
              <div style={{ marginTop: '16px' }}>
                <a href={`/users/${encodeURIComponent(stats.feeder.user_name)}`} style={{ textDecoration: 'none' }}>
                  <h3 style={{ fontSize: '24px', color: '#fff', fontWeight: 800 }}>{stats.feeder.user_name}</h3>
                </a>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px', fontSize: '13px', lineHeight: '1.5' }}>
                  เอาตัวไปรับกระสุนแทนเพื่อนบ่อยที่สุด ด้วยสถิติตายเฉลี่ย{' '}
                  <span style={{ color: '#ef4444', fontWeight: 700, fontSize: '16px' }}>
                    {parseFloat(stats.feeder.avg_deaths.toFixed(1))}
                  </span>{' '}
                  ครั้งต่อแมตช์ ({stats.feeder.games_played} แมตช์)
                </p>
              </div>
            ) : (
              <p style={{ marginTop: '16px', color: 'gray', fontStyle: 'italic' }}>ยังไม่มีข้อมูล (ต้องการอย่างน้อย 3 เกม)</p>
            )}
          </div>

          {/* The Jinx */}
          <div 
            className="card" 
            style={{ 
              borderLeft: '4px solid #a855f7', 
              background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.06) 0%, rgba(15, 25, 35, 0.95) 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <span style={{ fontSize: '11px', color: '#c084fc', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              ตัวนำโชคร้าย (THE JINX)
            </span>
            {stats.jinx ? (
              <div style={{ marginTop: '16px' }}>
                <a href={`/users/${encodeURIComponent(stats.jinx.user_name)}`} style={{ textDecoration: 'none' }}>
                  <h3 style={{ fontSize: '24px', color: '#fff', fontWeight: 800 }}>{stats.jinx.user_name}</h3>
                </a>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px', fontSize: '13px', lineHeight: '1.5' }}>
                  ผู้กุมชะตาการพ่ายแพ้ เวลาลงแข่งทำให้อัตราการชนะของทีมเหลือเพียง{' '}
                  <span style={{ color: '#c084fc', fontWeight: 700, fontSize: '16px' }}>
                    {Math.round(stats.jinx.win_rate * 100)}%
                  </span>{' '}
                  (ชนะ {stats.jinx.wins} จาก {stats.jinx.total} แมตช์)
                </p>
              </div>
            ) : (
              <p style={{ marginTop: '16px', color: 'gray', fontStyle: 'italic' }}>ยังไม่มีข้อมูล (ต้องการอย่างน้อย 3 เกม)</p>
            )}
          </div>

          {/* Lone Wolf */}
          <div 
            className="card" 
            style={{ 
              borderLeft: '4px solid #71717a', 
              background: 'linear-gradient(135deg, rgba(113, 113, 122, 0.06) 0%, rgba(15, 25, 35, 0.95) 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <span style={{ fontSize: '11px', color: '#a1a1aa', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              หมาป่าเดียวดาย (LONE WOLF)
            </span>
            {stats.loneWolf ? (
              <div style={{ marginTop: '16px' }}>
                <a href={`/users/${encodeURIComponent(stats.loneWolf.user_name)}`} style={{ textDecoration: 'none' }}>
                  <h3 style={{ fontSize: '24px', color: '#fff', fontWeight: 800 }}>{stats.loneWolf.user_name}</h3>
                </a>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px', fontSize: '13px', lineHeight: '1.5' }}>
                  ไม่เน้นแอสซิสต์ ช่วยเหลือทีมต่ำที่สุดด้วยค่าเฉลี่ยช่วยเหลือ{' '}
                  <span style={{ color: '#a1a1aa', fontWeight: 700, fontSize: '16px' }}>
                    {parseFloat(stats.loneWolf.avg_assists.toFixed(1))}
                  </span>{' '}
                  ครั้งต่อแมตช์ ({stats.loneWolf.games_played} แมตช์)
                </p>
              </div>
            ) : (
              <p style={{ marginTop: '16px', color: 'gray', fontStyle: 'italic' }}>ยังไม่มีข้อมูล (ต้องการอย่างน้อย 3 เกม)</p>
            )}
          </div>

          {/* Least Valuable Player (LVP) */}
          <div 
            className="card" 
            style={{ 
              borderLeft: '4px solid #52525b', 
              background: 'linear-gradient(135deg, rgba(82, 82, 91, 0.06) 0%, rgba(15, 25, 35, 0.95) 100%)',
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase' }}>
              ผู้เล่นทรงคุณค่าน้อยที่สุด (LVP)
            </span>
            {stats.lvp ? (
              <div style={{ marginTop: '16px' }}>
                <a href={`/users/${encodeURIComponent(stats.lvp.user_name)}`} style={{ textDecoration: 'none' }}>
                  <h3 style={{ fontSize: '24px', color: '#fff', fontWeight: 800 }}>{stats.lvp.user_name}</h3>
                </a>
                <p style={{ color: 'var(--color-text-secondary)', marginTop: '8px', fontSize: '13px', lineHeight: '1.5' }}>
                  ทำคะแนนการต่อสู้เฉลี่ย (Combat Score) ต่ำที่สุด ด้วยสถิติเฉลี่ย{' '}
                  <span style={{ color: '#9ca3af', fontWeight: 700, fontSize: '16px' }}>
                    {Math.round(stats.lvp.avg_combat_score)}
                  </span>{' '}
                  ACS ({stats.lvp.games_played} แมตช์)
                </p>
              </div>
            ) : (
              <p style={{ marginTop: '16px', color: 'gray', fontStyle: 'italic' }}>ยังไม่มีข้อมูล (ต้องการอย่างน้อย 3 เกม)</p>
            )}
          </div>
        </div>
      </section>

      {/* DATA-SHEET CONTAINER */}
      <section style={{ marginTop: '40px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '40px' }}>
        <details style={{ width: '100%' }}>
          <summary 
            className="btn btn-secondary"
            style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '8px', 
              fontSize: '14px', 
              padding: '12px 24px', 
              backgroundColor: 'rgba(255,255,255,0.03)',
              borderColor: 'rgba(255,70,85,0.4)',
              color: '#fff',
              fontWeight: 700,
              cursor: 'pointer',
              userSelect: 'none'
            }}
          >
            📊 แสดงแผ่นข้อมูลสถิติดิบทั้งหมด (DATA-SHEET)
          </summary>
          <div className="card" style={{ marginTop: '20px', overflowX: 'auto', background: 'rgba(15, 20, 25, 0.95)', padding: '24px', border: '1px solid rgba(255,70,85,0.15)' }}>
            <h3 style={{ fontSize: '18px', color: '#fff', marginBottom: '16px', textTransform: 'uppercase', letterSpacing: '1px' }}>
              แผ่นข้อมูลสถิติดิบของผู้เล่นทุกคน (Raw Stats Sheet)
            </h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '13px' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)', color: 'var(--color-text-secondary)' }}>
                  <th style={{ padding: '12px 8px' }}>ผู้เล่น (Player)</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>แข่งทั้งหมด</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>ชนะ / แพ้</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>Win Rate</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>จำนวน MVP</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>เฉลี่ย ACS</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>K / D / A รวม</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>K/D Ratio</th>
                  <th style={{ padding: '12px 8px', textAlign: 'center' }}>เฉลี่ยต่อแมตช์ (K / D / A)</th>
                </tr>
              </thead>
              <tbody>
                {rawPlayerStats.map((p) => (
                  <tr key={p.user_id} className="datasheet-tr-row" style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', backgroundColor: 'transparent' }}>
                    <td style={{ padding: '12px 8px', fontWeight: 700 }}>
                      <a href={`/users/${encodeURIComponent(p.user_name)}`} style={{ color: 'var(--color-text-primary)', textDecoration: 'none' }}>
                        {p.user_name}
                      </a>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>{p.total_games}</td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: 'gray' }}>
                      <span style={{ color: '#34d399', fontWeight: 600 }}>{p.wins}</span> / <span style={{ color: '#f87171' }}>{p.losses}</span>
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700, color: p.win_rate >= 0.5 ? '#34d399' : '#f87171' }}>
                      {p.total_games > 0 ? `${Math.round(p.win_rate * 100)}%` : '0%'}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      {p.mvp_count > 0 ? (
                        <span className="badge-rank" style={{ backgroundColor: '#ffca28', color: '#000', fontWeight: 'bold' }}>{p.mvp_count} MVP</span>
                      ) : '0'}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700, color: '#fca5a5' }}>
                      {p.avg_combat_score.toFixed(0)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: '#ece8e1' }}>
                      {p.total_kills} / {p.total_deaths} / {p.total_assists}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', fontWeight: 700, color: p.kd_ratio >= 1.0 ? '#34d399' : '#f87171' }}>
                      {p.kd_ratio.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center', color: 'var(--color-text-secondary)' }}>
                      {p.avg_kills.toFixed(1)} / {p.avg_deaths.toFixed(1)} / {p.avg_assists.toFixed(1)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      </section>
    </div>
  );
}
