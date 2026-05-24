'use client';

import React, { useState, useTransition } from 'react';
import { updateUsernameAction } from '../actions';

interface User {
  id: number;
  name: string;
  created_at: string;
}

interface ProfileHeaderProps {
  user: User;
  deleteAction: () => Promise<void>;
  avatarUrl: string | null;
  avatarFallbackText: string;
  avatarThemeColor: string;
  topAgentName: string | null;
  topRoleName: string | null;
}

export default function ProfileHeader({ 
  user, 
  deleteAction,
  avatarUrl,
  avatarFallbackText,
  avatarThemeColor,
  topAgentName,
  topRoleName
}: ProfileHeaderProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [name, setName] = useState(user.name);
  const [tempName, setTempName] = useState(user.name);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleEditStart = () => {
    setTempName(name);
    setError(null);
    setIsEditing(true);
  };

  const handleEditCancel = () => {
    setIsEditing(false);
    setError(null);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const trimmed = tempName.trim();
    if (!trimmed) {
      setError('ชื่อผู้เล่นต้องไม่ว่างเปล่า');
      return;
    }

    if (trimmed === name) {
      setIsEditing(false);
      return;
    }

    startTransition(async () => {
      const result = await updateUsernameAction(user.id, trimmed);
      if (result.success) {
        setName(trimmed);
        setIsEditing(false);
      } else {
        setError(result.error || 'เกิดข้อผิดพลาดในการเปลี่ยนชื่อ');
      }
    });
  };

  return (
    <div className="profile-header" style={{ flexDirection: 'column', alignItems: 'stretch', gap: '20px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        <div className="profile-title-area" style={{ flex: '1', minWidth: '280px' }}>
          <div 
            className="profile-avatar"
            style={{ 
              position: 'relative',
              backgroundColor: avatarUrl ? 'rgba(0,0,0,0.3)' : avatarThemeColor,
              border: `2px solid ${avatarThemeColor}`,
              boxShadow: `0 0 15px ${avatarThemeColor}60`,
              overflow: 'visible',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '8px'
            }}
          >
            {avatarUrl ? (
              <img 
                src={avatarUrl} 
                alt={topAgentName || 'Agent Portrait'} 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  borderRadius: '6px', 
                  objectFit: 'cover' 
                }} 
              />
            ) : (
              <span style={{ fontSize: '24px', fontWeight: 700 }}>
                {avatarFallbackText}
              </span>
            )}
            {topAgentName && (
              <span 
                style={{ 
                  position: 'absolute', 
                  bottom: '-8px', 
                  left: '50%', 
                  transform: 'translateX(-50%)', 
                  backgroundColor: avatarThemeColor, 
                  color: '#fff', 
                  fontSize: '9px', 
                  padding: '1px 6px', 
                  borderRadius: '3px', 
                  fontWeight: 700, 
                  whiteSpace: 'nowrap',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.5)',
                  textTransform: 'uppercase',
                  border: '1px solid rgba(255,255,255,0.1)'
                }}
              >
                {topAgentName}
              </span>
            )}
          </div>
          <div style={{ flex: '1' }}>
            {isEditing ? (
              <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    disabled={isPending}
                    style={{ 
                      fontSize: '22px', 
                      fontWeight: 'bold', 
                      padding: '4px 12px',
                      maxWidth: '300px',
                      backgroundColor: 'rgba(0,0,0,0.5)',
                      textTransform: 'uppercase'
                    }}
                    autoFocus
                    required
                  />
                  <button 
                    type="submit" 
                    className="btn btn-primary" 
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    disabled={isPending}
                  >
                    {isPending ? '...' : 'บันทึก'}
                  </button>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={handleEditCancel}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                    disabled={isPending}
                  >
                    ยกเลิก
                  </button>
                </div>
                {error && (
                  <span style={{ color: '#f87171', fontSize: '12px', fontWeight: 'bold' }}>
                    ⚠️ {error}
                  </span>
                )}
              </form>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <h1 className="profile-name" style={{ margin: 0 }}>{name}</h1>
                <button
                  onClick={handleEditStart}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--color-text-secondary)',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '6px',
                    borderRadius: '4px',
                    transition: 'all 0.2s',
                    backgroundColor: 'rgba(255, 255, 255, 0.03)'
                  }}
                  title="แก้ไขชื่อผู้เล่น"
                  onMouseEnter={(e) => e.currentTarget.style.color = 'var(--color-valorant)'}
                  onMouseLeave={(e) => e.currentTarget.style.color = 'var(--color-text-secondary)'}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.5-.5g-.173-.173z"/>
                  </svg>
                </button>
              </div>
            )}
            <p className="profile-date">
              เข้าร่วมเมื่อ: {new Date(user.created_at).toLocaleDateString('th-TH', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>
        
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <a href="/" className="btn btn-secondary">
            ย้อนกลับ
          </a>
          <a href={`/users/${user.id}/edit`} className="btn btn-primary">
            แก้ไขข้อมูลความชำนาญ
          </a>
          <form action={deleteAction} onSubmit={(e) => {
            if (!confirm('คุณแน่ใจหรือไม่ว่าต้องการลบผู้เล่นคนนี้?')) {
              e.preventDefault();
            }
          }}>
            <button type="submit" className="btn btn-danger">
              ลบผู้เล่น
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
