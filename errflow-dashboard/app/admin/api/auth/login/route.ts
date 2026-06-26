import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    const apiUrl = process.env.NODE_ENV === 'development'
      ? "http://localhost:3001"
      : (process.env.NEXT_PUBLIC_API_URL?.replace('/api', '') || "https://www.errflow.dev")
    const response = await fetch(`${apiUrl}/admin/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Authentication failed' }))
      return NextResponse.json(
        { message: errorData.message || 'Invalid credentials' },
        { status: response.status }
      )
    }

    const data = await response.json()

    // Set HTTP-only cookies for better security
    const responseCookies = NextResponse.json(data)

    responseCookies.cookies.set('adminAccessToken', data.accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed to lax for better compatibility
      maxAge: 60 * 15, // 15 minutes
      path: '/', // Root path so it's accessible everywhere
    })

    responseCookies.cookies.set('adminRefreshToken', data.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax', // Changed to lax for better compatibility
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/', // Root path so it's accessible everywhere
    })

    return responseCookies
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json(
      { message: 'An error occurred during authentication' },
      { status: 500 }
    )
  }
}
