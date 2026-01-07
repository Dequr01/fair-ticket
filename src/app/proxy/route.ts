import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const target = url.searchParams.get('url')

  if (!target) {
    return new NextResponse('Missing target URL', { status: 400 })
  }

  const res = await fetch(target, {
    headers: {
      'ngrok-skip-browser-warning': 'true'
    }
  })

  return new NextResponse(res.body, {
    status: res.status,
    headers: res.headers
  })
}
