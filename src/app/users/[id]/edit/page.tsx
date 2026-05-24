import React from 'react';
import { notFound } from 'next/navigation';
import { getUserById, getUserRoleRanks, getUserAgentRanks } from '@/lib/db-queries';
import EditUserClient from '@/app/components/EditUserClient';

interface PageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // Fresh data on each load

export default async function EditUserPage({ params }: PageProps) {
  const resolvedParams = await params;
  const userId = parseInt(resolvedParams.id, 10);

  if (isNaN(userId)) {
    notFound();
  }

  const user = await getUserById(userId);
  if (!user) {
    notFound();
  }

  // Fetch current rankings
  const dbRoles = await getUserRoleRanks(userId);
  const dbAgents = await getUserAgentRanks(userId);

  return (
    <div style={{ paddingBottom: '60px' }}>
      <EditUserClient user={user} dbRoles={dbRoles} dbAgents={dbAgents} />
    </div>
  );
}
