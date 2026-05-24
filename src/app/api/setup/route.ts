import { NextResponse } from 'next/server';
import { initializeDatabase } from '@/lib/db';

export async function GET() {
  const result = await initializeDatabase();
  if (result.success) {
    return NextResponse.json({ message: result.message });
  } else {
    return NextResponse.json({ error: result.error }, { status: 500 });
  }
}
