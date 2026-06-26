import { NextResponse } from "next/server"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = loginSchema.parse(body)

    // Mock successful login
    // In production, this would call your backend API
    return NextResponse.json(
      {
        user: {
          id: "mock-user-id",
          name: "Mock User",
          email: validatedData.email,
          role: "admin" as const,
        },
        accessToken: "mock-access-token",
        refreshToken: "mock-refresh-token",
        organization: {
          id: "mock-org-id",
          name: "Mock Organization",
        },
      },
      { status: 200 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Invalid email or password" },
      { status: 401 }
    )
  }
}
