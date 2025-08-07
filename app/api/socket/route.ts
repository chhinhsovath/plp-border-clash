import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Socket.IO server is running',
    status: 'ok',
    path: '/api/socket',
  })
}

export async function POST(request: NextRequest) {
  return NextResponse.json({
    error: 'WebSocket connections should be established directly',
    info: 'Use socket.io-client to connect to the WebSocket server',
  }, { status: 400 })
}