import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { accessToken, refreshToken } = body

    if (!accessToken || !refreshToken) {
      return NextResponse.json(
        { message: 'Missing tokens' },
        { status: 400 }
      )
    }

    // Set HTTP-only cookies for updated tokens
    const response = NextResponse.json({ success: true })

    response.cookies.set('adminAccessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 15, // 15 minutes
      path: '/', // Root path
    })

    response.cookies.set('adminRefreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/', // Root path
    })

    return response
  } catch (error) {
    console.error('Update tokens error:', error)
    return NextResponse.json(
      { message: 'Failed to update tokens' },
      { status: 500 }
    )
  }
}
