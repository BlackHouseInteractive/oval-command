import { NextRequest, NextResponse } from 'next/server'
import { createAccountWithPassword } from '@/lib/create-account'
import { getClientIp } from '@/lib/rate-limit'

interface SignupBody {
  email:    string
  password: string
  name?:    string
}

export async function POST(req: NextRequest) {
  let body: SignupBody
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  if (typeof body.email !== 'string' || typeof body.password !== 'string') {
    return NextResponse.json({ error: 'email and password are required' }, { status: 400 })
  }

  const result = await createAccountWithPassword({
    ip:       getClientIp(req.headers),
    email:    body.email,
    password: body.password,
    name:     body.name,
  })

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.error.includes('already exists') ? 409 : 400 })
  }

  return NextResponse.json({ success: true })
}
