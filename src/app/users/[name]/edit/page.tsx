import React from 'react';
import { notFound } from 'next/navigation';
import { getUserByName, getUserRoleRanks, getUserAgentRanks } from '@/lib/db-queries';
import EditUserClient from '@/app/components/EditUserClient';

interface PageProps {
  params: Promise<{ name: string }>;
}

export const revalidate = 0; // Fresh data on each load

export default async function EditUserPage({ params }: PageProps) {
  const resolvedParams = await params;
  const decodedName = decodeURIComponent(resolvedParams.name);

  const user = await getUserByName(decodedName);
  if (!user) {
    notFound();
  }

  const userId = user.id;

  // Fetch current rankings
  const dbRoles = await getUserRoleRanks(userId);
  const dbAgents = await getUserAgentRanks(userId);

  return (
    <div style={{ paddingBottom: '60px' }}>
      <EditUserClient user={user} dbRoles={dbRoles} dbAgents={dbAgents} />
    </div>
  );
}
