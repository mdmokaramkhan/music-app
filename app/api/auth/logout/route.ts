import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true });
  
  // Clear auth cookies
  response.cookies.delete('spotify_access_token');
  response.cookies.delete('spotify_refresh_token');
  
  return response;
} 