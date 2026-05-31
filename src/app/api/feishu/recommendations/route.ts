import { NextResponse } from 'next/server';

export function GET() {
  return NextResponse.json({ ok: false, message: 'Feishu integration not implemented yet' });
}
