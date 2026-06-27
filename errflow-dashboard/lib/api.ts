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
    return sessionCache.promise
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

    if (session?.accessToken) {
      headers["Authorization"] = `Bearer ${session.accessToken}`
    }

    return headers
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // On 401 drop the cached session so the next request fetches a fresh
      // token (NextAuth refreshes it proactively in its jwt callback).
      if (response.status === 401) {
        sessionCache = { token: null, promise: null, time: 0 }
      }

      const error = await response
        .json()
        .catch(() => ({ message: `Request failed with status ${response.status}` }))
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

    const response = await fetch(url.toString(), {
      headers: await this.getAuthHeaders(),
      credentials: "include",
    })

    return this.handleResponse<T>(response)
  }

  async post<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "POST",
      headers: await this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
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
      credentials: "include",
    })

    return this.handleResponse<T>(response)
  }

  async delete<T>(path: string, body?: any): Promise<T> {
    const response = await fetch(`${API_URL}${path}`, {
      method: "DELETE",
      headers: await this.getAuthHeaders(),
      body: body ? JSON.stringify(body) : undefined,
      credentials: "include",
    })

    return this.handleResponse<T>(response)
  }
}

export const api = new ApiClient()
