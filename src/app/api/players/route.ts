import { NextResponse } from 'next/server';
import { getAllUsers } from '@/lib/db-queries';

export const revalidate = 0; // Fresh data always

export async function GET() {
  try {
    const users = await getAllUsers();
    return NextResponse.json({ players: users });
  } catch (error: any) {
    console.error('Error in players API:', error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
