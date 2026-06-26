import { NextResponse } from "next/server"
import { z } from "zod"

const registerSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  organizationName: z.string().min(2),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const validatedData = registerSchema.parse(body)

    // Mock successful registration
    // In production, this would call your backend API
    return NextResponse.json(
      {
        message: "Registration successful",
        user: {
          id: "mock-user-id",
          name: validatedData.name,
          email: validatedData.email,
          role: "admin",
        },
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { message: "Validation error", errors: error.errors },
        { status: 400 }
      )
    }

    return NextResponse.json(
      { message: "Registration failed" },
      { status: 500 }
    )
  }
}
