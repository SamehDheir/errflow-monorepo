import { getSession } from "next-auth/react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api"

let sessionCache: { token: string | null; promise: Promise<any> | null; time: number } = {
  token: null,
  promise: null,
  time: 0,
}
const SESSION_CACHE_TTL = 30000 // 30 seconds

async function getCachedSession() {
  const now = Date.now()
  if (sessionCache.promise && now - sessionCache.time < SESSION_CACHE_TTL) {
    const s = await sessionCache.promise
    return s
  }
  sessionCache.time = now
  sessionCache.promise = getSession()
  try {
    const s = await sessionCache.promise
    sessionCache.token = s?.accessToken || null
    return s
  } catch (e) {
    sessionCache.promise = null
    throw e
  }
}

class ApiClient {
  private async getAuthHeaders(): Promise<HeadersInit> {
    const session = await getCachedSession()
    const headers: HeadersInit = {
      "Content-Type": "application/json",
    }

    // Add CORS headers for cross-origin requests
    if (API_URL.includes("errflow.dev")) {
      headers["Origin"] = "http://localhost:3000"
      headers["Access-Control-Request-Method"] = "GET, POST, PATCH, DELETE"
      headers["Access-Control-Request-Headers"] = "Content-Type, Authorization"
    }

    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`
    }

    return headers
  }

  private async handleResponse<T>(response: Response, retryFn?: () => Promise<Response>): Promise<T> {
    if (response.status === 401 && retryFn) {
      // Token might be expired, trigger a session refresh and retry
      console.log("[API] 401 received, attempting token refresh...")
      
      // Clear session cache to force fresh token
      sessionCache = { token: null, promise: null, time: 0 }
      
      // Wait a moment for JWT callback to refresh
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Retry the request
      const retryResponse = await retryFn()
      
      if (retryResponse.status === 401) {
        console.error("[API] Still 401 after token refresh - redirecting to login")
        if (typeof window !== "undefined") {
          window.location.href = "/login"
        }
        throw new Error("Session expired - please login again")
      }
      
      return this.handleResponse<T>(retryResponse, undefined)
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Request failed" }))
      throw new Error(error.message || `Request failed with status ${response.status}`)
    }

    return response.json()
  }

  async get<T>(path: string, params?: Record<string, string | number>): Promise<T> {
    const url = new URL(`${API_URL}${path}`)
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.append(key, String(value))
      })
    }

    const headers = await this.getAuthHeaders()
   

    const response = await fetch(url.toString(), {
      headers,
      credentials: 'include',
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.log("Error response:", errorText)
    }

    return this.handleResponse<T>(response)
  }

  async post<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    })

    return this.handleResponse<T>(response)
  }

  async postPublic<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async postWithApiKey<T>(path: string, apiKey: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-ErrFlow-Key": apiKey,
      },
      body: body ? JSON.stringify(body) : undefined,
    })

    return this.handleResponse<T>(response)
  }

  async patch<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "PATCH",
      headers: await this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    })

    return this.handleResponse<T>(response)
  }

  async delete<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: await this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      credentials: 'include',
    })

    return this.handleResponse<T>(response)
  }
}

export const api = new ApiClient()
