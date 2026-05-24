import React from 'react';
import { getAllPlayersWithRankings, getAllPlayersMapStats } from '@/lib/db-queries';
import TeamBuilderClient from '../components/TeamBuilderClient';

export const revalidate = 0; // Fresh data on each load

export default async function TeamBuilderPage() {
  const [players, mapStats] = await Promise.all([
    getAllPlayersWithRankings(),
    getAllPlayersMapStats()
  ]);

  return (
    <div style={{ paddingBottom: '60px' }}>
      <TeamBuilderClient initialPlayers={players} mapStats={mapStats} />
    </div>
  );
}
