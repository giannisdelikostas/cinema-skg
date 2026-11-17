import { NextResponse } from 'next/server';
import { getSchedule } from '@/lib/schedule';

// Η σελίδα πλέον παίρνει τα δεδομένα απευθείας στον server.
// Το endpoint μένει για όποιον θέλει το πρόγραμμα σε JSON, με την ίδια cache (1 ώρα).
export const revalidate = 3600;

export async function GET() {
  try {
    return NextResponse.json(await getSchedule());
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 503 });
  }
}
